import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Package, FileText, Truck, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const stats = [
    { title: 'Total Revenue', value: '₹12,45,000', icon: DollarSign, change: '+12%' },
    { title: 'Active Suppliers', value: '24', icon: Users, change: '+3' },
    { title: 'Total Customers', value: '156', icon: Users, change: '+8' },
    { title: 'Inventory Items', value: '2,340', icon: Package, change: '+45' },
    { title: 'Pending Invoices', value: '18', icon: FileText, change: '-2' },
    { title: 'Active Deliveries', value: '12', icon: Truck, change: '+5' }
  ];

  const recentActivity = [
    { type: 'New Order', description: 'Order #1234 from ABC Textiles', amount: '₹25,000', time: '2 hours ago' },
    { type: 'Payment Received', description: 'Invoice #5678 paid by XYZ Fashion', amount: '₹18,500', time: '4 hours ago' },
    { type: 'Stock Alert', description: 'Cotton fabric running low', amount: '', time: '6 hours ago' },
    { type: 'New Customer', description: 'Fashion Hub registered', amount: '', time: '1 day ago' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user?.name || user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Administrator</Badge>
              <Button variant="outline" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-green-600 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {stat.change}
                    </p>
                  </div>
                  <stat.icon className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your textile business operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Manage Suppliers
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Manage Customers
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Inventory Management
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Truck className="w-4 h-4 mr-2" />
                Schedule Delivery
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across your business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{activity.type}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                    {activity.amount && (
                      <Badge variant="secondary">{activity.amount}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}