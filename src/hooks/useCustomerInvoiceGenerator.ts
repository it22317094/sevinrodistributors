import { useState } from 'react';
import { ref, get } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompanyData {
  name: string;
  addressLine: string;
  phone: string;
  logoUrl?: string;
}

interface CustomerData {
  toName: string;
  toCity: string;
}

interface OrderItem {
  code?: string;
  item?: string;
  description?: string;
  qty: number;
  price: number;
  currency?: string;
}

interface Order {
  orderNo: string;
  date: string;
  status: string;
  items: OrderItem[];
  customerId: string;
}

interface AggregatedItem {
  code: string;
  item: string;
  description: string;
  qty: number;
  price: number;
  total: number;
}

interface InvoiceGenerationParams {
  customerId: string;
  customerName: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  invoiceNumber: string;
  invoiceDate: string;
}

export const useCustomerInvoiceGenerator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateCustomerInvoicePDF = async (params: InvoiceGenerationParams) => {
    setLoading(true);
    
    try {
      // Fetch all required data from Firebase Realtime Database
      const [companySnap, customerSnap, ordersSnap, exchangeRateSnap] = await Promise.all([
        get(ref(realtimeDb, 'company')),
        get(ref(realtimeDb, `customers/${params.customerId}`)),
        get(ref(realtimeDb, 'salesOrders')),
        get(ref(realtimeDb, 'settings/exchangeRates/usdToLkr'))
      ]);

      const companyData: CompanyData = companySnap.exists() ? companySnap.val() : {
        name: "Sevinro Distributors",
        addressLine: "138/A, Alkaravita, Gampaha",
        phone: "071 39 65 580, 0777 92 90 36"
      };

      const customerData: CustomerData = customerSnap.exists() ? customerSnap.val() : {
        toName: params.customerName,
        toCity: "Unknown City"
      };

      if (!ordersSnap.exists()) {
        toast({
          title: "No orders found",
          description: "No orders found for the specified criteria.",
          variant: "destructive",
        });
        return;
      }

      const allOrders: Order[] = Object.entries(ordersSnap.val()).map(([key, value]: [string, any]) => ({
        orderNo: key,
        ...value
      }));

      // Filter orders based on criteria
      let filteredOrders = allOrders.filter(order => order.customerId === params.customerId);

      if (params.status && params.status !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === params.status);
      }

      if (params.startDate && params.endDate) {
        const startDate = new Date(params.startDate);
        const endDate = new Date(params.endDate);
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= startDate && orderDate <= endDate;
        });
      }

      if (filteredOrders.length === 0) {
        toast({
          title: "No matching orders",
          description: "No orders found matching the specified criteria.",
          variant: "destructive",
        });
        return;
      }

      // Get exchange rate for USD conversion
      const usdToLkr = exchangeRateSnap.exists() ? exchangeRateSnap.val() : 300;

      // Aggregate items by SKU/code
      const itemMap = new Map<string, AggregatedItem>();
      const orderNumbers: string[] = [];

      filteredOrders.forEach(order => {
        orderNumbers.push(order.orderNo);
        
        if (order.items) {
          order.items.forEach(item => {
            if (item.qty > 0 && item.price >= 0) {
              const key = item.code || item.item || 'Unknown';
              
              // Convert currency to LKR
              let priceLkr = item.price;
              if (item.currency === 'USD' || item.currency === '$') {
                priceLkr = item.price * usdToLkr;
              }

              if (itemMap.has(key)) {
                const existing = itemMap.get(key)!;
                existing.qty += item.qty;
                existing.total = existing.qty * existing.price;
              } else {
                itemMap.set(key, {
                  code: item.code || key,
                  item: item.item || key,
                  description: item.description || '',
                  qty: item.qty,
                  price: priceLkr,
                  total: item.qty * priceLkr
                });
              }
            }
          });
        }
      });

      const aggregatedItems = Array.from(itemMap.values());
      
      if (aggregatedItems.length === 0) {
        toast({
          title: "No items found",
          description: "No valid items found in the selected orders.",
          variant: "destructive",
        });
        return;
      }

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      try {
        // Add logo if available
        if (companyData.logoUrl) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = companyData.logoUrl!;
            });
            doc.addImage(img, 'PNG', 20, 15, 40, 20);
          } catch (error) {
            console.warn('Failed to load logo:', error);
          }
        }

        // Header - SEVINRO logo text (top left)
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 165, 0); // Orange color for SEVINRO
        doc.text('SEVINRO', 20, 25);

        // Company details (top right)
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        const rightX = pageWidth - 20;
        doc.text(companyData.addressLine, rightX, 20, { align: 'right' });
        doc.text(`Tel : ${companyData.phone}`, rightX, 25, { align: 'right' });

        // INVOICE title (centered)
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });

        // Customer info - Left side (TO:)
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('TO :-', 20, 70);
        
        doc.setFont(undefined, 'normal');
        doc.text(customerData.toName, 20, 80);
        doc.text(customerData.toCity, 20, 85);

        // Invoice details - Right side
        const invoiceDetailsX = pageWidth - 70;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`Invoice No : - ${params.invoiceNumber}`, invoiceDetailsX, 70);
        
        const orderNosText = orderNumbers.length > 5 
          ? `${orderNumbers.slice(0, 3).join(', ')} + ${orderNumbers.length - 3} more`
          : orderNumbers.join(', ');
        doc.text(`Order Nos : - ${orderNosText}`, invoiceDetailsX, 75);
        doc.text(`Date : - ${params.invoiceDate}`, invoiceDetailsX, 80);

        // Process items for table
        let grandTotal = 0;
        const processedItems = aggregatedItems.map((item, index) => {
          grandTotal += item.total;
          return [
            (index + 1).toString(),
            item.code,
            item.description,
            item.qty.toString(),
            `Rs. ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `Rs. ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ];
        });

        // Add empty rows to match template (total 15 rows)
        const emptyRowsNeeded = Math.max(0, 15 - processedItems.length);
        for (let i = 0; i < emptyRowsNeeded; i++) {
          processedItems.push(['', '', '', '', '', '']);
        }

        // Items table
        autoTable(doc, {
          head: [['No', 'Item (SKU)', 'Description', 'Qty', 'Price', 'Total']],
          body: processedItems,
          startY: 95,
          styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [255, 165, 0], // Orange borders
            lineWidth: 0.5,
          },
          headStyles: {
            fillColor: [255, 165, 0], // Orange header background
            textColor: [255, 255, 255], // White text
            fontStyle: 'bold',
            fontSize: 10,
          },
          bodyStyles: {
            fillColor: [255, 248, 240], // Light peach fill
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 20 }, // No
            1: { cellWidth: 35 }, // Item (SKU)
            2: { cellWidth: 45 }, // Description
            3: { halign: 'center', cellWidth: 20 }, // Qty
            4: { halign: 'right', cellWidth: 30 }, // Price
            5: { halign: 'right', cellWidth: 35 }, // Total
          },
          margin: { left: 15, right: 15 },
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 350;

        // Total Amount section (bottom right)
        const totalY = finalY + 10;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('Total Amount', pageWidth - 80, totalY);
        doc.text('Rs.', pageWidth - 45, totalY);
        doc.text(`${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 20, totalY, { align: 'right' });

        // Signature lines
        const signatureY = totalY + 40;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        // Left signature line
        doc.line(30, signatureY, 100, signatureY);
        doc.text('Authorized By', 65, signatureY + 10, { align: 'center' });
        
        // Right signature line  
        doc.line(pageWidth - 100, signatureY, pageWidth - 30, signatureY);
        doc.text('Customer Signature', pageWidth - 65, signatureY + 10, { align: 'center' });

        // Save and open PDF
        const filename = `Invoice_${params.invoiceNumber}_${params.invoiceDate.replace(/\//g, '-')}.pdf`;
        
        // Open preview with download and print options
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const newWindow = window.open(pdfUrl, '_blank');
        if (newWindow) {
          newWindow.document.title = filename;
          // Add download functionality
          setTimeout(() => {
            const link = newWindow.document.createElement('a');
            link.href = pdfUrl;
            link.download = filename;
            link.click();
          }, 1000);
        } else {
          // Fallback download
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = filename;
          link.click();
        }

        toast({
          title: "Invoice Generated",
          description: `Invoice ${params.invoiceNumber} generated for ${customerData.toName} with ${aggregatedItems.length} items from ${orderNumbers.length} orders.`,
        });

      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: "Error generating PDF",
          description: "Please try again later.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error loading data",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    generateCustomerInvoicePDF,
    loading
  };
};