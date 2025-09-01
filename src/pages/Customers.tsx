import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { Plus, Users, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";

const customers = [
  { id: 1, name: "Fashion House Ltd", contact: "Emma Davis", email: "emma@fashionhouse.com", status: "Active", outstanding: "$12,450", lastOrder: "2024-01-15" },
  { id: 2, name: "Designer Boutique", contact: "James Brown", email: "james@boutique.com", status: "Active", outstanding: "$8,320", lastOrder: "2024-01-14" },
  { id: 3, name: "Retail Chain Co", contact: "Lisa Anderson", email: "lisa@retailchain.com", status: "Overdue", outstanding: "$25,670", lastOrder: "2024-01-10" },
];

export default function Customers() {
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Customer Management</h1>
            <p className="text-muted-foreground">Manage customer accounts and outstanding balances</p>
          </div>
          <Button 
            className="mt-4 sm:mt-0"
            onClick={() => setShowCustomerModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">+8 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">$46,440</div>
              <p className="text-xs text-muted-foreground">-12% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Accounts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">12</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$184,320</div>
              <p className="text-xs text-muted-foreground">+15.3% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Customers List */}
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Manage your customer accounts and track outstanding balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                      <Badge variant={customer.status === "Active" ? "default" : "destructive"}>
                        {customer.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Contact: {customer.contact}</p>
                      <p>Email: {customer.email}</p>
                      <p>Last Order: {customer.lastOrder}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${customer.status === "Overdue" ? "text-destructive" : "text-primary"}`}>
                        {customer.outstanding}
                      </div>
                      <div className="text-xs text-muted-foreground">Outstanding</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Invoice</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add Customer Modal */}
        <AddCustomerModal 
          open={showCustomerModal} 
          onOpenChange={setShowCustomerModal} 
        />
      </div>
    </div>
  );
}