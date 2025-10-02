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

  const generateCombinedInvoicePDF = async (invoiceIds: string[]) => {
    setLoading(true);
    try {
      const allItems: InvoiceItem[] = [];
      let customerName = '';
      let customerAddress = '';
      let invoiceNumbers: string[] = [];
      let orderNumbers: string[] = [];
      let latestDate = '';

      // Fetch all invoices and combine their items
      for (const invoiceId of invoiceIds) {
        const invoiceRef = ref(realtimeDb, `invoices/${invoiceId}`);
        const invoiceSnapshot = await get(invoiceRef);
        
        if (!invoiceSnapshot.exists()) continue;

        const raw: any = invoiceSnapshot.val();

        // Get customer info from first invoice
        if (!customerName) {
          customerName = raw.customer_name || raw.customerName || 'Unknown Customer';
          customerAddress = raw.customer_address || raw.customerAddress || raw.customer_city || '';
        }

        invoiceNumbers.push(raw.invoice_no || (raw.number != null ? String(raw.number) : String(invoiceId)));
        orderNumbers.push(raw.order_no || raw.orderNo || '');
        
        const invoiceDate = raw.invoice_date || raw.date || new Date().toISOString();
        if (!latestDate || new Date(invoiceDate) > new Date(latestDate)) {
          latestDate = invoiceDate;
        }

        // Collect items from this invoice
        let items: InvoiceItem[] = [];
        try {
          const itemsRef = ref(realtimeDb, `invoice_items/${invoiceId}`);
          const itemsSnapshot = await get(itemsRef);
          if (itemsSnapshot.exists()) {
            items = Object.values(itemsSnapshot.val());
          }
        } catch (_) {
          // ignore, try fallback
        }

        if (!items.length && Array.isArray(raw.items)) {
          items = raw.items.map((it: any) => ({
            item_code: it.item_code || it.itemCode || it.code || it.item || '',
            description: it.description || '',
            quantity: it.quantity ?? it.qty ?? 0,
            price: it.price ?? it.unitPrice ?? 0,
          }));
        }

        allItems.push(...items);
      }

      if (!allItems.length) {
        throw new Error('No items found in invoices');
      }

      // Generate PDF with combined data
      const tableData = allItems.map((item, index) => {
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

      const grandTotal = allItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Add SEVINRO logo (top left)
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 140, 0); // Orange color
      doc.text('SEVINRO', 20, 20);
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.setFont(undefined, 'normal');
      doc.text('DISTRIBUTORS', 20, 25);

      // Company details (top right)
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      const rightX = pageWidth - 20;
      doc.text('No : 138/A, Akaravita, Gampaha', rightX, 20, { align: 'right' });
      doc.text('Tel : 071 39 65 580, 0777 92 90 36', rightX, 25, { align: 'right' });

      // INVOICE title (centered)
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });

      // Customer info - Left side (TO:)
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('TO :-', 20, 60);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(customerName, 35, 60);
      if (customerAddress) {
        doc.text(customerAddress, 20, 65);
      }

      // Invoice details - Right side
      const invoiceDetailsX = pageWidth - 75;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Invoice No  - ${invoiceNumbers.join(', ')}`, invoiceDetailsX, 55);
      doc.text(`Order No    - ${orderNumbers.filter(Boolean).join(', ') || 'N/A'}`, invoiceDetailsX, 60);
      doc.text(`Date        - ${new Date(latestDate).toLocaleDateString('en-GB')}`, invoiceDetailsX, 65);

      // Items table with orange header and peach rows
      autoTable(doc, {
        head: [['No', 'Item', 'Description', 'Qty', 'Price', '', 'Total']],
        body: tableData,
        startY: 75,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [230, 126, 34], // Orange header #E67E22
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center',
        },
        bodyStyles: {
          fillColor: [253, 235, 208], // Light peach #FDEBD0
        },
        alternateRowStyles: {
          fillColor: [253, 235, 208], // Same peach for all rows
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'left', cellWidth: 50 },
          3: { halign: 'center', cellWidth: 15 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'left', cellWidth: 15 },
          6: { halign: 'right', cellWidth: 30 },
        },
        margin: { left: 20, right: 20 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 250;

      // Total section (right aligned)
      const totalY = finalY + 5;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('Total Amount', pageWidth - 75, totalY);
      doc.text('Rs.', pageWidth - 40, totalY);
      doc.text(grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - 20, totalY, { align: 'right' });

      // Signature lines
      const signatureY = Math.min(totalY + 30, 270);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      doc.line(15, signatureY, 85, signatureY);
      doc.text('Authorized By', 50, signatureY + 7, { align: 'center' });
      
      doc.line(pageWidth - 85, signatureY, pageWidth - 15, signatureY);
      doc.text('Customer Signature', pageWidth - 50, signatureY + 7, { align: 'center' });

      doc.save(`Invoice_${customerName.replace(/\s+/g, '_')}_Combined.pdf`);
      
      toast.success('Combined invoice PDF generated successfully!');
    } catch (error) {
      console.error('Error generating combined invoice:', error);
      toast.error('Failed to generate combined invoice PDF');
    } finally {
      setLoading(false);
    }
  };

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

      // Add SEVINRO logo (top left)
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 140, 0); // Orange color
      doc.text('SEVINRO', 20, 20);
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.setFont(undefined, 'normal');
      doc.text('DISTRIBUTORS', 20, 25);

      // Company details (top right)
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      const rightX = pageWidth - 20;
      doc.text('No : 138/A, Akaravita, Gampaha', rightX, 20, { align: 'right' });
      doc.text('Tel : 071 39 65 580, 0777 92 90 36', rightX, 25, { align: 'right' });

      // INVOICE title (centered)
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });

      // Customer info - Left side (TO:)
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('TO :-', 20, 60);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(invoiceData.customer_name, 35, 60);
      if (invoiceData.customer_address) {
        doc.text(invoiceData.customer_address, 20, 65);
      }

      // Invoice details - Right side
      const invoiceDetailsX = pageWidth - 75;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Invoice No  - ${invoiceData.invoice_no}`, invoiceDetailsX, 55);
      doc.text(`Order No    - ${invoiceData.order_no}`, invoiceDetailsX, 60);
      doc.text(`Date        - ${new Date(invoiceData.invoice_date).toLocaleDateString('en-GB')}`, invoiceDetailsX, 65);

      // Items table with orange header and peach rows
      autoTable(doc, {
        head: [['No', 'Item', 'Description', 'Qty', 'Price', '', 'Total']],
        body: tableData,
        startY: 75,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [230, 126, 34], // Orange header #E67E22
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center',
        },
        bodyStyles: {
          fillColor: [253, 235, 208], // Light peach #FDEBD0
        },
        alternateRowStyles: {
          fillColor: [253, 235, 208], // Same peach for all rows
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'left', cellWidth: 50 },
          3: { halign: 'center', cellWidth: 15 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'left', cellWidth: 15 },
          6: { halign: 'right', cellWidth: 30 },
        },
        margin: { left: 20, right: 20 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 250;

      // Total section (right aligned)
      const totalY = finalY + 5;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('Total Amount', pageWidth - 75, totalY);
      doc.text('Rs.', pageWidth - 40, totalY);
      doc.text(grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - 20, totalY, { align: 'right' });

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

  return { generateInvoicePDF, generateCombinedInvoicePDF, loading };
};
