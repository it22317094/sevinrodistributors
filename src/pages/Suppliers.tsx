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
import { ref, onValue, orderByChild, query, update, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { format, isAfter } from "date-fns";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
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
    
    return () => {
      if (unsubscribeSuppliers) unsubscribeSuppliers();
      if (unsubscribeBills) unsubscribeBills();
    };
  }, []);

  useEffect(() => {
    // Combine suppliers and bills data
    if (suppliers.length >= 0 && bills.length >= 0) {
      const combined = bills.map(bill => {
        const supplier = suppliers.find(s => s.id === bill.supplierId);
        return {
          ...bill,
          supplierName: supplier?.name || bill.supplierName || 'Unknown Supplier',
          supplierData: supplier
        };
      });

      // Sort by nearest due date first (overdue at top), then newest invoice date
      combined.sort((a, b) => {
        const aOverdue = a.dueDate && isAfter(new Date(), new Date(a.dueDate));
        const bOverdue = b.dueDate && isAfter(new Date(), new Date(b.dueDate));
        
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        if (a.dueDate && b.dueDate) {
          const dateCompare = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          if (dateCompare !== 0) return dateCompare;
        }
        
        // Then sort by newest invoice date
        if (a.invoiceDate && b.invoiceDate) {
          return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
        }
        
        return 0;
      });

      setCombinedBills(combined);
    } else {
      setCombinedBills([]);
    }
  }, [suppliers, bills]);

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
      console.error('Error fetching bills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bills",
        variant: "destructive",
      });
    });

    return unsubscribe;
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

  const handleCardClick = (bill: any) => {
    const supplierBills = combinedBills.filter(b => b.supplierId === bill.supplierId);
    if (supplierBills.length === 1) {
      navigate(`/billing/${bill.id}`);
    } else {
      navigate(`/billing?supplierId=${bill.supplierId}`);
    }
  };

  const isOverdue = (dueDate: string | null, balance: number) => {
    if (!dueDate || balance <= 0) return false;
    return isAfter(new Date(), new Date(dueDate));
  };

  const totalSuppliers = suppliers.length;
  const totalActiveOrders = 0; // Will be calculated from actual orders data
  const totalProcurement = combinedBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const pendingBills = combinedBills.length;
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

        {/* Bills List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Bills</CardTitle>
            <CardDescription>Bills requiring payment from suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {combinedBills.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">No pending bills found</p>
                  <p className="text-muted-foreground text-sm">All bills are up to date!</p>
                </div>
              ) : (
                combinedBills.map((bill) => {
                  const overdue = isOverdue(bill.dueDate, bill.balance || bill.amount);
                  return (
                    <div
                      key={bill.id}
                      className="border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleCardClick(bill)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              Bill #{bill.billNumber || bill.id || '—'}
                            </h3>
                            {overdue && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Supplier:</span>
                              <span>{bill.supplierName}</span>
                            </div>
                            
                            {bill.dueDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Due:</span>
                                <span className={overdue ? "text-destructive font-medium" : ""}>
                                  {format(new Date(bill.dueDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Amount:</span>
                              <span className="font-semibold text-primary">
                                ${(bill.balance || bill.amount || 0).toLocaleString()}
                              </span>
                            </div>
                            
                            {bill.description && (
                              <div className="mt-2">
                                <span className="font-medium">Description:</span>
                                <p className="text-muted-foreground mt-1">{bill.description}</p>
                              </div>
                            )}
                            
                            {bill.invoiceDate && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Invoice Date: {format(new Date(bill.invoiceDate), "MMM dd, yyyy")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markBillAsPaid(bill.id, bill.amount || 0);
                            }}
                            className="whitespace-nowrap"
                          >
                            Mark as Paid
                          </Button>
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