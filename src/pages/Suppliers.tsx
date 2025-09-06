import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Package, TrendingUp, Calendar, DollarSign, Eye, Edit, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddSupplierModal } from "@/components/AddSupplierModal";
import { SupplierOrdersDrawer } from "@/components/SupplierOrdersDrawer";
import { SupplierEditModal } from "@/components/SupplierEditModal";
import SupplierOrdersModal from "@/components/SupplierOrdersModal";
import EditSupplierModal from "@/components/EditSupplierModal";
import PendingBillsModal from "@/components/PendingBillsModal";
import { ref, onValue, orderByChild, query, update, serverTimestamp, push, remove, get, equalTo } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { format, isAfter } from "date-fns";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [combinedBills, setCombinedBills] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewEditModal, setShowNewEditModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeSuppliers = fetchSuppliers();
    const unsubscribeBills = fetchBills();
    const unsubscribeInvoices = fetchInvoices();
    const unsubscribeOrders = fetchOrders();
    
    return () => {
      if (unsubscribeSuppliers) unsubscribeSuppliers();
      if (unsubscribeBills) unsubscribeBills();
      if (unsubscribeInvoices) unsubscribeInvoices();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, []);

  useEffect(() => {
    // Join suppliers with their invoice metrics
    if (suppliers.length >= 0 && invoices.length >= 0) {
      const suppliersWithMetrics = suppliers.map(supplier => {
        // Find all invoices for this supplier
        const supplierInvoices = invoices.filter(invoice => 
          invoice.supplierId === supplier.id
        );

        // Calculate metrics
        const ordersCount = supplierInvoices.length;
        const totalValue = supplierInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

        // Find latest unpaid invoice for sorting purposes
        const unpaidInvoices = supplierInvoices.filter(invoice => 
          invoice.status === 'Pending' || invoice.status === 'Unpaid' || invoice.status === 'Partially Paid'
        );

        // Get the latest invoice (most recent by created date)
        let latestInvoice = null;
        if (supplierInvoices.length > 0) {
          latestInvoice = supplierInvoices.sort((a, b) => {
            const aDate = new Date(a.createdAt || 0).getTime();
            const bDate = new Date(b.createdAt || 0).getTime();
            return bDate - aDate; // Most recent first
          })[0];
        }

        return {
          ...supplier,
          ordersCount,
          totalValue,
          latestInvoice,
          hasUnpaidInvoices: unpaidInvoices.length > 0,
          pendingInvoicesCount: supplierInvoices.filter(inv => inv.status === 'Pending').length
        };
      });

      // Sort suppliers by name
      suppliersWithMetrics.sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '');
      });

      setCombinedBills(suppliersWithMetrics);
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
      const invoicesQuery = query(invoicesRef, orderByChild('supplierId'));
      
      const unsubscribe = onValue(invoicesQuery, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const invoicesList = Object.entries(data).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
          }));
          
          console.log('All invoices updated:', invoicesList);
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

  const fetchOrders = () => {
    try {
      const ordersRef = ref(realtimeDb, 'purchaseOrders');
      const ordersQuery = query(ordersRef, orderByChild('status'));
      
      const unsubscribe = onValue(ordersQuery, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const ordersList = Object.entries(data).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
          }));
          setOrders(ordersList);
        } else {
          setOrders([]);
        }
      }, (error) => {
        console.warn("Orders fetch error:", error.message);
        setOrders([]);
      });

      return unsubscribe;
    } catch (error: any) {
      console.warn("Orders fetch error:", error.message);
      setOrders([]);
      return () => {};
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

  
  const updateInvoiceStatus = async (invoiceId: string, newStatus: string, amount: number) => {
    try {
      const invoiceRef = ref(realtimeDb, `invoices/${invoiceId}`);
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // Set balance based on status
      if (newStatus === 'Pending') {
        updateData.balance = amount;
        updateData.paid = 0;
      } else if (newStatus === 'Paid') {
        updateData.balance = 0;
        updateData.paid = amount;
      }

      await update(invoiceRef, updateData);

      toast({
        title: "Success",
        description: `Invoice marked as ${newStatus}. KPIs updated.`,
      });
    } catch (error: any) {
      console.error('Error updating invoice status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
    }
  };

  const totalSuppliers = suppliers.length;
  const activeOrders = orders.filter(order => !["Completed", "Cancelled"].includes(order.status)).length;
  const totalProcurement = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const pendingBills = invoices.filter(invoice => invoice.status === 'Pending').length;

  const handleViewOrders = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowOrdersDrawer(true);
  };

  const handleEditSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowNewEditModal(true);
  };

  const handlePendingBillsClick = () => {
    navigate('/billing?status=unpaid');
  };

  const deleteSupplier = async (supplierId: string, supplierName: string) => {
    if (!confirm(`Are you sure you want to delete "${supplierName}" and all related invoices?`)) {
      return;
    }

    try {
      // Delete all invoices for this supplier
      const invoicesRef = ref(realtimeDb, 'invoices');
      const invoicesQuery = query(invoicesRef, orderByChild('supplierId'), equalTo(supplierId));
      const invoicesSnapshot = await get(invoicesQuery);
      
      if (invoicesSnapshot.exists()) {
        const deletePromises = Object.keys(invoicesSnapshot.val()).map(invoiceId => 
          remove(ref(realtimeDb, `invoices/${invoiceId}`))
        );
        await Promise.all(deletePromises);
      }

      // Delete the supplier
      await remove(ref(realtimeDb, `suppliers/${supplierId}`));

      toast({
        title: "Success",
        description: `Supplier "${supplierName}" and all related invoices deleted successfully`,
      });
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier",
        variant: "destructive",
      });
    }
  };

  const deduplicateSuppliers = async () => {
    if (!confirm('This will remove duplicate suppliers and merge their invoices. Continue?')) {
      return;
    }

    try {
      const suppliersRef = ref(realtimeDb, 'suppliers');
      const snapshot = await get(suppliersRef);
      
      if (!snapshot.exists()) return;

      const suppliers = snapshot.val();
      const suppliersByNameLower: Record<string, any[]> = {};

      // Group suppliers by nameLower
      Object.entries(suppliers).forEach(([id, supplier]: [string, any]) => {
        const nameLower = supplier.nameLower || supplier.name?.toLowerCase() || '';
        if (!suppliersByNameLower[nameLower]) {
          suppliersByNameLower[nameLower] = [];
        }
        suppliersByNameLower[nameLower].push({ id, ...supplier });
      });

      // Process duplicates
      for (const [nameLower, duplicates] of Object.entries(suppliersByNameLower)) {
        if (duplicates.length > 1) {
          // Keep the most recently updated
          const keeper = duplicates.sort((a, b) => 
            new Date(b.updatedAt || b.createdAt || 0).getTime() - 
            new Date(a.updatedAt || a.createdAt || 0).getTime()
          )[0];

          const toDelete = duplicates.filter(s => s.id !== keeper.id);

          for (const duplicate of toDelete) {
            // Reassign invoices to keeper
            const invoicesRef = ref(realtimeDb, 'invoices');
            const invoicesQuery = query(invoicesRef, orderByChild('supplierId'), equalTo(duplicate.id));
            const invoicesSnapshot = await get(invoicesQuery);
            
            if (invoicesSnapshot.exists()) {
              const updatePromises = Object.entries(invoicesSnapshot.val()).map(([invoiceId, invoice]: [string, any]) => 
                update(ref(realtimeDb, `invoices/${invoiceId}`), {
                  supplierId: keeper.id,
                  supplierName: keeper.name
                })
              );
              await Promise.all(updatePromises);
            }

            // Delete duplicate supplier
            await remove(ref(realtimeDb, `suppliers/${duplicate.id}`));
          }
        }
      }

      toast({
        title: "Success",
        description: "Duplicate suppliers have been merged successfully",
      });
    } catch (error: any) {
      console.error('Error deduplicating suppliers:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deduplicate suppliers",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Supplier Management</h1>
            <p className="text-muted-foreground">Manage your fabric suppliers and procurement</p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button variant="outline" onClick={deduplicateSuppliers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Deduplicate
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
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
              <div className="text-2xl font-bold">{activeOrders}</div>
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
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={handlePendingBillsClick}>
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
            <CardDescription>A list of all your fabric suppliers</CardDescription>
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
                  const getStatusVariant = (status: string) => {
                    switch (status?.toLowerCase()) {
                      case 'active': return 'default';
                      case 'pending': return 'secondary';
                      case 'inactive': return 'outline';
                      default: return 'default';
                    }
                  };

                  const getStatusColor = (status: string) => {
                    switch (status?.toLowerCase()) {
                      case 'active': return 'bg-orange-500 text-white';
                      case 'pending': return 'bg-gray-500 text-white';
                      case 'inactive': return 'bg-gray-300 text-gray-700';
                      default: return 'bg-orange-500 text-white';
                    }
                  };

                  return (
                    <div
                      key={supplier.id}
                      className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        {/* Left side - Supplier info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {supplier.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.status || 'Active')}`}>
                              {supplier.status || 'Active'}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>
                              <span className="font-medium">Contact:</span> {supplier.contactPerson || supplier.contact || 'John Smith'}
                            </div>
                            <div>
                              <span className="font-medium">Phone:</span> {supplier.phoneNumber || supplier.phone || '+1 234-567-8901'}
                            </div>
                          </div>
                        </div>

                        {/* Right side - Metrics and Actions */}
                        <div className="flex items-center gap-8">
                          {/* Orders Metric */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {supplier.ordersCount || 0}
                            </div>
                            <div className="text-sm text-gray-500">Orders</div>
                          </div>
                          
                          {/* Total Value Metric */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-orange-500">
                              ${(supplier.totalValue || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">Total Value</div>
                          </div>

                          {/* Latest Invoice Status */}
                          {supplier.latestInvoice && (
                            <div className="text-right">
                              <div className="text-sm text-gray-500 mb-1">Latest Invoice</div>
                              <Select 
                                value={supplier.latestInvoice.status || 'Pending'} 
                                onValueChange={(newStatus) => updateInvoiceStatus(
                                  supplier.latestInvoice.id, 
                                  newStatus, 
                                  supplier.latestInvoice.amount
                                )}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs bg-white border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                                  <SelectItem value="Pending" className="text-xs hover:bg-gray-100">Pending</SelectItem>
                                  <SelectItem value="Paid" className="text-xs hover:bg-gray-100">Paid</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/suppliers/${supplier.id}/orders`)}
                              className="whitespace-nowrap border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              View
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSupplier(supplier)}
                              className="whitespace-nowrap border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => deleteSupplier(supplier.id, supplier.name)}
                              className="whitespace-nowrap border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
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