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
  // Sample data for display
  const sampleSuppliers = [
    { id: '1', name: "Premium Textiles Ltd", contact: "John Smith", phone: "+1 234-567-8901", address: "123 Textile Ave, NY 10001" },
    { id: '2', name: "Global Fabric Co", contact: "Sarah Johnson", phone: "+1 234-567-8902", address: "456 Fabric St, CA 90210" },
    { id: '3', name: "Quality Materials Inc", contact: "Mike Wilson", phone: "+1 234-567-8903", address: "789 Material Blvd, TX 75001" },
    { id: '4', name: "Elite Supplies Ltd", contact: "Emma Davis", phone: "+1 234-567-8904", address: "321 Supply Rd, FL 33101" },
  ];

  const sampleOrders = [
    { id: '1', supplierId: '1', orderNumber: 'ORD-001', orderDate: '2024-01-15', deliveryDate: '2024-02-01', itemDescription: 'Cotton Fabric - Premium Grade', quantity: 500, totalAmount: 12500, status: 'Active' },
    { id: '2', supplierId: '1', orderNumber: 'ORD-002', orderDate: '2024-01-20', deliveryDate: '2024-02-05', itemDescription: 'Silk Blend Material', quantity: 200, totalAmount: 8900, status: 'Completed' },
    { id: '3', supplierId: '2', orderNumber: 'ORD-003', orderDate: '2024-01-18', deliveryDate: '2024-02-03', itemDescription: 'Polyester Fabric Rolls', quantity: 300, totalAmount: 6750, status: 'Active' },
    { id: '4', supplierId: '2', orderNumber: 'ORD-004', orderDate: '2024-01-22', deliveryDate: '2024-02-08', itemDescription: 'Denim Material - Heavy Weight', quantity: 150, totalAmount: 4500, status: 'Active' },
    { id: '5', supplierId: '3', orderNumber: 'ORD-005', orderDate: '2024-01-25', deliveryDate: '2024-02-10', itemDescription: 'Linen Fabric - Natural', quantity: 400, totalAmount: 9200, status: 'Completed' },
    { id: '6', supplierId: '4', orderNumber: 'ORD-006', orderDate: '2024-01-28', deliveryDate: '2024-02-12', itemDescription: 'Wool Blend Fabric', quantity: 250, totalAmount: 7800, status: 'Active' },
  ];

  const sampleBills = [
    { id: '1', supplierId: '1', supplierName: 'Premium Textiles Ltd', billNumber: 'BILL-001', amount: 12500, dueDate: '2024-02-15', invoiceDate: '2024-01-15', description: 'Cotton Fabric Order Payment', status: 'Pending' },
    { id: '2', supplierId: '2', supplierName: 'Global Fabric Co', billNumber: 'BILL-002', amount: 6750, dueDate: '2024-02-10', invoiceDate: '2024-01-18', description: 'Polyester Fabric Payment', status: 'Pending' },
    { id: '3', supplierId: '4', supplierName: 'Elite Supplies Ltd', billNumber: 'BILL-003', amount: 7800, dueDate: '2024-02-05', invoiceDate: '2024-01-28', description: 'Wool Blend Fabric Payment', status: 'Pending' },
    { id: '4', supplierId: '1', supplierName: 'Premium Textiles Ltd', billNumber: 'BILL-004', amount: 8900, dueDate: '2024-01-30', invoiceDate: '2024-01-20', description: 'Silk Blend Material Payment', status: 'Paid' },
  ];

  const [suppliers, setSuppliers] = useState<any[]>(sampleSuppliers);
  const [orders, setOrders] = useState<any[]>(sampleOrders);
  const [bills, setBills] = useState<any[]>(sampleBills);
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
    // Using sample data for now - fetchData() can be called to load from Firebase
    // fetchData();
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
          orders={orders}
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
          bills={bills}
        />
      </div>
    </div>
  );
}