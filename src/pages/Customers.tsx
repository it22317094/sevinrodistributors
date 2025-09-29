import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { CustomerCard } from "@/components/CustomerCard";
import { InvoicePreviewModal } from "@/components/InvoicePreviewModal";
import { useInvoiceFromOrders } from "@/hooks/useInvoiceFromOrders";
import { useFirebaseCustomers } from "@/hooks/useFirebaseCustomers";
import { Plus, Users, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";

export default function Customers() {
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<number | null>(null);
  
  const { customers, loading: customersLoading, fetchCustomers } = useFirebaseCustomers();

  // Calculate real-time statistics from Firebase data
  const totalCustomers = customers.length;
  const totalOutstanding = customers.reduce((sum, customer) => sum + customer.outstanding, 0);
  const overdueAccounts = customers.filter(customer => customer.status === 'Overdue').length;
  const activeCustomers = customers.filter(customer => customer.status === 'Active').length;
  const { 
    loading, 
    aggregatedItems, 
    fetchEligibleOrders, 
    createInvoice 
  } = useInvoiceFromOrders();

  const handleInvoiceClick = async (customerId: string, customerName: string) => {
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

        {/* Outstanding Balance Summary */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-medium">Total Outstanding Balance</CardTitle>
            <CardDescription>
              {totalCustomers} customers • {overdueAccounts} overdue • {activeCustomers} active
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className={`text-4xl font-bold mb-2 ${totalOutstanding > 0 ? 'text-destructive' : 'text-primary'}`}>
              Rs. {totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground">
              {totalOutstanding > 0 ? 'Total amount pending collection' : 'All balances cleared'}
            </p>
          </CardContent>
        </Card>

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
          onCustomerAdded={fetchCustomers}
        />

        {/* Invoice Preview Modal */}
        <InvoicePreviewModal
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          customerId={selectedCustomerId || ""}
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