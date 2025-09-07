import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Sale, Customer, InventoryItem } from '@/hooks/useFirebaseReports';

export const generateInvoicePDF = (
  sale: Sale, 
  customer: Customer | undefined, 
  inventory: InventoryItem[],
  invoiceNumber: number
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with logo area
  doc.setFillColor(255, 165, 0); // Orange color
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Company info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('SEVINRO DISTRIBUTORS', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('123 Business Street, City, State 12345', 20, 32);
  doc.text('Phone: +1 (555) 123-4567 | Email: info@sevinro.com', 20, 37);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Invoice title
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', pageWidth / 2, 60, { align: 'center' });
  
  // Customer info - Left side
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('TO:', 20, 80);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  if (customer) {
    doc.text(customer.name, 20, 90);
    doc.text(customer.address || 'No address provided', 20, 95);
    doc.text(customer.phone || 'No phone provided', 20, 100);
  } else {
    doc.text('Customer information not available', 20, 90);
  }
  
  // Invoice details - Right side
  const rightColumnX = pageWidth - 80;
  doc.setFont(undefined, 'bold');
  doc.text('Invoice No:', rightColumnX, 80);
  doc.text('Order No:', rightColumnX, 90);
  doc.text('Date:', rightColumnX, 100);
  
  doc.setFont(undefined, 'normal');
  doc.text(`SI0${invoiceNumber}`, rightColumnX + 25, 80);
  doc.text(sale.id.substring(0, 8), rightColumnX + 25, 90);
  doc.text(new Date(sale.date).toLocaleDateString('en-GB'), rightColumnX + 25, 100);
  
  // Items table
  const tableData = sale.items.map((item, index) => {
    const inventoryItem = inventory.find(inv => inv.sku === item.sku);
    return [
      (index + 1).toString(),
      item.sku,
      item.description || inventoryItem?.name || 'N/A',
      item.qty.toString(),
      `Rs. ${item.price.toFixed(2)}`,
      `Rs. ${(item.qty * item.price).toFixed(2)}`
    ];
  });
  
  (doc as any).autoTable({
    head: [['No', 'Item', 'Description', 'Qty', 'Price', 'Total']],
    body: tableData,
    startY: 120,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [255, 165, 0], // Orange header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 25 },
      2: { cellWidth: 60 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 30 },
    },
  });
  
  const finalY = (doc as any).lastAutoTable.finalY || 120;
  
  // Total section
  const totalY = finalY + 20;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(14);
  doc.text('Total Amount:', pageWidth - 80, totalY);
  doc.text(`Rs. ${sale.total.toFixed(2)}`, pageWidth - 20, totalY, { align: 'right' });
  
  // Signature lines
  const signatureY = totalY + 40;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  
  doc.line(20, signatureY, 80, signatureY);
  doc.text('Authorized By', 20, signatureY + 10);
  
  doc.line(pageWidth - 80, signatureY, pageWidth - 20, signatureY);
  doc.text('Customer Signature', pageWidth - 80, signatureY + 10);
  
  return doc;
};