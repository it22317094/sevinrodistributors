import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ref, push, get, query, orderByChild, limitToLast } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  address: string;
}

const InvoiceCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 0, price: 0, total: 0 }
  ]);

  // Predefined items based on the invoice image
  const predefinedItems = [
    { code: 'AU001', description: 'T Shirt', price: 960 },
    { code: 'SL1086', description: 'T Shirt', price: 890 },
    { code: 'AU011', description: 'T Shirt', price: 890 },
    { code: 'SL1069', description: 'T Shirt', price: 890 },
    { code: 'SL1087', description: 'T Shirt', price: 960 },
    { code: 'SL1082', description: 'T Shirt', price: 990 }
  ];

  // Mock customers - in production, load from Firebase
  const mockCustomers: Customer[] = [
    { id: '1', name: 'Cotton Feel', address: 'Matara' },
    { id: '2', name: 'Fashion Hub', address: 'Colombo' },
    { id: '3', name: 'Style Corner', address: 'Kandy' }
  ];

  useEffect(() => {
    // Generate next invoice number (starting from 1000)
    const generateInvoiceNumber = async () => {
      try {
        const invoicesRef = ref(realtimeDb, 'invoices');
        const lastInvoiceQuery = query(invoicesRef, orderByChild('invoiceNumber'), limitToLast(1));
        const snapshot = await get(lastInvoiceQuery);
        
        let nextNumber = 10000;
        if (snapshot.exists()) {
          const invoices = Object.values(snapshot.val()) as any[];
          const lastInvoice = invoices[0];
          if (lastInvoice?.invoiceNumber) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.replace('SI', ''));
            nextNumber = lastNumber + 1;
          }
        }
        
        setInvoiceNumber(`SI${nextNumber.toString().padStart(6, '0')}`);
      } catch (error) {
        console.error('Error generating invoice number:', error);
        setInvoiceNumber(`SI${(10000 + Math.floor(Math.random() * 1000)).toString()}`);
      }
    };
    
    generateInvoiceNumber();
  }, []);

  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems([...items, { id: newId, description: '', quantity: 0, price: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          updatedItem.total = updatedItem.quantity * updatedItem.price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const selectPredefinedItem = (itemId: string, selectedCode: string) => {
    const predefined = predefinedItems.find(item => item.code === selectedCode);
    if (predefined) {
      updateItem(itemId, 'description', predefined.description);
      updateItem(itemId, 'price', predefined.price);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || items.some(item => !item.description || item.quantity <= 0)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    setLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const invoiceData = {
        invoiceNumber,
        customerId: selectedCustomer,
        customerName: mockCustomers.find(c => c.id === selectedCustomer)?.name,
        orderNumber,
        items: items.filter(item => item.description && item.quantity > 0),
        subtotal,
        total: subtotal,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const invoicesRef = ref(realtimeDb, 'invoices');
      await push(invoicesRef, invoiceData);
      
      toast({
        title: "Success",
        description: "Invoice created successfully!",
      });
      
      navigate('/invoices');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create invoice. Please check your permissions.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Create Invoice</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>Basic invoice information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      value={new Date().toISOString().split('T')[0]}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g., OR000706"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
                <CardDescription>Total amounts and payment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. {calculateSubtotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>Rs. {calculateSubtotal().toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice Items</CardTitle>
                  <CardDescription>Add products and services</CardDescription>
                </div>
                <Button type="button" onClick={addItem} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-2">
                      <Label>Item Code</Label>
                      <Select onValueChange={(value) => selectPredefinedItem(item.id, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {predefinedItems.map((predefined) => (
                            <SelectItem key={predefined.code} value={predefined.code}>
                              {predefined.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-4">
                      <Label>Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                        required
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        required
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label>Price (Rs.) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price || ''}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Label>Total</Label>
                      <div className="h-10 flex items-center text-sm font-medium">
                        Rs. {item.total.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceCreate;