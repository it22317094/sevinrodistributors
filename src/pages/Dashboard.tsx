import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddSupplierModal } from "@/components/AddSupplierModal";
import { realtimeDb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { 
  Package, 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Truck,
  DollarSign,
  Plus
} from "lucide-react";

const recentActivity = [
  { id: 1, type: "invoice", description: "Invoice #INV-001 created for Fashion House Ltd", amount: "Rs. 2,450", time: "2 hours ago" },
  { id: 2, type: "payment", description: "Payment received from Designer Boutique", amount: "Rs. 1,200", time: "4 hours ago" },
  { id: 3, type: "delivery", description: "Delivery completed for order #ORD-045", amount: "Rs. 3,890", time: "6 hours ago" },
  { id: 4, type: "supplier", description: "New fabric order placed with Premium Textiles", amount: "Rs. 5,670", time: "1 day ago" },
];

export default function Dashboard() {
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [lowInventoryCount, setLowInventoryCount] = useState(0);
  const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState(0);
  const [todayDeliveriesCount, setTodayDeliveriesCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for overdue invoices
    const invoicesRef = ref(realtimeDb, 'invoices');
    const invoicesUnsubscribe = onValue(invoicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const invoices = snapshot.val();
        const today = new Date();
        let overdue = 0;
        
        Object.values(invoices).forEach((invoice: any) => {
          if (invoice.dueDate) {
            const dueDate = new Date(invoice.dueDate);
            if (dueDate < today && invoice.status !== 'paid') {
              overdue++;
            }
          }
        });
        
        setOverdueCount(overdue);
      }
    });

    // Listen for low inventory
    const inventoryRef = ref(realtimeDb, 'inventory');
    const inventoryUnsubscribe = onValue(inventoryRef, (snapshot) => {
      if (snapshot.exists()) {
        const inventory = snapshot.val();
        let lowStock = 0;
        
        Object.values(inventory).forEach((item: any) => {
          const currentQty = item.quantity || 0;
          const minQty = item.minQuantity || 10;
          if (currentQty < minQty) {
            lowStock++;
          }
        });
        
        setLowInventoryCount(lowStock);
      }
    });

    // Listen for pending deliveries
    const ordersRef = ref(realtimeDb, 'orders');
    const ordersUnsubscribe = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const orders = snapshot.val();
        let pending = 0;
        let today = 0;
        const todayDate = new Date().toISOString().split('T')[0];
        
        Object.values(orders).forEach((order: any) => {
          if (order.status === 'pending' || order.status === 'processing') {
            pending++;
            if (order.deliveryDate === todayDate) {
              today++;
            }
          }
        });
        
        setPendingDeliveriesCount(pending);
        setTodayDeliveriesCount(today);
      }
    });

    return () => {
      invoicesUnsubscribe();
      inventoryUnsubscribe();
      ordersUnsubscribe();
    };
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "invoice":
        navigate("/invoices/create");
        break;
      case "order":
        navigate("/inventory");
        break;
      case "customer":
        navigate("/customers");
        break;
      case "delivery":
        navigate("/delivery");
        break;
      default:
        break;
    }
  };

  const handleAlert = (alertType: string) => {
    switch (alertType) {
      case "overdue":
        navigate("/customers");
        break;
      case "inventory":
        navigate("/inventory");
        break;
      case "delivery":
        navigate("/delivery");
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your textile business management system</p>
          </div>
          <Button onClick={() => setShowSupplierModal(true)} className="mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. 184,320</div>
              <p className="text-xs text-muted-foreground">+15.3% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">Rs. 46,440</div>
              <p className="text-xs text-muted-foreground">12 overdue accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">95</div>
              <p className="text-xs text-muted-foreground">+12 from last week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">5 scheduled today</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => handleQuickAction("invoice")}
                >
                  <FileText className="h-6 w-6 mb-2" />
                  Create Invoice
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => handleQuickAction("order")}
                >
                  <Package className="h-6 w-6 mb-2" />
                  New Order
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => handleQuickAction("customer")}
                >
                  <Users className="h-6 w-6 mb-2" />
                  Add Customer
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => handleQuickAction("delivery")}
                >
                  <Truck className="h-6 w-6 mb-2" />
                  Schedule Delivery
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest business transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{activity.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
              Alerts & Notifications
            </CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">{overdueCount} invoice{overdueCount !== 1 ? 's' : ''} overdue</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAlert("overdue")}
                  >
                    View Details
                  </Button>
                </div>
              )}
              {lowInventoryCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Package className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">Low inventory: {lowInventoryCount} item{lowInventoryCount !== 1 ? 's' : ''} need restocking</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAlert("inventory")}
                  >
                    Reorder
                  </Button>
                </div>
              )}
              {pendingDeliveriesCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">{pendingDeliveriesCount} pending deliver{pendingDeliveriesCount !== 1 ? 'ies' : 'y'}{todayDeliveriesCount > 0 ? `, ${todayDeliveriesCount} scheduled today` : ''}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAlert("delivery")}
                  >
                    View Schedule
                  </Button>
                </div>
              )}
              {overdueCount === 0 && lowInventoryCount === 0 && pendingDeliveriesCount === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No alerts at the moment. Everything looks good!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Supplier Modal */}
        <AddSupplierModal 
          open={showSupplierModal} 
          onOpenChange={setShowSupplierModal}
          onSupplierAdded={() => {}} // Empty function since we're not refreshing on dashboard
        />
      </div>
    </div>
  );
}