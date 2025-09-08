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

interface InvoiceData {
  invoiceNo: string;
  orderNo?: string;
  date: string;
  customerId: string;
  items: InvoiceItem[];
  currencyDefault?: string;
}

interface InvoiceItem {
  code?: string;
  item?: string;
  description?: string;
  qty: number;
  price: number;
  currency?: string;
}

interface CustomerData {
  toName: string;
  toCity: string;
}

export const useInvoicePDFGenerator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInvoicePDF = async (invoiceId: string) => {
    setLoading(true);
    
    try {
      // Fetch all required data from Firebase Realtime Database
      const [companySnap, invoiceSnap, exchangeRateSnap] = await Promise.all([
        get(ref(realtimeDb, 'company')),
        get(ref(realtimeDb, `invoices/${invoiceId}`)),
        get(ref(realtimeDb, 'settings/exchangeRates/usdToLkr'))
      ]);

      if (!invoiceSnap.exists()) {
        toast({
          title: "Error",
          description: "Invoice not found.",
          variant: "destructive",
        });
        return;
      }

      const invoiceData: InvoiceData = invoiceSnap.val();
      const companyData: CompanyData = companySnap.exists() ? companySnap.val() : {
        name: "Sevinro Distributors",
        addressLine: "No : 138/A, Akaravita, Gampaha",
        phone: "071 39 65 580, 0777 92 90 36"
      };

      // Validate required fields
      const { invoiceNo, date, customerId, items } = invoiceData;
      if (!invoiceNo || !date || !customerId || !items || items.length === 0) {
        const missing = [
          !invoiceNo && 'invoiceNo',
          !date && 'date', 
          !customerId && 'customerId',
          (!items || items.length === 0) && 'items'
        ].filter(Boolean).join(', ');
        
        toast({
          title: "Cannot generate invoice",
          description: `Missing ${missing}.`,
          variant: "destructive",
        });
        return;
      }

      // Check if USD conversion is needed
      const hasUSDItems = items.some(item => {
        const currency = item.currency || invoiceData.currencyDefault || "LKR";
        return currency === "USD" || currency === "$";
      });

      if (hasUSDItems && !exchangeRateSnap.exists()) {
        toast({
          title: "Cannot generate invoice",
          description: "Missing settings/exchangeRates/usdToLkr.",
          variant: "destructive",
        });
        return;
      }

      const usdToLkr = exchangeRateSnap.exists() ? exchangeRateSnap.val() : 1;

      // Fetch customer data
      const customerSnap = await get(ref(realtimeDb, `customers/${customerId}`));
      const customerData: CustomerData = customerSnap.exists() ? customerSnap.val() : {
        toName: "Unknown Customer",
        toCity: "Unknown City"
      };

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      try {
        // Header with logo
        if (companyData.logoUrl) {
          try {
            // Try to add logo, but don't fail if it doesn't work
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              doc.addImage(img, 'PNG', 20, 15, 40, 25); // max height ~40px
            };
            img.src = companyData.logoUrl;
          } catch (error) {
            // Ignore logo errors as specified
          }
        }

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
        doc.text(`Invoice No : ${invoiceNo}`, invoiceDetailsX, 70);
        if (invoiceData.orderNo) {
          doc.text(`Order No : ${invoiceData.orderNo}`, invoiceDetailsX, 75);
        }
        
        // Format date to DD/MM/YYYY
        const formattedDate = new Date(date).toLocaleDateString('en-GB');
        doc.text(`Date : ${formattedDate}`, invoiceDetailsX, invoiceData.orderNo ? 80 : 75);

        // Process items and calculate totals
        let grandTotal = 0;
        let hasConvertedUSD = false;
        
        const processedItems = items
          .filter(item => item.qty > 0 && item.price >= 0)
          .map((item, index) => {
            const effectiveCurrency = item.currency || invoiceData.currencyDefault || "LKR";
            let priceLkr = item.price;
            
            if (effectiveCurrency === "USD" || effectiveCurrency === "$") {
              priceLkr = item.price * usdToLkr;
              hasConvertedUSD = true;
            }
            
            const lineTotal = item.qty * priceLkr;
            grandTotal += lineTotal;
            
            return [
              (index + 1).toString(),
              item.code || item.item || '',
              item.description || '',
              item.qty.toString(),
              `Rs. ${priceLkr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              `Rs. ${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];
          });

        // Items table
        try {
          autoTable(doc, {
            head: [['No', 'Item', 'Description', 'Qty', 'Price', 'Total']],
            body: processedItems,
            startY: 95,
            styles: {
              fontSize: 9,
              cellPadding: 4,
              lineColor: [255, 165, 0], // Warm orange borders
              lineWidth: 0.5,
            },
            headStyles: {
              fillColor: [255, 255, 255], // White background
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              fontSize: 10,
            },
            bodyStyles: {
              fillColor: [255, 248, 240], // Light peach fill
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 20 },
              1: { cellWidth: 35 },
              2: { cellWidth: 45 },
              3: { halign: 'right', cellWidth: 20 },
              4: { halign: 'right', cellWidth: 35 },
              5: { halign: 'right', cellWidth: 35 },
            },
            margin: { left: 12, right: 12 },
          });
        } catch (error) {
          console.error('Error generating table:', error);
          // Continue without table if it fails
        }

        const finalY = (doc as any).lastAutoTable?.finalY || 200;

        // Grand total row
        const totalY = finalY + 10;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('Total Amount', pageWidth - 80, totalY);
        doc.text(`Rs. ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 20, totalY, { align: 'right' });

        // FX note if USD was converted
        if (hasConvertedUSD) {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
          doc.text(`FX: 1 USD = ${usdToLkr} LKR`, pageWidth - 20, totalY + 20, { align: 'right' });
        }

        // Signature lines
        const signatureY = totalY + 50;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        // Left signature line
        doc.line(20, signatureY, 90, signatureY);
        doc.text('Authorized By', 55, signatureY + 10, { align: 'center' });
        
        // Right signature line
        doc.line(pageWidth - 90, signatureY, pageWidth - 20, signatureY);
        doc.text('Customer Signature', pageWidth - 55, signatureY + 10, { align: 'center' });

        // Open preview with download and print options
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Create filename
        const filename = `Invoice_${invoiceNo}_${formattedDate.replace(/\//g, '-')}.pdf`;
        
        // Open in new window with print/download functionality
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
          description: `Invoice ${invoiceNo} has been generated successfully.`,
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
      console.error('Error fetching invoice data:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PERMISSION_DENIED') {
        toast({
          title: "Cannot access invoice data",
          description: "Please sign in or check database rules.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error loading invoice",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    generateInvoicePDF,
    loading
  };
};