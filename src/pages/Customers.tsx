import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { CustomerCard } from "@/components/CustomerCard";
import { InvoicePreviewModal } from "@/components/InvoicePreviewModal";
import { useInvoiceFromOrders } from "@/hooks/useInvoiceFromOrders";
import { Plus, Users, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";

const customers = [
  { id: 1, name: "Fashion House Ltd", contact: "Emma Davis", email: "emma@fashionhouse.com", status: "Active", outstanding: "$12,450", lastOrder: "2024-01-15" },
  { id: 2, name: "Designer Boutique", contact: "James Brown", email: "james@boutique.com", status: "Active", outstanding: "$8,320", lastOrder: "2024-01-14" },
  { id: 3, name: "Retail Chain Co", contact: "Lisa Anderson", email: "lisa@retailchain.com", status: "Overdue", outstanding: "$25,670", lastOrder: "2024-01-10" },
];

export default function Customers() {
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<number | null>(null);
  
  const { 
    loading, 
    aggregatedItems, 
    fetchEligibleOrders, 
    createInvoice 
  } = useInvoiceFromOrders();

  const handleInvoiceClick = async (customerId: number, customerName: string) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerName(customerName);
    setCreatedInvoiceNumber(null);
    await fetchEligibleOrders(customerId);
    setShowInvoiceModal(true);
  };

  const handleConfirmInvoice = async () => {
    if (selectedCustomerId && selectedCustomerName) {
      const invoiceNumber = await createInvoice(selectedCustomerId, selectedCustomerName);
      if (invoiceNumber) {
        setCreatedInvoiceNumber(invoiceNumber);
        // Keep modal open to show the created invoice with PDF option
      }
    }
  };

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
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onInvoiceClick={handleInvoiceClick}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add Customer Modal */}
        <AddCustomerModal 
          open={showCustomerModal} 
          onOpenChange={setShowCustomerModal} 
        />

        {/* Invoice Preview Modal */}
        <InvoicePreviewModal
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          customerId={selectedCustomerId || 0}
          customerName={selectedCustomerName}
          items={aggregatedItems}
          invoiceNumber={createdInvoiceNumber || undefined}
          onConfirm={handleConfirmInvoice}
          showConfirmButton={!createdInvoiceNumber}
        />
      </div>
    </div>
  );
}