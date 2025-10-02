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

      // Add logo (left aligned)
      try {
        const logoImg = new Image();
        logoImg.src = '/assets/images/logo.png';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        
        const logoWidth = 40;
        const logoHeight = 28;
        doc.addImage(logoImg, 'PNG', 20, 10, logoWidth, logoHeight);
      } catch {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('COMPANY LOGO', 20, 25);
      }

      // Company details (top right)
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('No: 138/A, Alkaravita, Gampaha', pageWidth - 20, 15, { align: 'right' });
      doc.text('Tel: 071 39 65 580, 0777 92 90 36', pageWidth - 20, 22, { align: 'right' });

      // Invoice title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });

      // Customer info
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('TO :-', 20, 70);
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.customer_name, 42, 70);

      // Invoice details (right aligned)
      doc.setFont(undefined, 'bold');
      doc.text('Invoice No -', pageWidth - 75, 70);
      doc.text('Order No -', pageWidth - 75, 78);
      doc.text('Date -', pageWidth - 75, 86);
      
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.invoice_no, pageWidth - 20, 70, { align: 'right' });
      doc.text(invoiceData.order_no, pageWidth - 20, 78, { align: 'right' });
      doc.text(new Date(invoiceData.invoice_date).toLocaleDateString('en-GB'), pageWidth - 20, 86, { align: 'right' });

      // Prepare table data with separate Rs. column
      const enhancedTableData = items.map((item, index) => [
        (index + 1).toString(),
        item.item_code,
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price).replace('Rs. ', ''),
        'Rs.',
        formatCurrency(item.quantity * item.price).replace('Rs. ', '')
      ]);

      // Items table with orange header
      autoTable(doc, {
        head: [['No', 'Item', 'Description', 'Qty', 'Price', '', 'Total']],
        body: enhancedTableData,
        startY: 100,
        styles: { 
          fontSize: 11,
          cellPadding: 5
        },
        headStyles: { 
          fillColor: [255, 140, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [255, 250, 240]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'left', cellWidth: 50 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'left', cellWidth: 15 },
          6: { halign: 'right', cellWidth: 30 }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;

      // Total amount (right aligned)
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Total Amount', pageWidth - 85, finalY);
      doc.text('Rs.', pageWidth - 50, finalY);
      doc.text(formatCurrency(grandTotal).replace('Rs. ', ''), pageWidth - 20, finalY, { align: 'right' });

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
