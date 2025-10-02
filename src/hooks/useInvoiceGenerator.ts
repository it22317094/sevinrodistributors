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
        toast.error('Invoice not found');
        return;
      }

      const raw = invoiceSnapshot.val();

      // Normalize data
      const invoiceData: InvoiceData = {
        invoice_no: raw.invoice_no || String(invoiceId),
        order_no: raw.order_no || '',
        invoice_date: raw.invoice_date || new Date().toISOString(),
        customer_name: raw.customer_name || 'Unknown Customer',
        customer_address: raw.customer_address || ''
      };

      // Fetch items
      let items: InvoiceItem[] = [];
      const itemsRef = ref(realtimeDb, `invoice_items/${invoiceId}`);
      const itemsSnapshot = await get(itemsRef);
      
      if (itemsSnapshot.exists()) {
        items = Object.values(itemsSnapshot.val());
      }

      if (!items.length) {
        toast.error('No items found');
        return;
      }

      // Format currency
      const formatCurrency = (amount: number) => {
        return `Rs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
      };

      // Prepare table data
      const tableData = items.map((item, index) => [
        (index + 1).toString(),
        item.item_code,
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price).replace('Rs. ', ''),
        formatCurrency(item.quantity * item.price)
      ]);

      const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Add logo
      try {
        const logoImg = new Image();
        logoImg.src = '/assets/images/logo.png';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        
        const logoWidth = 35;
        const logoHeight = 25;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoImg, 'PNG', logoX, 15, logoWidth, logoHeight);
      } catch {
        doc.setFontSize(15);
        doc.setFont(undefined, 'bold');
        doc.text('COMPANY LOGO', pageWidth / 2, 28, { align: 'center' });
      }

      // Invoice title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });

      // Customer info
      doc.setFontSize(15);
      doc.setFont(undefined, 'bold');
      doc.text('TO :-', 20, 65);
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.customer_name, 35, 65);

      // Invoice details
      doc.setFont(undefined, 'bold');
      doc.text('Invoice No -', pageWidth - 60, 65);
      doc.text('Order No -', pageWidth - 60, 72);
      doc.text('Date -', pageWidth - 60, 79);
      
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.invoice_no, pageWidth - 25, 65);
      doc.text(invoiceData.order_no, pageWidth - 25, 72);
      doc.text(new Date(invoiceData.invoice_date).toLocaleDateString('en-GB'), pageWidth - 25, 79);

      // Items table
      autoTable(doc, {
        head: [['No', 'Item', 'Description', 'Qty', 'Price', 'Total']],
        body: tableData,
        startY: 90,
        styles: { fontSize: 15 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Total amount
      doc.setFont(undefined, 'bold');
      doc.text('Total Amount', 20, finalY);
      doc.text(formatCurrency(grandTotal), pageWidth - 20, finalY, { align: 'right' });

      // Signatures
      const signatureY = finalY + 20;
      doc.line(20, signatureY, 80, signatureY);
      doc.line(pageWidth - 80, signatureY, pageWidth - 20, signatureY);
      
      doc.text('Authorized By', 50, signatureY + 10, { align: 'center' });
      doc.text('Customer Signature', pageWidth - 50, signatureY + 10, { align: 'center' });

      // Save PDF
      doc.save(`invoice_${invoiceData.invoice_no}.pdf`);
      toast.success('Invoice generated!');

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return { generateInvoicePDF, loading };
};
