import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Customer, InventoryItem } from '@/hooks/useFirebaseReports';

export const generateInvoicePDF = (
  sale: Sale, 
  customer: Customer | undefined, 
  inventory: InventoryItem[],
  invoiceNumber: number
) => {
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
  if (customer) {
    doc.text(customer.name, 35, 60);
    if (customer.address) {
      doc.text(customer.address, 20, 65);
    }
  } else {
    doc.text('Cotton Feel', 35, 60);
    doc.text('Matara', 20, 65);
  }
  
  // Invoice details - Right side
  const invoiceDetailsX = pageWidth - 75;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(`Invoice No  - SI00${invoiceNumber}`, invoiceDetailsX, 55);
  doc.text(`Order No    - ON00${invoiceNumber}`, invoiceDetailsX, 60);
  doc.text(`Date        - ${new Date(sale.date).toLocaleDateString('en-GB')}`, invoiceDetailsX, 65);
  
  // Items table
  const tableData = sale.items.map((item, index) => {
    const inventoryItem = inventory.find(inv => inv.sku === item.sku);
    return [
      (index + 1).toString(),
      item.sku,
      item.description || inventoryItem?.name || 'T-shirt',
      item.qty.toString(),
      `${item.price.toFixed(2)}`,
      'Rs.',
      `${(item.qty * item.price).toFixed(2)}`
    ];
  });
  
  // Add empty rows to fill the table (like in the design)
  const emptyRowsNeeded = Math.max(0, 15 - tableData.length);
  for (let i = 0; i < emptyRowsNeeded; i++) {
    tableData.push(['', '', '', '', '', '', '']);
  }
  
  try {
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
  } catch (error) {
    console.error('Error generating table:', error);
  }
  
  const finalY = (doc as any).lastAutoTable?.finalY || 300;
  
  // Total section (right aligned)
  const totalY = finalY + 5;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('Total Amount', pageWidth - 75, totalY);
  doc.text('Rs.', pageWidth - 40, totalY);
  doc.text(`${sale.total.toFixed(2)}`, pageWidth - 20, totalY, { align: 'right' });
  
  // Signature lines
  const signatureY = totalY + 50;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  
  // Left signature line
  doc.line(20, signatureY, 90, signatureY);
  doc.text('Authorized By', 45, signatureY + 10, { align: 'center' });
  
  // Right signature line
  doc.line(pageWidth - 90, signatureY, pageWidth - 20, signatureY);
  doc.text('Customer Signature', pageWidth - 55, signatureY + 10, { align: 'center' });
  
  return doc;
};