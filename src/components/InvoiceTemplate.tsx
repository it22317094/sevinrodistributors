import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Customer, InventoryItem } from '@/hooks/useFirebaseReports';

export const generateInvoicePDF = async (
  sale: Sale,
  customer: Customer | undefined,
  inventory: InventoryItem[],
  invoiceNumber: number
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add company logo at top
  try {
    const logoImg = new Image();
    logoImg.src = '/assets/images/logo.png';
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
    });
    
    const aspectRatio = 1356 / 896;
    const logoHeight = 20;
    const logoWidth = logoHeight * aspectRatio;
    
    doc.addImage(logoImg, 'PNG', 20, 15, logoWidth, logoHeight);
  } catch (error) {
    console.error('Error loading logo:', error);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 165, 0);
    doc.text('SEVINRO', 20, 25);
  }
  
  // Company details (top right)
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  const rightX = pageWidth - 20;
  doc.text('No - 136/A, Akarawita, Gampaha', rightX, 20, { align: 'right' });
  doc.text('Te: 071 39 69 580, 0777 52 90 58', rightX, 25, { align: 'right' });
  
  // Title (centered)
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });
  
  // Customer info - Left side (TO:-)
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('TO:-', 20, 70);
  
  doc.setFont(undefined, 'normal');
  if (customer) {
    doc.text(customer.name, 32, 70);
    if (customer.address) {
      doc.text(customer.address, 20, 76);
    }
  } else {
    doc.text('Cotton Feel', 32, 70);
    doc.text('Matara', 20, 76);
  }
  
  // Invoice details - Right side
  const invoiceDetailsX = pageWidth - 70;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.text(`Invoice No - SI00${invoiceNumber}`, invoiceDetailsX, 70);
  doc.text(`Order No - ${sale.orderNo || ''}`, invoiceDetailsX, 75);
  doc.text(`Date - ${new Date(sale.date).toLocaleDateString('en-GB')}`, invoiceDetailsX, 80);
  
  // Items table - using same structure as Sales Order
  const tableData = Object.values(sale.items).map((item: any, index) => {
    const inventoryItem = inventory.find(inv => inv.sku === item.sku);
    const itemCode = item.item_code || item.code || '';
    const quantity = item.qty || item.quantity || 0;
    const branch = item.branch || '';
    
    return [
      (index + 1).toString(),
      itemCode,
      item.description || inventoryItem?.name || 'T-Shirt',
      quantity.toString(),
      branch || '',
      `${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `RS ${(quantity * item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      item.remarks || ''
    ];
  });
  
  try {
    autoTable(doc, {
      head: [['No', 'Style No', 'Description', 'Qty', 'Branch', 'Price', 'Total', 'Remarks']],
      body: tableData,
      startY: 90,
      styles: {
        fontSize: 8,
        cellPadding: 3.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [255, 165, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        valign: 'middle',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { halign: 'center', valign: 'middle', cellWidth: 15 },
        1: { valign: 'middle', cellWidth: 18 },
        2: { valign: 'middle', cellWidth: 28 },
        3: { halign: 'center', valign: 'middle', cellWidth: 12 },
        4: { valign: 'middle', cellWidth: 23 },
        5: { halign: 'right', valign: 'middle', cellWidth: 18 },
        6: { halign: 'right', valign: 'middle', cellWidth: 32 },
        7: { valign: 'middle', cellWidth: 28 },
      },
      margin: { left: 20, right: 20 },
    });
  } catch (error) {
    console.error('Error generating table:', error);
  }
  
  const finalY = (doc as any).lastAutoTable?.finalY || 300;
  
  // Total section (right aligned)
  const totalY = finalY + 10;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('Total Amount', pageWidth - 80, totalY);
  doc.text('RS', pageWidth - 45, totalY);
  doc.text(`${sale.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 20, totalY, { align: 'right' });
  
  // Signature lines
  const signatureY = totalY + 50;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  
  doc.line(20, signatureY, 90, signatureY);
  doc.text('Authorized By', 45, signatureY + 10, { align: 'center' });
  
  doc.line(pageWidth - 90, signatureY, pageWidth - 20, signatureY);
  doc.text('Customer Signature', pageWidth - 55, signatureY + 10, { align: 'center' });
  
  return doc;
};
