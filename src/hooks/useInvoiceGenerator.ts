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


      // Calculate totals
      const tableData = items.map((item, index) => {
        const lineTotal = item.quantity * item.price;
        return [
          (index + 1).toString(),
          item.item_code,
          item.description,
          item.quantity.toString(),
          item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          'Rs.',
          lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ];
      });

      const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Add logo (top left)
      try {
        const logoImg = new Image();
        logoImg.src = '/assets/images/logo.png';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        doc.addImage(logoImg, 'PNG', 15, 10, 50, 20);
      } catch (error) {
        console.log('Logo not loaded, continuing without it');
      }

      // Company details (top right)
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      const rightX = pageWidth - 15;
      doc.text('No: 138/A, Alkaravita, Gampaha', rightX, 15, { align: 'right' });
      doc.text('Tel: 071 39 65 580, 0777 92 90 36', rightX, 20, { align: 'right' });

      // INVOICE title (centered)
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text('INVOICE', pageWidth / 2, 45, { align: 'center' });

      // Customer info - Left side (TO:)
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('TO :-', 15, 60);
      
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.customer_name, 15, 68);
      if (invoiceData.customer_address) {
        doc.text(invoiceData.customer_address, 15, 73);
      }

      // Invoice details - Right side
      const invoiceDetailsX = pageWidth - 75;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Invoice No - ${invoiceData.invoice_no}`, invoiceDetailsX, 60);
      doc.text(`Order No - ${invoiceData.order_no}`, invoiceDetailsX, 65);
      doc.text(`Date - ${new Date(invoiceData.invoice_date).toLocaleDateString('en-GB')}`, invoiceDetailsX, 70);

      // Items table with orange header and peach rows
      autoTable(doc, {
        head: [['No', 'Item', 'Description', 'Qty', 'Price', '', 'Total']],
        body: tableData,
        startY: 85,
        styles: {
          fontSize: 9,
          cellPadding: 5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [230, 126, 34], // Orange #E67E22
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
        },
        alternateRowStyles: {
          fillColor: [253, 235, 208], // Light peach #FDEBD0
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 50 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'left', cellWidth: 15 },
          6: { halign: 'right', cellWidth: 30 },
        },
        margin: { left: 15, right: 15 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 250;

      // Total section (right aligned)
      const totalY = finalY + 10;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Total Amount', pageWidth - 80, totalY);
      doc.text('Rs.', pageWidth - 45, totalY);
      doc.text(grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - 15, totalY, { align: 'right' });

      // Signature lines
      const signatureY = Math.min(totalY + 30, 270);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      // Left signature line
      doc.line(15, signatureY, 85, signatureY);
      doc.text('Authorized By', 50, signatureY + 7, { align: 'center' });
      
      // Right signature line
      doc.line(pageWidth - 85, signatureY, pageWidth - 15, signatureY);
      doc.text('Customer Signature', pageWidth - 50, signatureY + 7, { align: 'center' });

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
