import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Sale, InventoryItem, Customer } from '@/hooks/useFirebaseReports';
import { generateInvoicePDF } from '@/components/InvoiceTemplate';

interface GenerateReportsModalProps {
  open: boolean;
  onClose: () => void;
  sales: Sale[];
  inventory: InventoryItem[];
  customers: Customer[];
}

interface ReportOption {
  id: string;
  title: string;
  description: string;
}

const reportOptions: ReportOption[] = [
  { id: 'monthly-sales', title: 'Monthly Sales Report', description: 'Comprehensive sales analysis for the current month' },
  { id: 'inventory', title: 'Inventory Report', description: 'Current stock levels and low inventory alerts' },
  { id: 'invoice', title: 'Invoice Report', description: 'Outstanding invoices and payment status' },
  { id: 'supplier', title: 'Supplier Performance', description: 'Supplier delivery times and quality metrics' },
];

export default function GenerateReportsModal({ 
  open, 
  onClose, 
  sales, 
  inventory, 
  customers 
}: GenerateReportsModalProps) {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleReportToggle = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const generateMonthlySalesReport = () => {
    const doc = new jsPDF();
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Current month sales
    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    });

    const totalSales = currentMonthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const avgOrderValue = currentMonthSales.length > 0 ? totalSales / currentMonthSales.length : 0;
    const paidCount = currentMonthSales.filter(sale => sale.status === 'paid').length;
    const unpaidCount = currentMonthSales.length - paidCount;

    doc.setFontSize(20);
    doc.text('Monthly Sales Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Period: ${currentMonth}`, 20, 45);

    // KPIs
    doc.setFontSize(14);
    doc.text('Key Performance Indicators', 20, 65);
    doc.setFontSize(10);
    doc.text(`Total Sales: Rs. ${totalSales.toFixed(2)}`, 20, 80);
    doc.text(`Number of Orders: ${currentMonthSales.length}`, 20, 90);
    doc.text(`Average Order Value: Rs. ${avgOrderValue.toFixed(2)}`, 20, 100);
    doc.text(`Paid Orders: ${paidCount} | Unpaid Orders: ${unpaidCount}`, 20, 110);

    // Sales table
    const tableData = currentMonthSales.map((sale, index) => {
      const customer = customers.find(c => c.id === sale.customerId);
      return [
        sale.date,
        sale.id,
        customer?.name || 'Unknown',
        sale.items.length,
        `Rs. ${sale.total.toFixed(2)}`,
        sale.status
      ];
    });

    (doc as any).autoTable({
      head: [['Date', 'Invoice ID', 'Customer', 'Items', 'Total', 'Status']],
      body: tableData,
      startY: 130,
      styles: { fontSize: 8 }
    });

    doc.save(`Monthly_Sales_Report_${currentMonth.replace(' ', '_')}.pdf`);
  };

  const generateInventoryReport = () => {
    const doc = new jsPDF();
    const totalSKUs = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    const lowStockItems = inventory.filter(item => item.quantity <= 5);

    doc.setFontSize(20);
    doc.text('Inventory Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);

    // KPIs
    doc.setFontSize(14);
    doc.text('Inventory Summary', 20, 65);
    doc.setFontSize(10);
    doc.text(`Total SKUs: ${totalSKUs}`, 20, 80);
    doc.text(`Total Inventory Value: Rs. ${totalValue.toFixed(2)}`, 20, 90);
    doc.text(`Low Stock Items: ${lowStockItems.length}`, 20, 100);

    // Stock levels table
    const stockData = inventory.map(item => [
      item.sku,
      item.name,
      item.quantity,
      `Rs. ${item.costPrice.toFixed(2)}`,
      `Rs. ${(item.quantity * item.costPrice).toFixed(2)}`
    ]);

    (doc as any).autoTable({
      head: [['SKU', 'Name', 'Quantity', 'Cost Price', 'Total Value']],
      body: stockData,
      startY: 120,
      styles: { fontSize: 8 }
    });

    // Low stock alerts
    if (lowStockItems.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 120;
      doc.setFontSize(14);
      doc.text('Low Stock Alerts', 20, finalY + 20);
      
      const lowStockData = lowStockItems.map(item => [
        item.sku,
        item.name,
        item.quantity,
        'LOW STOCK'
      ]);

      (doc as any).autoTable({
        head: [['SKU', 'Name', 'Quantity', 'Status']],
        body: lowStockData,
        startY: finalY + 30,
        styles: { fontSize: 8 }
      });
    }

    doc.save('Inventory_Report.pdf');
  };

  const generateInvoiceReport = () => {
    const doc = new jsPDF();
    const unpaidSales = sales.filter(sale => sale.status !== 'paid');
    const totalOutstanding = unpaidSales.reduce((sum, sale) => sum + sale.total, 0);

    doc.setFontSize(20);
    doc.text('Invoice Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);

    // Outstanding summary
    doc.setFontSize(14);
    doc.text('Outstanding Invoices Summary', 20, 65);
    doc.setFontSize(10);
    doc.text(`Total Outstanding: Rs. ${totalOutstanding.toFixed(2)}`, 20, 80);
    doc.text(`Number of Unpaid Invoices: ${unpaidSales.length}`, 20, 90);

    // Add note about individual invoice printing
    doc.setFontSize(12);
    doc.text('Individual Invoice Templates', 20, 110);
    doc.setFontSize(10);
    doc.text('Each invoice can be printed individually using the Print button in the invoice list.', 20, 120);
    doc.text('Invoice templates follow the SEVINRO design with proper formatting and signatures.', 20, 130);

    // Unpaid invoices table
    const unpaidData = unpaidSales.map(sale => {
      const customer = customers.find(c => c.id === sale.customerId);
      return [
        sale.id,
        customer?.name || 'Unknown',
        sale.date,
        `Rs. ${sale.total.toFixed(2)}`,
        sale.status
      ];
    });

    (doc as any).autoTable({
      head: [['Invoice ID', 'Customer', 'Date', 'Amount', 'Status']],
      body: unpaidData,
      startY: 150,
      styles: { fontSize: 8 }
    });

    doc.save('Invoice_Report.pdf');
  };

  const generateSupplierReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Supplier Performance Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);

    doc.setFontSize(14);
    doc.text('No Supplier Data Available', 20, 80);
    doc.setFontSize(10);
    doc.text('Supplier performance metrics will be available once supplier data is added to the system.', 20, 100);

    doc.save('Supplier_Performance_Report.pdf');
  };

  const handleGenerate = async () => {
    if (selectedReports.length === 0) {
      toast({
        title: "No reports selected",
        description: "Please select at least one report to generate.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      for (const reportId of selectedReports) {
        switch (reportId) {
          case 'monthly-sales':
            generateMonthlySalesReport();
            break;
          case 'inventory':
            generateInventoryReport();
            break;
          case 'invoice':
            generateInvoiceReport();
            break;
          case 'supplier':
            generateSupplierReport();
            break;
        }
      }

      toast({
        title: "Reports generated successfully",
        description: `${selectedReports.length} report(s) have been downloaded.`,
      });

      onClose();
      setSelectedReports([]);
    } catch (error) {
      toast({
        title: "Error generating reports",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Reports</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {reportOptions.map((report) => (
            <div key={report.id} className="flex items-start space-x-3">
              <Checkbox
                id={report.id}
                checked={selectedReports.includes(report.id)}
                onCheckedChange={() => handleReportToggle(report.id)}
              />
              <div className="flex-1">
                <label 
                  htmlFor={report.id}
                  className="text-sm font-medium cursor-pointer"
                >
                  {report.title}
                </label>
                <p className="text-xs text-muted-foreground">
                  {report.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={generating || selectedReports.length === 0}
          >
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}