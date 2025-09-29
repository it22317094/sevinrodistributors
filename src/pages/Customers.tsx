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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground">Registered customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
              <p className="text-xs text-muted-foreground">Active customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Accounts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueAccounts}</div>
              <p className="text-xs text-muted-foreground">Overdue payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {customers.filter(c => c.outstanding > 0).length > 0 ? (
                  <>
                    <div className="text-xs text-muted-foreground">
                      {customers
                        .filter(c => c.outstanding > 0)
                        .map(c => c.name)
                        .join(' + ')} = 
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      Rs. {totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-green-600">Rs. 0.00</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {customers.filter(c => c.outstanding > 0).length} accounts with balance
              </p>
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