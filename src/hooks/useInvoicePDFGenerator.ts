import { useState } from 'react';
import { ref, get } from 'firebase/database';
import { realtimeDb, auth } from '@/lib/firebase';
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
    
    console.log('Starting PDF generation for invoice:', invoiceId);
    console.log('Current auth state:', auth.currentUser ? 'authenticated' : 'not authenticated');
    
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

      // Format date to DD/MM/YYYY
      const formattedDate = new Date(date).toLocaleDateString('en-GB');

      // Fetch customer data
      const customerSnap = await get(ref(realtimeDb, `customers/${customerId}`));
      const customerData: CustomerData = customerSnap.exists() ? customerSnap.val() : {
        toName: "Unknown Customer",
        toCity: "Unknown City"
      };

      // Generate PDF with exact template design
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      try {
        // Header - Company logo (top left)
        if (companyData.logoUrl) {
          try {
            // Load and add logo image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              img.onload = () => {
                try {
                  // Add logo image (max width 40, height auto-scaled)
                  const logoWidth = 40;
                  const logoHeight = (img.height / img.width) * logoWidth;
                  doc.addImage(img, 'JPEG', 20, 15, logoWidth, logoHeight);
                  resolve(null);
                } catch (error) {
                  console.error('Error adding logo to PDF:', error);
                  // Fallback to text
                  doc.setFontSize(18);
                  doc.setFont(undefined, 'bold');
                  doc.setTextColor(255, 165, 0);
                  doc.text('SEVINRO', 20, 25);
                  resolve(null);
                }
              };
              img.onerror = () => {
                console.error('Failed to load logo image');
                // Fallback to text
                doc.setFontSize(18);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(255, 165, 0);
                doc.text('SEVINRO', 20, 25);
                resolve(null);
              };
              img.src = companyData.logoUrl;
            });
          } catch (error) {
            console.error('Error loading logo:', error);
            // Fallback to text logo
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 165, 0);
            doc.text('SEVINRO', 20, 25);
          }
        } else {
          // Fallback to text logo if no logoUrl
          doc.setFontSize(18);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(255, 165, 0);
          doc.text('SEVINRO', 20, 25);
        }

        // Company details (top right) - exact format from template
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        const rightX = pageWidth - 20;
        doc.text(`No : ${companyData.addressLine.replace('No : ', '')}`, rightX, 20, { align: 'right' });
        doc.text(`Tel : ${companyData.phone}`, rightX, 25, { align: 'right' });

        // INVOICE title (centered)
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });

        // Customer info - Left side (TO:) - exact format from template
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('TO :-', 20, 70);
        
        doc.setFont(undefined, 'normal');
        doc.text(customerData.toName, 20, 80);
        doc.text(customerData.toCity, 20, 85);

        // Invoice details - Right side - exact format from template
        const invoiceDetailsX = pageWidth - 70;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`Invoice No : - ${invoiceNo}`, invoiceDetailsX, 70);
        const orderNoToDisplay = invoiceData.orderNo || `OR${invoiceNo}`;
        if (invoiceData.orderNo) {
          doc.text(`Order No : - ${orderNoToDisplay}`, invoiceDetailsX, 75);
          doc.text(`Date : - ${formattedDate}`, invoiceDetailsX, 80);
        } else {
          doc.text(`Date : - ${formattedDate}`, invoiceDetailsX, 75);
        }

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
              item.code || item.item || (item as any).item_code || (item as any).itemCode || (item as any).sku || '',
              item.description || '',
              item.qty.toString(),
              `Rs. ${priceLkr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              `Rs. ${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];
          });

        // Add empty rows to match template (total 15 rows as shown in image)
        const emptyRowsNeeded = Math.max(0, 15 - processedItems.length);
        for (let i = 0; i < emptyRowsNeeded; i++) {
          processedItems.push(['', '', '', '', '', '']);
        }

        // Items table with exact styling from template
        try {
          autoTable(doc, {
            head: [['No', 'Items', 'Description', 'Qty', 'Price', 'Total']],
            body: processedItems,
            startY: 95,
            styles: {
              fontSize: 9,
              cellPadding: 4,
              lineColor: [255, 165, 0], // Orange borders to match template
              lineWidth: 0.5,
            },
            headStyles: {
              fillColor: [255, 165, 0], // Orange header background
              textColor: [255, 255, 255], // White text
              fontStyle: 'bold',
              fontSize: 10,
            },
            bodyStyles: {
              fillColor: [255, 248, 240], // Light peach fill like template
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 20 }, // No
              1: { cellWidth: 35 }, // Items
              2: { cellWidth: 45 }, // Description
              3: { halign: 'center', cellWidth: 20 }, // Qty
              4: { halign: 'right', cellWidth: 30 }, // Price
              5: { halign: 'right', cellWidth: 35 }, // Total
            },
            margin: { left: 15, right: 15 },
          });
        } catch (error) {
          console.error('Error generating table:', error);
          // Continue without table if it fails
        }

        const finalY = (doc as any).lastAutoTable?.finalY || 350;

        // Total Amount section (bottom right) - exact format from template
        const totalY = finalY + 10;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('Total Amount', pageWidth - 80, totalY);
        doc.text('Rs.', pageWidth - 45, totalY);
        doc.text(`${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 20, totalY, { align: 'right' });

        // FX note if USD was converted (small text above signatures)
        let fxNoteY = totalY + 30;
        if (hasConvertedUSD) {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
          doc.text(`FX: 1 USD = ${usdToLkr} LKR`, pageWidth - 20, fxNoteY, { align: 'right' });
          fxNoteY += 15;
        }

        // Signature lines - exact format from template
        const signatureY = fxNoteY + 15;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        // Left signature line
        doc.line(30, signatureY, 100, signatureY);
        doc.text('Authorized By', 65, signatureY + 10, { align: 'center' });
        
        // Right signature line  
        doc.line(pageWidth - 100, signatureY, pageWidth - 30, signatureY);
        doc.text('Customer Signature', pageWidth - 65, signatureY + 10, { align: 'center' });

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
          description: `Invoice ${invoiceNo} has been generated using the SEVINRO template.`,
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