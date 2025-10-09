import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ref, push, get, runTransaction, set } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface InvoiceItem {
  id: string;
  item_code: string;
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

interface ItemCode {
  id: string;
  code: string;
  description: string;
  price: number;
}

const InvoiceCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState<number | null>(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState<string>('');
  
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', item_code: '', description: '', quantity: 0, price: 0, total: 0 }
  ]);
  
  // Item codes state
  const [itemCodes, setItemCodes] = useState<ItemCode[]>([]);
  const [newItemCode, setNewItemCode] = useState({ code: '', description: '', price: 0 });
  const [showAddItemCode, setShowAddItemCode] = useState(false);

  // Predefined items based on the invoice image
  const predefinedItems = [
    { code: 'AU001', description: 'T Shirt', price: 960 },
    { code: 'SL1086', description: 'T Shirt', price: 890 },
    { code: 'AU011', description: 'T Shirt', price: 890 },
    { code: 'SL1069', description: 'T Shirt', price: 890 },
    { code: 'SL1087', description: 'T Shirt', price: 960 },
    { code: 'SL1082', description: 'T Shirt', price: 990 }
  ];

  // Load customers from Firebase
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Load customers from Firebase
  const loadCustomers = async () => {
    try {
      const customersRef = ref(realtimeDb, 'customers');
      const snapshot = await get(customersRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const customersList = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name,
          address: data[key].address
        }));
        setCustomers(customersList);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Add ability to refresh customers list when page is focused
  useEffect(() => {
    const handleFocus = () => {
      loadCustomers();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Function to get the next invoice number for display (without incrementing)
  const getNextInvoiceNumber = async (): Promise<number> => {
    try {
      const counterRef = ref(realtimeDb, 'invoiceCounter');
      const snapshot = await get(counterRef);
      const currentValue = snapshot.val();
      const nextNumber = currentValue === null ? 10000 : currentValue + 1;
      return nextNumber;
    } catch (error) {
      console.error('Error getting next invoice number:', error);
      return 10000;
    }
  };

  // Function to get the next order number for display (without incrementing)
  const getNextOrderNumber = async (): Promise<string> => {
    try {
      const counterRef = ref(realtimeDb, 'orderCounter');
      const snapshot = await get(counterRef);
      const currentValue = snapshot.val();
      const nextNumber = currentValue === null ? 1 : currentValue + 1;
      return `OR${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error getting next order number:', error);
      return 'OR0001';
    }
  };

  const generateNextInvoiceNumber = async (): Promise<number> => {
    const counterRef = ref(realtimeDb, 'invoiceCounter');
    
    const result = await runTransaction(counterRef, (current) => {
      if (current === null) {
        return 10000; // First invoice starts at 10000
      }
      return current + 1;
    });
    
    if (result.committed) {
      return result.snapshot.val();
    } else {
      throw new Error('Failed to generate invoice number');
    }
  };

  const generateNextOrderNumber = async (): Promise<string> => {
    const counterRef = ref(realtimeDb, 'orderCounter');
    
    const result = await runTransaction(counterRef, (current) => {
      if (current === null) {
        return 1; // First order starts at 1
      }
      return current + 1;
    });
    
    if (result.committed) {
      const num = result.snapshot.val();
      return `OR${String(num).padStart(4, '0')}`;
    } else {
      throw new Error('Failed to generate order number');
    }
  };

  // Load item codes from Firebase
  const loadItemCodes = async () => {
    try {
      const itemCodesRef = ref(realtimeDb, 'itemCodes');
      const snapshot = await get(itemCodesRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const codes = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setItemCodes(codes);
      }
    } catch (error) {
      console.error('Error loading item codes:', error);
    }
  };

  // Load the next invoice number, order number, item codes, and customers when component mounts
  useEffect(() => {
    const loadData = async () => {
      const nextNumber = await getNextInvoiceNumber();
      setCurrentInvoiceNumber(nextNumber);
      const nextOrder = await getNextOrderNumber();
      setCurrentOrderNumber(nextOrder);
      await loadItemCodes();
      await loadCustomers();
    };
    
    loadData();
  }, []);
  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems([...items, { id: newId, item_code: '', description: '', quantity: 0, price: 0, total: 0 }]);
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
    const predefined = [...predefinedItems, ...itemCodes].find(item => item.code === selectedCode);
    if (predefined) {
      updateItem(itemId, 'item_code', predefined.code);
      updateItem(itemId, 'description', predefined.description);
      updateItem(itemId, 'price', predefined.price);
    }
  };

  // Add new item code to Firebase
  const addItemCode = async () => {
    if (!newItemCode.code || !newItemCode.description || newItemCode.price <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all item code fields with valid values",
      });
      return;
    }

    try {
      const itemCodesRef = ref(realtimeDb, 'itemCodes');
      await push(itemCodesRef, newItemCode);
      
      toast({
        title: "Success",
        description: "Item code added successfully!",
      });
      
      setNewItemCode({ code: '', description: '', price: 0 });
      setShowAddItemCode(false);
      await loadItemCodes(); // Reload the item codes
    } catch (error) {
      console.error('Error adding item code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item code",
      });
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields (invoiceNumber is auto-generated, so not included)
    const validationErrors: string[] = [];
    
    if (!selectedCustomer) {
      validationErrors.push("Customer is required");
    }
    
    if (items.some(item => !item.description || item.quantity <= 0)) {
      validationErrors.push("All items must have a description and quantity greater than 0");
    }
    
    if (validationErrors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validationErrors.join(", "),
      });
      return;
    }

    setLoading(true);
    try {
      // Generate new invoice number and order number using transactions
      const newInvoiceNumber = await generateNextInvoiceNumber();
      const newOrderNumber = await generateNextOrderNumber();
      
      const subtotal = calculateSubtotal();
      const invoiceData = {
        number: newInvoiceNumber,
        customerId: selectedCustomer,
        customerName: customers.find(c => c.id === selectedCustomer)?.name,
        orderNumber: newOrderNumber,
        items: items.filter(item => item.description && item.quantity > 0),
        subtotal,
        total: subtotal,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save invoice under the numeric invoice number as key
      const invoiceRef = ref(realtimeDb, `invoices/${newInvoiceNumber}`);
      await set(invoiceRef, invoiceData);
      
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
                      value={currentInvoiceNumber ? currentInvoiceNumber.toString() : 'Loading...'}
                      readOnly
                      className="bg-muted"
                      placeholder="Loading..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      value={new Date().toLocaleDateString('en-CA')}
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
                      {customers.map((customer) => (
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
                    value={currentOrderNumber || 'Loading...'}
                    readOnly
                    className="bg-muted"
                    placeholder="Loading..."
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
                    <span>RS {calculateSubtotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>RS {calculateSubtotal().toLocaleString()}</span>
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
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      onClick={() => setShowAddItemCode(!showAddItemCode)} 
                      variant="outline"
                      size="sm"
                    >
                      {showAddItemCode ? 'Cancel' : 'Add Item Code'}
                    </Button>
                    <Button type="button" onClick={addItem} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
              {/* Add Item Code Section */}
              {showAddItemCode && (
                <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-3">Add New Item Code</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="newCode">Code *</Label>
                      <Input
                        id="newCode"
                        value={newItemCode.code}
                        onChange={(e) => setNewItemCode({...newItemCode, code: e.target.value})}
                        placeholder="e.g., AU001"
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newDescription">Description *</Label>
                      <Input
                        id="newDescription"
                        value={newItemCode.description}
                        onChange={(e) => setNewItemCode({...newItemCode, description: e.target.value})}
                        placeholder="e.g., T Shirt"
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPrice">Price (RS) *</Label>
                      <Input
                        id="newPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItemCode.price || ''}
                        onChange={(e) => setNewItemCode({...newItemCode, price: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                        className="bg-background"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        onClick={addItemCode}
                        className="w-full"
                      >
                        Add Code
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-2">
                      <Label>Item Code</Label>
                      <Select onValueChange={(value) => selectPredefinedItem(item.id, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-50">
                          {[...predefinedItems, ...itemCodes].map((predefined) => (
                            <SelectItem 
                              key={predefined.code} 
                              value={predefined.code}
                              className="bg-background hover:bg-accent"
                            >
                              {predefined.code} - RS {predefined.price}
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
                      <Label>Price (RS) *</Label>
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
                        RS {item.total.toLocaleString()}
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