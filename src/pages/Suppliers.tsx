import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Package, TrendingUp } from "lucide-react";
import { useFirestore } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { AddSupplierModal } from "@/components/AddSupplierModal";
import SupplierOrdersModal from "@/components/SupplierOrdersModal";
import EditSupplierModal from "@/components/EditSupplierModal";
import PendingBillsModal from "@/components/PendingBillsModal";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  
  const { getDocuments: getSuppliers } = useFirestore('suppliers');
  const { getDocuments: getOrders } = useFirestore('orders');
  const { getDocuments: getBills } = useFirestore('bills');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppliersData, ordersData, billsData] = await Promise.all([
        getSuppliers(),
        getOrders(),
        getBills()
      ]);
      setSuppliers(suppliersData);
      setOrders(ordersData);
      setBills(billsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    }
  };

  const getSupplierStats = (supplierId: string) => {
    const supplierOrders = orders.filter(order => order.supplierId === supplierId);
    const activeOrders = supplierOrders.filter(order => order.status === 'Active').length;
    const totalValue = supplierOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    return { activeOrders, totalValue };
  };

  const totalSuppliers = suppliers.length;
  const totalActiveOrders = orders.filter(order => order.status === 'Active').length;
  const totalProcurement = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const pendingBills = bills.filter(bill => bill.status === 'Pending').length;
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

        {/* Suppliers List */}
        <Card>
          <CardHeader>
            <CardTitle>Suppliers</CardTitle>
            <CardDescription>A list of all your fabric suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suppliers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No suppliers found</p>
              ) : (
                suppliers.map((supplier) => {
                  const stats = getSupplierStats(supplier.id);
                  return (
                    <div
                      key={supplier.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{supplier.name}</h3>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Contact: {supplier.contact}</p>
                          <p>Phone: {supplier.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{stats.activeOrders}</div>
                          <div className="text-xs text-muted-foreground">Orders</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-primary">${stats.totalValue.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Total Value</div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowOrdersModal(true);
                            }}
                          >
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowEditModal(true);
                            }}
                          >
                            Edit
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
        />
        
        <SupplierOrdersModal
          open={showOrdersModal}
          onOpenChange={setShowOrdersModal}
          supplier={selectedSupplier}
        />
        
        <EditSupplierModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          supplier={selectedSupplier}
          onSupplierUpdated={fetchData}
        />
        
        <PendingBillsModal
          open={showBillsModal}
          onOpenChange={setShowBillsModal}
        />
      </div>
    </div>
  );
}