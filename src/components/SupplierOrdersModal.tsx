import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { Package, Calendar, DollarSign } from "lucide-react";

interface SupplierOrdersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any;
  orders?: any[];
}

export default function SupplierOrdersModal({ open, onOpenChange, supplier, orders: supplierOrdersProp }: SupplierOrdersModalProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const { getDocuments, updateDocument } = useFirestore('orders');
  const { toast } = useToast();

  useEffect(() => {
    if (open && supplier && supplierOrdersProp) {
      const supplierOrders = supplierOrdersProp.filter((order: any) => order.supplierId === supplier.id);
      setOrders(supplierOrders);
    }
  }, [open, supplier, supplierOrdersProp]);

  const fetchOrders = async () => {
    try {
      // Using sample data passed from parent component
      // In real implementation, this would fetch from Firebase
      const ordersData = await getDocuments();
      const supplierOrders = ordersData.filter((order: any) => order.supplierId === supplier.id);
      setOrders(supplierOrders);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await updateDocument(orderId, { status: 'Completed' });
      toast({
        title: "Success",
        description: "Order marked as completed",
      });
      fetchOrders(); // Refresh orders
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders for {supplier?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No orders found for this supplier</p>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(order.orderDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Rs. {typeof order.totalAmount === 'number' ? order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : order.totalAmount}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={order.status === 'Active' ? 'default' : order.status === 'Completed' ? 'secondary' : 'outline'}>
                        {order.status}
                      </Badge>
                      {order.status === 'Active' && (
                        <Button size="sm" onClick={() => handleCompleteOrder(order.id)}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Items:</strong> {order.itemDescription}</p>
                    <p><strong>Quantity:</strong> {order.quantity}</p>
                    <p><strong>Delivery Date:</strong> {new Date(order.deliveryDate).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}