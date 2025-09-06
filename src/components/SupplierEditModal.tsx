import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ref, onValue, query, orderByChild, equalTo, update, serverTimestamp, get } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { format } from "date-fns";

interface SupplierEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any;
  onSupplierUpdated: () => void;
}

interface SupplierFormData {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  status: string;
}

export function SupplierEditModal({ open, onOpenChange, supplier, onSupplierUpdated }: SupplierEditModalProps) {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
    status: "Active",
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && supplier) {
      // Populate form with supplier data
      setFormData({
        name: supplier.name || "",
        contact: supplier.contact || "",
        phone: supplier.phone || supplier.phoneNumber || "",
        email: supplier.email || "",
        address: supplier.address || "",
        status: supplier.status || "Active",
      });
      
      // Fetch supplier orders
      fetchSupplierOrders();
    }
  }, [open, supplier]);

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
      setLoading(false);
    });

    return unsubscribe;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplier?.id) return;

    // Check for duplicate supplier names (excluding current supplier)
    const nameLower = formData.name.trim().toLowerCase();
    const suppliersRef = ref(realtimeDb, 'suppliers');
    const duplicateQuery = query(suppliersRef, orderByChild('nameLower'), equalTo(nameLower));
    
    try {
      const snapshot = await get(duplicateQuery);
      if (snapshot.exists()) {
        const duplicates = Object.entries(snapshot.val()).filter(([key]) => key !== supplier.id);
        if (duplicates.length > 0) {
          toast({
            title: "Validation Error",
            description: "Supplier name already exists.",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }

    setLoading(true);
    try {
      const supplierRef = ref(realtimeDb, `suppliers/${supplier.id}`);
      await update(supplierRef, {
        ...formData,
        nameLower: formData.name.trim().toLowerCase(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });

      onSupplierUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, oldStatus: string) => {
    setUpdating(orderId);
    try {
      const orderRef = ref(realtimeDb, `purchaseOrders/${orderId}`);
      await update(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Log the status change
      const auditRef = ref(realtimeDb, 'orderStatusChanges');
      await update(auditRef, {
        orderId,
        oldStatus,
        newStatus,
        changedBy: "current_user", // Replace with actual user
        changedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}. KPIs updated.`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
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

  const activeOrders = orders.filter(order => !["Completed", "Cancelled"].includes(order.status));
  const totalAmount = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const totalBalance = orders.reduce((sum, order) => sum + (order.balance || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
          <DialogDescription>
            Update supplier details and manage their orders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Supplier Details Form */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Supplier Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter supplier name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact Person</Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      placeholder="Enter contact person"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter supplier address"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Supplier"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Orders Section */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Active Orders: {activeOrders.length}</span>
                <span>Total Amount: ${totalAmount.toLocaleString()}</span>
                <span>Total Balance: ${totalBalance.toLocaleString()}</span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No orders found for this supplier</p>
                  <Button className="mt-4" onClick={() => {/* TODO: Create order */}}>
                    Create Order
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderId || order.id}</TableCell>
                          <TableCell>{order.date ? format(new Date(order.date), "MMM dd, yyyy") : "—"}</TableCell>
                          <TableCell>${(order.amount || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={order.balance > 0 ? "text-destructive font-medium" : ""}>
                              ${(order.balance || 0).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(newStatus) => updateOrderStatus(order.id, newStatus, order.status)}
                              disabled={updating === order.id}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}