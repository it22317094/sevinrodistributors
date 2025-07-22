import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Download,
  Calendar,
  Users,
  Package
} from "lucide-react";

const reportData = [
  { title: "Monthly Sales Report", description: "Comprehensive sales analysis for the current month", lastGenerated: "Today", type: "Financial" },
  { title: "Outstanding Balances", description: "Customer outstanding amounts and aging analysis", lastGenerated: "Yesterday", type: "Financial" },
  { title: "Inventory Report", description: "Current stock levels and low inventory alerts", lastGenerated: "2 days ago", type: "Inventory" },
  { title: "Supplier Performance", description: "Supplier delivery times and quality metrics", lastGenerated: "1 week ago", type: "Supplier" },
];

const quickStats = [
  { label: "Total Sales (MTD)", value: "$184,320", change: "+15.3%", trend: "up" },
  { label: "Outstanding Amount", value: "$46,440", change: "-12%", trend: "down" },
  { label: "Inventory Value", value: "$145,890", change: "+5.2%", trend: "up" },
  { label: "Active Customers", value: "156", change: "+8", trend: "up" },
];

export default function Reports() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Reports & Analytics</h1>
            <p className="text-muted-foreground">Business insights and financial reports</p>
          </div>
          <Button className="mt-4 sm:mt-0">
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
                  {stat.change} from last month
                </p>
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
                    <p className="text-lg font-bold text-primary">$184,320</p>
                    <p className="text-sm text-green-600">+15.3%</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Outstanding Balance</p>
                    <p className="text-sm text-muted-foreground">Total amount due</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-destructive">$46,440</p>
                    <p className="text-sm text-green-600">-12%</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Profit Margin</p>
                    <p className="text-sm text-muted-foreground">Current month margin</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">24.5%</p>
                    <p className="text-sm text-green-600">+2.1%</p>
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
                    <p className="text-lg font-bold text-primary">156</p>
                    <p className="text-sm text-green-600">+8 new</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Orders Processed</p>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">247</p>
                    <p className="text-sm text-green-600">+12%</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Delivery Success Rate</p>
                    <p className="text-sm text-muted-foreground">On-time deliveries</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">96.5%</p>
                    <p className="text-sm text-green-600">+1.2%</p>
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
                    <p className="text-xs text-muted-foreground">Last generated: {report.lastGenerated}</p>
                  </div>
                  <div className="flex gap-2 mt-4 sm:mt-0">
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}