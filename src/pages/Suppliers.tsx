import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Package, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddSupplierModal } from "@/components/AddSupplierModal";
import SupplierOrdersModal from "@/components/SupplierOrdersModal";
import EditSupplierModal from "@/components/EditSupplierModal";
import PendingBillsModal from "@/components/PendingBillsModal";
import { ref, onValue, orderByChild, query, update, serverTimestamp, push } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { format, isAfter } from "date-fns";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [combinedBills, setCombinedBills] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeSuppliers = fetchSuppliers();
    const unsubscribeBills = fetchBills();
    const unsubscribeInvoices = fetchInvoices();
    
    return () => {
      if (unsubscribeSuppliers) unsubscribeSuppliers();
      if (unsubscribeBills) unsubscribeBills();
      if (unsubscribeInvoices) unsubscribeInvoices();
    };
  }, []);

  useEffect(() => {
    // Join suppliers with their latest unpaid invoices
    if (suppliers.length >= 0 && invoices.length >= 0) {
      const suppliersWithInvoices = suppliers.map(supplier => {
        // Find all unpaid invoices for this supplier
        const supplierInvoices = invoices.filter(invoice => 
          invoice.supplierId === supplier.id && 
          (invoice.status === 'Unpaid' || invoice.status === 'Partially Paid')
        );

        // Get the latest unpaid invoice (by due date, then by invoice date)
        let latestInvoice = null;
        if (supplierInvoices.length > 0) {
          latestInvoice = supplierInvoices.sort((a, b) => {
            if (a.dueDate && b.dueDate) {
              const dateCompare = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
              if (dateCompare !== 0) return dateCompare;
            }
            if (a.invoiceDate && b.invoiceDate) {
              return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
            }
            return 0;
          })[0];
        }

        return {
          ...supplier,
          latestInvoice,
          hasUnpaidInvoices: supplierInvoices.length > 0
        };
      });

      // Sort suppliers by nearest due date first (those with invoices first)
      suppliersWithInvoices.sort((a, b) => {
        // Suppliers with unpaid invoices come first
        if (a.hasUnpaidInvoices && !b.hasUnpaidInvoices) return -1;
        if (!a.hasUnpaidInvoices && b.hasUnpaidInvoices) return 1;

        // If both have invoices, sort by due date
        if (a.latestInvoice?.dueDate && b.latestInvoice?.dueDate) {
          const aOverdue = isAfter(new Date(), new Date(a.latestInvoice.dueDate));
          const bOverdue = isAfter(new Date(), new Date(b.latestInvoice.dueDate));
          
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          
          return new Date(a.latestInvoice.dueDate).getTime() - new Date(b.latestInvoice.dueDate).getTime();
        }

        return 0;
      });

      setCombinedBills(suppliersWithInvoices);
    } else {
      setCombinedBills([]);
    }
  }, [suppliers, invoices]);

  const fetchSuppliers = () => {
    console.log('Fetching suppliers...');
    const suppliersRef = ref(realtimeDb, 'suppliers');
    const suppliersQuery = query(suppliersRef, orderByChild('createdAt'));
    
    const unsubscribe = onValue(suppliersQuery, (snapshot) => {
      console.log('Raw snapshot JSON:', JSON.stringify(snapshot.val(), null, 2));
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const suppliersList = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        }));
        
        console.log('Suppliers updated:', suppliersList);
        console.log('Total suppliers:', suppliersList.length);
        setSuppliers(suppliersList);
      } else {
        console.log('Suppliers updated: []');
        setSuppliers([]);
      }
    }, (error) => {
      console.error('Error fetching suppliers from Firebase:', error);
      toast({
        title: "Error",
        description: "Failed to fetch suppliers",
        variant: "destructive",
      });
    });

    return unsubscribe;
  };

  const fetchBills = () => {
    try {
      const billsRef = ref(realtimeDb, 'bills');
      const billsQuery = query(billsRef, orderByChild('status'));
      
      const unsubscribe = onValue(billsQuery, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const billsList = Object.entries(data).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
          })).filter(bill => bill.status === 'Unpaid' || bill.status === 'Partially Paid');
          setBills(billsList);
        } else {
          setBills([]);
        }
      }, (error) => {
        console.warn("Bills fetch error:", error.message);
        // Set empty bills array so suppliers can still render
        setBills([]);
      });

      return unsubscribe;
    } catch (error: any) {
      console.warn("Bills fetch error:", error.message);
      setBills([]);
      return () => {}; // Return empty unsubscribe function
    }
  };

  const fetchInvoices = () => {
    try {
      const invoicesRef = ref(realtimeDb, 'invoices');
      const invoicesQuery = query(invoicesRef, orderByChild('status'));
      
      const unsubscribe = onValue(invoicesQuery, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const invoicesList = Object.entries(data).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
          })).filter(invoice => invoice.status === 'Unpaid' || invoice.status === 'Partially Paid');
          
          console.log('Invoices updated:', invoicesList);
          setInvoices(invoicesList);
        } else {
          console.log('Invoices updated: []');
          setInvoices([]);
        }
      }, (error) => {
        console.warn("Invoices fetch error:", error.message);
        // Set empty invoices array so suppliers can still render
        setInvoices([]);
      });

      return unsubscribe;
    } catch (error: any) {
      console.warn("Invoices fetch error:", error.message);
      setInvoices([]);
      return () => {}; // Return empty unsubscribe function
    }
  };

  const markBillAsPaid = async (billId: string, amount: number) => {
    try {
      const billRef = ref(realtimeDb, `bills/${billId}`);
      await update(billRef, {
        status: 'Paid',
        paid: amount,
        balance: 0,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Bill marked as paid successfully",
      });
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      toast({
        title: "Error",
        description: "Failed to mark bill as paid",
        variant: "destructive",
      });
    }
  };

  const markInvoiceAsPaid = async (invoiceId: string, amount: number) => {
    try {
      const invoiceRef = ref(realtimeDb, `invoices/${invoiceId}`);
      await update(invoiceRef, {
        status: 'Paid',
        paid: amount,
        balance: 0,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Invoice marked as paid successfully",
      });
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast({
        title: "Error",
        description: "Failed to mark invoice as paid",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = (supplier: any) => {
    const supplierInvoices = invoices.filter(inv => inv.supplierId === supplier.id);
    if (supplierInvoices.length === 1) {
      navigate(`/billing/${supplierInvoices[0].id}`);
    } else if (supplierInvoices.length > 1) {
      navigate(`/billing?supplierId=${supplier.id}`);
    }
  };

  const isOverdue = (dueDate: string | null, balance: number) => {
    if (!dueDate || balance <= 0) return false;
    return isAfter(new Date(), new Date(dueDate));
  };

  
  const totalSuppliers = suppliers.length;
  const totalActiveOrders = 0; // Will be calculated from actual orders data
  const totalProcurement = combinedBills.reduce((sum, supplier) => {
    const invoiceAmount = supplier.latestInvoice?.amount || 0;
    return sum + invoiceAmount;
  }, 0);
  const pendingBills = combinedBills.filter(supplier => supplier.hasUnpaidInvoices).length;
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Supplier Management</h1>
            <p className="text-muted-foreground">Manage your fabric suppliers and procurement</p>
          </div>
          <Button className="mt-4 sm:mt-0" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSuppliers}</div>
              <p className="text-xs text-muted-foreground">+2 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActiveOrders}</div>
              <p className="text-xs text-muted-foreground">+12 from last week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Procurement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalProcurement.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+8.2% from last month</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setShowBillsModal(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBills}</div>
              <p className="text-xs text-muted-foreground">3 due this week</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suppliers</CardTitle>
            <CardDescription>Suppliers with their latest unpaid invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {combinedBills.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">No suppliers found</p>
                  <p className="text-muted-foreground text-sm">Add suppliers to get started!</p>
                </div>
              ) : (
                combinedBills.map((supplier) => {
                  const invoice = supplier.latestInvoice;
                  const overdue = invoice?.dueDate && isAfter(new Date(), new Date(invoice.dueDate));
                  return (
                    <div
                      key={supplier.id}
                      className="border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleCardClick(supplier)}
                     >
                       <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {supplier.name}
                            </h3>
                            {overdue && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Invoice #:</span>
                              <span>{invoice?.invoiceNumber || '—'}</span>
                            </div>
                            
                            {invoice?.dueDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Due Date:</span>
                                <span className={overdue ? "text-destructive font-medium" : ""}>
                                  {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                            )}
                            
                            {invoice?.amount && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Amount:</span>
                                <span className="font-semibold text-primary">
                                  ${(invoice.balance || invoice.amount || 0).toLocaleString()}
                                </span>
                              </div>
                            )}
                            
                            {invoice?.description && (
                              <div className="mt-2">
                                <span className="font-medium">Description:</span>
                                <p className="text-muted-foreground mt-1">{invoice.description}</p>
                              </div>
                            )}
                            
                            {!invoice && (
                              <div className="text-muted-foreground">
                                <span>No unpaid invoices</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {invoice && (
                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markInvoiceAsPaid(invoice.id, invoice.amount || 0);
                              }}
                              className="whitespace-nowrap"
                            >
                              Mark as Paid
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <AddSupplierModal 
          open={showAddModal} 
          onOpenChange={setShowAddModal}
          onSupplierAdded={() => {
            console.log('Supplier added callback triggered');
          }}
        />
        
        <SupplierOrdersModal
          open={showOrdersModal}
          onOpenChange={setShowOrdersModal}
          supplier={selectedSupplier}
          orders={[]}
        />
        
        <EditSupplierModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          supplier={selectedSupplier}
          onSupplierUpdated={() => {}}
        />
        
        <PendingBillsModal
          open={showBillsModal}
          onOpenChange={setShowBillsModal}
          bills={combinedBills}
        />
      </div>
    </div>
  );
}