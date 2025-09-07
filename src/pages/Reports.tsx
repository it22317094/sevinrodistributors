import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Download,
  Eye,
  AlertCircle
} from "lucide-react";
import { useFirebaseReports } from '@/hooks/useFirebaseReports';
import GenerateReportsModal from '@/components/GenerateReportsModal';
import ReportViewModal from '@/components/ReportViewModal';
import { useToast } from '@/hooks/use-toast';

const reportData = [
  { id: 'monthly-sales', title: "Monthly Sales Report", description: "Comprehensive sales analysis for the current month", type: "Financial" },
  { id: 'invoice', title: "Invoice Report", description: "Outstanding invoices and payment status", type: "Financial" },
  { id: 'inventory', title: "Inventory Report", description: "Current stock levels and low inventory alerts", type: "Inventory" },
];

export default function Reports() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'monthly-sales' | 'inventory' | 'invoice'>('monthly-sales');
  const { 
    sales, 
    inventory, 
    customers, 
    loading, 
    error, 
    isAuthenticated, 
    calculateKPIs 
  } = useFirebaseReports();
  const { toast } = useToast();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to view reports and analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    toast({
      title: "Error loading data",
      description: error,
      variant: "destructive",
    });
  }

  const kpis = calculateKPIs;

  const formatCurrency = (amount: number) => `RS ${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  const quickStats = [
    { 
      label: "Total Sales (MTD)", 
      value: formatCurrency(kpis.totalSalesMTD), 
      change: formatPercentage(kpis.salesChange), 
      trend: kpis.salesChange >= 0 ? "up" : "down",
      description: "Sum of invoice totals this month"
    },
    { 
      label: "Outstanding Amount", 
      value: formatCurrency(kpis.outstandingAmount), 
      change: "Live data", 
      trend: "up",
      description: "Sum of unpaid and partial invoices"
    },
    { 
      label: "Inventory Value", 
      value: formatCurrency(kpis.inventoryValue), 
      change: "Live data", 
      trend: "up",
      description: "Total inventory quantity × cost price"
    },
    { 
      label: "Active Customers", 
      value: kpis.activeCustomers.toString(), 
      change: "Live data", 
      trend: "up",
      description: "Count of customers where isActive = true"
    },
  ];
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Reports & Analytics</h1>
              <p className="text-muted-foreground">Business insights and financial reports</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (sales.length === 0 && inventory.length === 0 && customers.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Reports & Analytics</h1>
              <p className="text-muted-foreground">Business insights and financial reports</p>
            </div>
            <Button onClick={() => setShowGenerateModal(true)} className="mt-4 sm:mt-0">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No data yet. Add sales, inventory, and customers to generate meaningful reports.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Reports & Analytics</h1>
            <p className="text-muted-foreground">Business insights and financial reports</p>
          </div>
          <Button onClick={() => setShowGenerateModal(true)} className="mt-4 sm:mt-0">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                {stat.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                  {stat.change}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Financial Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Financial Overview
              </CardTitle>
              <CardDescription>Key financial metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Monthly Revenue</p>
                    <p className="text-sm text-muted-foreground">Current month earnings</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatCurrency(kpis.totalSalesMTD)}</p>
                    <p className="text-sm text-green-600">{formatPercentage(kpis.salesChange)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Outstanding Balance</p>
                    <p className="text-sm text-muted-foreground">Total amount due</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-destructive">{formatCurrency(kpis.outstandingAmount)}</p>
                    <p className="text-sm text-muted-foreground">Live data</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Profit Margin</p>
                    <p className="text-sm text-muted-foreground">Current month margin</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{kpis.profitMargin.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Live calculation</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Business Metrics
              </CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Active Customers</p>
                    <p className="text-sm text-muted-foreground">Total customer base</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{kpis.activeCustomers}</p>
                    <p className="text-sm text-muted-foreground">Live data</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Orders Processed</p>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{sales.filter(sale => {
                      const saleDate = new Date(sale.date);
                      const now = new Date();
                      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
                    }).length}</p>
                    <p className="text-sm text-muted-foreground">Live data</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Low Stock Items</p>
                    <p className="text-sm text-muted-foreground">Items with ≤ 5 quantity</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{inventory.filter(item => item.quantity <= 5).length}</p>
                    <p className="text-sm text-muted-foreground">Live data</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Available Reports</CardTitle>
            <CardDescription>Generate and download comprehensive business reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.map((report, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{report.title}</h3>
                      <Badge variant="outline">{report.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{report.description}</p>
                    <p className="text-xs text-muted-foreground">Status: Available</p>
                  </div>
                   <div className="flex gap-2 mt-4 sm:mt-0">
                     <Button 
                       variant="outline" 
                       size="sm"
                       onClick={() => {
                         setSelectedReportType(report.id as any);
                         setShowViewModal(true);
                       }}
                     >
                       <Eye className="h-4 w-4 mr-2" />
                       View
                     </Button>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <GenerateReportsModal 
          open={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          sales={sales}
          inventory={inventory}
          customers={customers}
        />

        <ReportViewModal
          open={showViewModal}
          onClose={() => setShowViewModal(false)}
          reportType={selectedReportType}
          sales={sales}
          inventory={inventory}
          customers={customers}
        />
      </div>
    </div>
  );
}