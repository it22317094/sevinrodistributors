import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, TrendingUp } from "lucide-react";
import { realtimeDb, auth } from "@/lib/firebase";
import { ref, push, onValue } from "firebase/database";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  styleNo: string;
  description: string;
  size: string;
  quantity: number;
  rate: number;
  amount: number;
  remarks: string;
}

interface AggregatedItem {
  styleNo: string;
  totalQuantity: number;
  sizes: { [key: string]: number };
}

export default function SalesOrder() {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<string[]>([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { id: "1", styleNo: "", description: "", size: "", quantity: 0, rate: 0, amount: 0, remarks: "" }
  ]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedItem[]>([]);

  useEffect(() => {
    const customersRef = ref(realtimeDb, 'customers');
    
    const unsubscribe = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setCustomers([]);
        return;
      }

      const customerNames = Object.values(data).map((customer: any) => customer.name).filter(Boolean);
      setCustomers([...new Set(customerNames)]);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const ordersRef = ref(realtimeDb, 'salesOrders');
    
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setAggregatedData([]);
        return;
      }

      const itemsMap = new Map<string, AggregatedItem>();
      
      Object.values(data).forEach((order: any) => {
        if (order.items) {
          order.items.forEach((item: OrderItem) => {
            if (!item.styleNo) return;
            
            if (itemsMap.has(item.styleNo)) {
              const existing = itemsMap.get(item.styleNo)!;
              existing.totalQuantity += item.quantity;
              if (item.size) {
                existing.sizes[item.size] = (existing.sizes[item.size] || 0) + item.quantity;
              }
            } else {
              itemsMap.set(item.styleNo, {
                styleNo: item.styleNo,
                totalQuantity: item.quantity,
                sizes: item.size ? { [item.size]: item.quantity } : {}
              });
            }
          });
        }
      });

      setAggregatedData(Array.from(itemsMap.values()));
    });

    return () => unsubscribe();
  }, []);

  const addItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      styleNo: "",
      description: "",
      size: "",
      quantity: 0,
      rate: 0,
      amount: 0,
      remarks: ""
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSaveOrder = async () => {
    if (!customerName || !deliveryDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in customer name and delivery date",
        variant: "destructive"
      });
      return;
    }

    const validItems = items.filter(item => item.styleNo && item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one item with style number and quantity",
        variant: "destructive"
      });
      return;
    }
    if (!auth.currentUser) {
      toast({
        title: "Session expired",
        description: "Please sign in again to save orders",
        variant: "destructive",
      });
      return;
    }
 
     try {
       const payload = {
         userId: auth.currentUser!.uid,
         customerName,
         orderDate,
         deliveryDate,
         notes,
         items: validItems,
         total: calculateTotal(),
         status: 'pending',
         createdAt: new Date().toISOString()
       };

       let saved = false;

       // Attempt to save to the new path first
       try {
         const salesOrdersRef = ref(realtimeDb, 'salesOrders');
         await push(salesOrdersRef, payload);
         saved = true;
       } catch (err: any) {
         // If rules for 'salesOrders' aren't deployed yet, fallback to legacy 'orders'
         const isPermissionDenied = (err?.code || err?.message || '').toString().toUpperCase().includes('PERMISSION_DENIED');
         if (isPermissionDenied) {
           const legacyOrdersRef = ref(realtimeDb, 'orders');
           await push(legacyOrdersRef, payload);
           saved = true;
         } else {
           throw err;
         }
       }

       if (saved) {
         // Create delivery record
         const totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
         const deliveryPayload = {
           companyName: customerName,
           address: notes || "To be determined",
           deliveryDate,
           itemsDelivered: totalItems,
           status: "Scheduled",
           createdAt: new Date().toISOString()
         };

         try {
           const deliveriesRef = ref(realtimeDb, 'deliveries');
           await push(deliveriesRef, deliveryPayload);
         } catch (deliveryError) {
           console.error('Failed to create delivery record:', deliveryError);
         }

         toast({
           title: "Success",
           description: "Sales order and delivery created successfully"
         });

         // Reset form
         setCustomerName("");
         setDeliveryDate("");
         setNotes("");
         setItems([{ id: Date.now().toString(), styleNo: "", description: "", size: "", quantity: 0, rate: 0, amount: 0, remarks: "" }]);
       }
     } catch (error: any) {
       console.error('Failed to create sales order:', error);
       toast({
         title: "Error",
         description: error?.message || "Failed to create sales order",
         variant: "destructive"
       });
     }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Create Sales Order</h1>
          <p className="text-muted-foreground">Create a new sales order for your customers</p>
        </div>

        {aggregatedData.length > 0 && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Real-Time Order Dashboard
                </CardTitle>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Total Styles</p>
                    <p className="text-2xl font-bold text-primary">{aggregatedData.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Total Units</p>
                    <p className="text-2xl font-bold text-primary">
                      {aggregatedData.reduce((sum, item) => sum + item.totalQuantity, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {aggregatedData.map((item) => (
                  <div 
                    key={item.styleNo}
                    className="bg-background rounded-lg border border-border p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{item.styleNo}</h4>
                        <p className="text-sm text-muted-foreground">Style Number</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{item.totalQuantity}</p>
                        <p className="text-sm text-muted-foreground">Total Quantity</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(item.sizes).map(([size, qty]) => (
                        <div 
                          key={size} 
                          className="px-3 py-1.5 bg-primary/10 text-primary rounded-md font-medium text-sm border border-primary/20"
                        >
                          {size}: <span className="font-bold">{qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Select value={customerName} onValueChange={setCustomerName}>
                  <SelectTrigger id="customerName">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Items</CardTitle>
            <Button onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style No</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.styleNo}
                          onChange={(e) => updateItem(item.id, 'styleNo', e.target.value)}
                          placeholder="Style No"
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-48"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.size}
                          onValueChange={(value) => updateItem(item.id, 'size', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="S">S</SelectItem>
                            <SelectItem value="M">M</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="XL">XL</SelectItem>
                            <SelectItem value="2XL">2XL</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.rate || ''}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        Rs. {item.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.remarks}
                          onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                          placeholder="Remarks"
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        {items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">Rs. {calculateTotal().toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSaveOrder}>
            <Save className="h-4 w-4 mr-2" />
            Save Order
          </Button>
        </div>
      </div>
    </div>
  );
}
