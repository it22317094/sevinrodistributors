import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, DollarSign, Clock, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  const outstandingBalance = 45000;
  const pendingInvoices = 3;
  const totalOrders = 12;

  const recentInvoices = [
    { id: 'INV-001', amount: 15000, status: 'paid', date: '2024-01-15' },
    { id: 'INV-002', amount: 22000, status: 'pending', date: '2024-01-10' },
    { id: 'INV-003', amount: 8000, status: 'overdue', date: '2024-01-05' }
  ];

  const handleInvoiceRequest = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Invoice request sent",
      description: "Your invoice request has been sent to the admin for processing.",
    });
    setShowInvoiceForm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Customer Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {user?.name || user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Customer</Badge>
              <Button variant="outline" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Account Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-red-600">₹{outstandingBalance.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
                  <p className="text-2xl font-bold">{pendingInvoices}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{totalOrders}</p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Invoice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Request Invoice
                <Button onClick={() => setShowInvoiceForm(!showInvoiceForm)} size="sm">
                  <Send className="w-4 h-4 mr-2" />
                  {showInvoiceForm ? 'Cancel' : 'New Request'}
                </Button>
              </CardTitle>
              <CardDescription>Submit a request for invoice generation</CardDescription>
            </CardHeader>
            <CardContent>
              {showInvoiceForm ? (
                <form onSubmit={handleInvoiceRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderDetails">Order Details</Label>
                    <Textarea 
                      id="orderDetails" 
                      placeholder="Describe your order requirements (fabric type, quantity, specifications)"
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimatedAmount">Estimated Amount</Label>
                      <Input id="estimatedAmount" type="number" placeholder="₹0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate">Delivery Date</Label>
                      <Input id="deliveryDate" type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalNotes">Additional Notes</Label>
                    <Textarea id="additionalNotes" placeholder="Any special requirements or notes" />
                  </div>
                  <Button type="submit" className="w-full">Send Invoice Request</Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <Send className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click "New Request" to submit an invoice request</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Your recent invoice history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{invoice.id}</p>
                      <p className="text-sm text-muted-foreground">Date: {invoice.date}</p>
                      <p className="text-sm font-medium">₹{invoice.amount.toLocaleString()}</p>
                    </div>
                    <Badge 
                      variant={
                        invoice.status === 'paid' ? 'default' : 
                        invoice.status === 'pending' ? 'secondary' : 
                        'destructive'
                      }
                      className={
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'pending' ? '' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {invoice.status}
                    </Badge>
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