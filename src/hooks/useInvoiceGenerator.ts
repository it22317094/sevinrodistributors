import { useState } from 'react';
import { ref, get } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface InvoiceItem {
  item_code: string;
  description: string;
  quantity: number;
  price: number;
}

interface InvoiceData {
  invoice_no: string;
  order_no: string;
  invoice_date: string;
  customer_name: string;
  customer_address: string;
}

export const useInvoiceGenerator = () => {
  const [loading, setLoading] = useState(false);

  const generateInvoicePDF = async (invoiceId: string) => {
    setLoading(true);
    try {
      // Fetch invoice data
      const invoiceRef = ref(realtimeDb, `invoices/${invoiceId}`);
      const invoiceSnapshot = await get(invoiceRef);
      
      if (!invoiceSnapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const raw: any = invoiceSnapshot.val();

      // Normalize invoice fields from different schemas
      const invoiceData: InvoiceData = {
        invoice_no: raw.invoice_no || (raw.number != null ? String(raw.number) : String(invoiceId)),
        order_no: raw.order_no || raw.orderNo || '',
        invoice_date: raw.invoice_date || raw.date || new Date().toISOString(),
        customer_name: raw.customer_name || raw.customerName || 'Unknown Customer',
        customer_address: raw.customer_address || raw.customerAddress || raw.customer_city || ''
      };

      // Prefer dedicated invoice_items path, fallback to items on invoice
      let items: InvoiceItem[] = [];
      try {
        const itemsRef = ref(realtimeDb, `invoice_items/${invoiceId}`);
        const itemsSnapshot = await get(itemsRef);
        if (itemsSnapshot.exists()) {
          items = Object.values(itemsSnapshot.val());
        }
      } catch (_) {
        // ignore, we'll fallback
      }

      if (!items.length && Array.isArray(raw.items)) {
        items = raw.items.map((it: any) => ({
          item_code: it.item_code || it.itemCode || it.code || it.item || '',
          description: it.description || '',
          quantity: it.quantity ?? it.qty ?? 0,
          price: it.price ?? it.unitPrice ?? 0,
        }));
      }

      if (!items.length) {
        throw new Error('No invoice items found');
      }


      // Calculate totals and format with commas
      const formatCurrency = (amount: number) => {
        return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };

      const tableData = items.map((item, index) => {
        const lineTotal = item.quantity * item.price;
        return [
          (index + 1).toString(),
          item.item_code || '',
          item.description || '',
          item.quantity.toString(),
          formatCurrency(item.price),
          `Rs. ${formatCurrency(lineTotal)}`
        ];
      });

      const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Add logo (centered at top) - with exact dimensions maintaining 1356×896 aspect ratio
      try {
        const logoImg = new Image();
        logoImg.src = '/assets/images/logo.png';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        
        // Calculate dimensions to maintain aspect ratio (1356×896)
        const aspectRatio = 1356 / 896;
        const logoHeight = 25;
        const logoWidth = logoHeight * aspectRatio;
        
        // Center the logo
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoImg, 'PNG', logoX, 15, logoWidth, logoHeight);
      } catch (error) {
        console.log('Logo not loaded, continuing without it');
        // Fallback to text logo
        doc.setFontSize(15);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 165, 0);
        doc.text('SEVINRO DISTRIBUTORS', pageWidth / 2, 28, { align: 'center' });
      }

      // INVOICE title (centered, below logo)
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });

      // Customer info - Left side (TO :- with exact spacing)
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('TO :-', 20, 65);
      
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.customer_name, 37, 65);
      
      if (invoiceData.customer_address) {
        doc.setFontSize(10);
        doc.text(invoiceData.customer_address, 20, 72);
      }

      // Invoice details - Right side
      const invoiceDetailsX = pageWidth - 70;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('Invoice No:', invoiceDetailsX, 65);
      doc.text('Order No:', invoiceDetailsX, 72);
      doc.text('Date:', invoiceDetailsX, 79);
      
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.invoice_no, invoiceDetailsX + 25, 65);
      doc.text(invoiceData.order_no || `ON00${invoiceData.invoice_no}`, invoiceDetailsX + 25, 72);
      doc.text(new Date(invoiceData.invoice_date).toLocaleDateString('en-GB'), invoiceDetailsX + 25, 79);

      // Items table
      autoTable(doc, {
        head: [['No', 'Item', 'Description', 'Qty', 'Price', 'Total']],
        body: tableData,
        startY: 90,
        styles: {
          fontSize: 11,
          cellPadding: 4,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 11,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 30 },
          2: { cellWidth: 50 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'right', cellWidth: 30 },
        },
        margin: { left: 20, right: 20 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 250;

      // Total section
      const totalY = finalY + 15;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(13);
      doc.text('Total Amount', 20, totalY);
      doc.text(`Rs. ${formatCurrency(grandTotal)}`, pageWidth - 20, totalY, { align: 'right' });
      
      // Horizontal line
      doc.setLineWidth(0.5);
      doc.line(20, totalY + 5, pageWidth - 20, totalY + 5);

      // Signature lines
      const signatureY = totalY + 40;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      
      // Left signature
      doc.line(20, signatureY, 85, signatureY);
      doc.text('Authorized By', 52, signatureY + 7, { align: 'center' });
      
      // Right signature
      doc.line(pageWidth - 85, signatureY, pageWidth - 20, signatureY);
      doc.text('Customer Signature', pageWidth - 52, signatureY + 7, { align: 'center' });

      // Save PDF
      doc.save(`Invoice_${invoiceData.invoice_no}.pdf`);
      
      toast.success('Invoice PDF generated successfully!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice PDF');
    } finally {
      setLoading(false);
    }
  };

  return { generateInvoicePDF, loading };
};
