import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push } from "firebase/database";
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

export default function SalesOrder() {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { id: "1", styleNo: "", description: "", size: "", quantity: 0, rate: 0, amount: 0, remarks: "" }
  ]);

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

    try {
      const ordersRef = ref(realtimeDb, 'orders');
      await push(ordersRef, {
        customerName,
        orderDate,
        deliveryDate,
        notes,
        items: validItems,
        total: calculateTotal(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      toast({
        title: "Success",
        description: "Sales order created successfully"
      });

      // Reset form
      setCustomerName("");
      setDeliveryDate("");
      setNotes("");
      setItems([{ id: Date.now().toString(), styleNo: "", description: "", size: "", quantity: 0, rate: 0, amount: 0, remarks: "" }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create sales order",
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
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
