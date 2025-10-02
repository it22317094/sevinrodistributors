import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Sale, InventoryItem, Customer } from '@/hooks/useFirebaseReports';
import { useInvoiceGenerator } from '@/hooks/useInvoiceGenerator';

interface ReportViewModalProps {
  open: boolean;
  onClose: () => void;
  reportType: 'monthly-sales' | 'inventory' | 'invoice';
  sales: Sale[];
  inventory: InventoryItem[];
  customers: Customer[];
}

export default function ReportViewModal({ 
  open, 
  onClose, 
  reportType, 
  sales, 
  inventory, 
  customers 
}: ReportViewModalProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [inventoryView, setInventoryView] = useState<'quantity' | 'value'>('quantity');
  const { generateInvoicePDF, loading: pdfLoading } = useInvoiceGenerator();

  const formatCurrency = (amount: number) => `LKR ${amount.toLocaleString()}`;

  const renderMonthlySalesChart = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get current month sales
    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });

    // Group by day
    const dailySales = currentMonthSales.reduce((acc, sale) => {
      const day = new Date(sale.date).getDate();
      acc[day] = (acc[day] || 0) + sale.total;
      return acc;
    }, {} as Record<number, number>);

    const chartData = Object.entries(dailySales).map(([day, total]) => ({
      day: `Day ${day}`,
      total
    }));

    const totalSales = currentMonthSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalOrders = currentMonthSales.length;
    const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Sales</div>
              <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Orders</div>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Average Order</div>
              <div className="text-2xl font-bold">{formatCurrency(averageOrder)}</div>
            </CardContent>
          </Card>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Bar dataKey="total" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>

        <div className="max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Invoice ID</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-left p-2">Items</th>
                <th className="text-left p-2">Total</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentMonthSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  className="border-b hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => generateInvoicePDF(sale.id)}
                >
                  <td className="p-2">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="p-2">{sale.id}</td>
                  <td className="p-2">{customers.find(c => c.id === sale.customerId)?.name || 'Unknown'}</td>
                  <td className="p-2">{sale.items.length}</td>
                  <td className="p-2">{formatCurrency(sale.total)}</td>
                  <td className="p-2">
                    <Badge variant={sale.status === 'paid' ? 'default' : 'destructive'}>
                      {sale.status}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={pdfLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        generateInvoicePDF(sale.id);
                      }}
                    >
                      {pdfLoading ? 'Generating...' : 'Generate PDF'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInventoryChart = () => {
    const topItems = inventory
      .sort((a, b) => {
        if (inventoryView === 'quantity') {
          return b.quantity - a.quantity;
        }
        return (b.quantity * b.costPrice) - (a.quantity * a.costPrice);
      })
      .slice(0, 10);

    const chartData = topItems.map(item => ({
      name: item.name,
      value: inventoryView === 'quantity' ? item.quantity : item.quantity * item.costPrice
    }));

    const totalSKUs = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    const lowStockCount = inventory.filter(item => item.quantity <= 5).length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total SKUs</div>
              <div className="text-2xl font-bold">{totalSKUs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Inventory Value</div>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Low Stock Items</div>
              <div className="text-2xl font-bold">{lowStockCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button
            variant={inventoryView === 'quantity' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInventoryView('quantity')}
          >
            Quantity
          </Button>
          <Button
            variant={inventoryView === 'value' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInventoryView('value')}
          >
            Value
          </Button>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderInvoiceChart = () => {
    const filteredSales = statusFilter === 'all' 
      ? sales 
      : sales.filter(sale => sale.status === statusFilter);

    // Group by day for line chart
    const dailyTotals = filteredSales.reduce((acc, sale) => {
      const date = sale.date;
      acc[date] = (acc[date] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    const lineData = Object.entries(dailyTotals)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, total]) => ({
        date: new Date(date).toLocaleDateString(),
        total
      }));

    // Pie chart data for outstanding
    const statusData = [
      { name: 'Paid', value: sales.filter(s => s.status === 'paid').length, color: '#22c55e' },
      { name: 'Unpaid', value: sales.filter(s => s.status === 'unpaid').length, color: '#ef4444' },
      { name: 'Partial', value: sales.filter(s => s.status === 'partial').length, color: '#f59e0b' }
    ];

    const totalOutstanding = sales
      .filter(sale => sale.status !== 'paid')
      .reduce((sum, sale) => sum + sale.total, 0);

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Outstanding</div>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          {['all', 'paid', 'unpaid', 'partial'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status as any)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" />
          </LineChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold">Outstanding Invoices</h3>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Invoice ID</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales
                  .filter(sale => sale.status !== 'paid')
                  .map((sale) => (
                    <tr 
                      key={sale.id} 
                      className="border-b hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => generateInvoicePDF(sale.id)}
                    >
                      <td className="p-2">{sale.id}</td>
                      <td className="p-2">{customers.find(c => c.id === sale.customerId)?.name || 'Unknown'}</td>
                      <td className="p-2">{formatCurrency(sale.total)}</td>
                      <td className="p-2">
                        <Badge variant={sale.status === 'paid' ? 'default' : 'destructive'}>
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={pdfLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            generateInvoicePDF(sale.id);
                          }}
                        >
                          {pdfLoading ? 'Generating...' : 'Generate PDF'}
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    switch (reportType) {
      case 'monthly-sales': return 'Monthly Sales Report';
      case 'inventory': return 'Inventory Report';
      case 'invoice': return 'Invoice Report';
      default: return 'Report';
    }
  };

  const getContent = () => {
    switch (reportType) {
      case 'monthly-sales': return renderMonthlySalesChart();
      case 'inventory': return renderInventoryChart();
      case 'invoice': return renderInvoiceChart();
      default: return <div>No data available</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        {getContent()}
      </DialogContent>
    </Dialog>
  );
}