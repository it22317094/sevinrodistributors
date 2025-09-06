import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Package, DollarSign, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ref, onValue, query, orderByChild, equalTo, update, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { format, isAfter } from "date-fns";

interface SupplierOrdersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any;
}

interface Order {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: any[];
  qtyTotal: number;
  amount: number;
  paid: number;
  balance: number;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  dueDate: string;
  billId?: string;
  createdAt: string;
  updatedAt: string;
}

export function SupplierOrdersDrawer({ open, onOpenChange, supplier }: SupplierOrdersDrawerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && supplier?.id) {
      fetchSupplierOrders();
    }
  }, [open, supplier?.id]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const fetchSupplierOrders = () => {
    if (!supplier?.id) return;
    
    setLoading(true);
    const ordersRef = ref(realtimeDb, 'purchaseOrders');
    const ordersQuery = query(ordersRef, orderByChild('supplierId'), equalTo(supplier.id));
    
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
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch supplier orders",
        variant: "destructive",
      });
      setLoading(false);
    });

    return unsubscribe;
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const markOrderAsCompleted = async (orderId: string) => {
    try {
      const orderRef = ref(realtimeDb, `purchaseOrders/${orderId}`);
      await update(orderRef, {
        status: "Completed",
        updatedAt: serverTimestamp()
      });

      // Log the status change
      const auditRef = ref(realtimeDb, 'orderStatusChanges');
      await update(auditRef, {
        orderId,
        oldStatus: orders.find(o => o.id === orderId)?.status,
        newStatus: "Completed",
        changedBy: "current_user", // Replace with actual user
        changedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Order marked as Completed. KPIs updated.",
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Pending": "outline",
      "In Progress": "secondary", 
      "Completed": "default",
      "Cancelled": "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const isOverdue = (dueDate: string) => {
    return isAfter(new Date(), new Date(dueDate));
  };

  // Calculate summary metrics
  const summary = {
    count: filteredOrders.length,
    totalAmount: filteredOrders.reduce((sum, order) => sum + (order.amount || 0), 0),
    totalPaid: filteredOrders.reduce((sum, order) => sum + (order.paid || 0), 0),
    totalBalance: filteredOrders.reduce((sum, order) => sum + (order.balance || 0), 0)
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-4xl">
        <SheetHeader>
          <SheetTitle>Orders for {supplier?.name}</SheetTitle>
          <SheetDescription>
            Manage all purchase orders for this supplier
          </SheetDescription>
        </SheetHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.totalAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.totalPaid.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.totalBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders found</p>
                    <Button className="mt-4" onClick={() => {/* TODO: Create order */}}>
                      Create Order
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderId || order.id}</TableCell>
                    <TableCell>{order.date ? format(new Date(order.date), "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell>{order.items?.length || 0}</TableCell>
                    <TableCell>{order.qtyTotal || 0}</TableCell>
                    <TableCell>${(order.amount || 0).toLocaleString()}</TableCell>
                    <TableCell>${(order.paid || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={order.balance > 0 ? "text-destructive font-medium" : ""}>
                        ${(order.balance || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.dueDate ? (
                        <span className={isOverdue(order.dueDate) ? "text-destructive font-medium" : ""}>
                          {format(new Date(order.dueDate), "MMM dd, yyyy")}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {order.billId && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {/* TODO: Navigate to bill */}}
                          >
                            Open Bill
                          </Button>
                        )}
                        {order.status !== "Completed" && order.status !== "Cancelled" && (
                          <Button 
                            size="sm" 
                            onClick={() => markOrderAsCompleted(order.id)}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
}