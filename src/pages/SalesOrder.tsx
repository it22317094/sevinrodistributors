import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, FileText, Eye } from "lucide-react";
import { generateInvoicePDF } from "@/components/InvoiceTemplate";
import { realtimeDb, auth } from "@/lib/firebase";
import { ref, push, onValue, get, runTransaction } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceGenerator } from "@/hooks/useInvoiceGenerator";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  id: string;
  styleNo: string;
  description: string;
  size: string;
  quantity: number;
  branch: string;
  rate: number;
  amount: number;
  remarks: string;
}

interface ItemCode {
  id: string;
  code: string;
  description: string;
  price: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
  date: string;
  createdAt: string;
}

export default function SalesOrder() {
  const { toast } = useToast();
  const { generateInvoicePDF } = useInvoiceGenerator();
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<string[]>([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { id: "1", styleNo: "", description: "", size: "", quantity: 0, branch: "", rate: 0, amount: 0, remarks: "" }
  ]);
  const [availableItemCodes, setAvailableItemCodes] = useState<ItemCode[]>([]);
  const [existingInvoices, setExistingInvoices] = useState<InvoiceData[]>([]);

  // Fetch customers
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

  // Auto-generate Invoice and Order numbers from database counters
  useEffect(() => {
    const loadCounters = async () => {
      try {
        // Get next invoice number
        const invoiceCounterRef = ref(realtimeDb, 'salesInvoiceCounter');
        const invoiceSnapshot = await get(invoiceCounterRef);
        const nextInvoice = invoiceSnapshot.val() === null ? 1 : invoiceSnapshot.val() + 1;
        setInvoiceNo(`SI${String(nextInvoice).padStart(4, '0')}`);

        // Get next order number
        const orderCounterRef = ref(realtimeDb, 'salesOrderCounter');
        const orderSnapshot = await get(orderCounterRef);
        const nextOrder = orderSnapshot.val() === null ? 1 : orderSnapshot.val() + 1;
        setOrderNo(`SO${String(nextOrder).padStart(4, '0')}`);
      } catch (error) {
        console.error('Error loading counters:', error);
      }
    };
    loadCounters();
  }, []);

  // Fetch item codes from Create Invoice page
  useEffect(() => {
    const itemCodesRef = ref(realtimeDb, 'itemCodes');
    
    const unsubscribe = onValue(itemCodesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setAvailableItemCodes([]);
        return;
      }

      const codes = Object.keys(data).map(key => ({
        id: key,
        code: data[key].code,
        description: data[key].description,
        price: data[key].price
      }));
      setAvailableItemCodes(codes);
    });

    return () => unsubscribe();
  }, []);

  // Fetch existing invoices
  useEffect(() => {
    const invoicesRef = ref(realtimeDb, 'invoices');
    
    const unsubscribe = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setExistingInvoices([]);
        return;
      }

      const invoicesList: InvoiceData[] = Object.entries(data).map(([key, value]: [string, any]) => ({
        id: key,
        ...value
      }));
      
      // Sort by creation date, newest first
      invoicesList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setExistingInvoices(invoicesList);
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
      branch: "",
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

  const selectItemCode = (itemId: string, selectedCode: string) => {
    const itemCode = availableItemCodes.find(ic => ic.code === selectedCode);
    if (itemCode) {
      updateItem(itemId, 'styleNo', itemCode.code);
      updateItem(itemId, 'description', itemCode.description);
      updateItem(itemId, 'rate', itemCode.price);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleGeneratePDF = async () => {
    console.log("Current items:", items);
    const validItems = items.filter(item => item.styleNo && item.quantity > 0);
    console.log("Valid items for PDF:", validItems);
    
    if (validItems.length === 0) {
      // Check what's missing
      const itemsWithoutStyleNo = items.filter(item => !item.styleNo);
      const itemsWithoutQty = items.filter(item => item.quantity <= 0);
      
      let errorMessage = "Please ensure each item has:\n";
      if (itemsWithoutStyleNo.length > 0) errorMessage += "- Style No filled in\n";
      if (itemsWithoutQty.length > 0) errorMessage += "- Quantity greater than 0";
      
      toast({
        title: "Cannot Generate PDF",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Add company logo
      try {
        const logoImg = new Image();
        logoImg.src = '/assets/images/logo.png';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        
        const aspectRatio = 1356 / 896;
        const logoHeight = 20;
        const logoWidth = logoHeight * aspectRatio;
        
        doc.addImage(logoImg, 'PNG', 20, 15, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error loading logo:', error);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 165, 0);
        doc.text('SEVINRO', 20, 25);
      }
      
      // Company details
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      const rightX = pageWidth - 20;
      doc.text('No - 136/A, Akurana, Gampaha', rightX, 20, { align: 'right' });
      doc.text('Te: 071 39 69 580, 0777 52 90 58', rightX, 25, { align: 'right' });
      
      // Title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('Sales Order Form', pageWidth / 2, 50, { align: 'center' });
      
      // Customer info
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('TO:-', 20, 70);
      
      doc.setFont(undefined, 'normal');
      if (customerName) {
        doc.text(customerName, 32, 70);
        if (notes) {
          doc.text(notes, 20, 76);
        }
      }
      
      // Invoice details
      const invoiceDetailsX = pageWidth - 70;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.text(`Invoice No - ${invoiceNo}`, invoiceDetailsX, 70);
      doc.text(`Order No - ${orderNo}`, invoiceDetailsX, 75);
      doc.text(`Date - ${new Date(orderDate).toLocaleDateString('en-GB')}`, invoiceDetailsX, 80);
      
      // Items table - only actual items, no empty rows
      const tableData = validItems.map((item, index) => [
        (index + 1).toString(),
        item.styleNo,
        item.description,
        item.quantity.toString(),
        item.branch || '',
        `${item.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `RS ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        item.remarks || ''
      ]);
      
      autoTable(doc, {
        head: [['No', 'Style No', 'Description', 'Qty', 'Branch', 'Price', 'Total', 'Remarks']],
        body: tableData,
        startY: 90,
        styles: {
          fontSize: 8,
          cellPadding: 3.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [255, 165, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },   // No
          1: { cellWidth: 18 },                      // Style No
          2: { cellWidth: 30 },                      // Description
          3: { halign: 'center', cellWidth: 12 },    // Qty
          4: { cellWidth: 25 },                      // Branch
          5: { halign: 'right', cellWidth: 18 },     // Price
          6: { halign: 'right', cellWidth: 32 },     // Total
          7: { cellWidth: 30 },                      // Remarks
        },
        margin: { left: 20, right: 20 },
      });
      
      const finalY = (doc as any).lastAutoTable?.finalY || 300;
      
      // Total section
      const totalY = finalY + 10;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('Total Amount', pageWidth - 80, totalY);
      doc.text('RS', pageWidth - 45, totalY);
      doc.text(`${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 20, totalY, { align: 'right' });
      
      // Signature lines
      const signatureY = totalY + 50;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      doc.line(20, signatureY, 90, signatureY);
      doc.text('Authorized By', 45, signatureY + 10, { align: 'center' });
      
      doc.line(pageWidth - 90, signatureY, pageWidth - 20, signatureY);
      doc.text('Customer Signature', pageWidth - 55, signatureY + 10, { align: 'center' });

      doc.save(`Sales_Order_${customerName || 'Draft'}_${new Date().toLocaleDateString().replace(/\//g, '_')}.pdf`);

      toast({
        title: "PDF Generated",
        description: "Invoice PDF has been downloaded successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  const handleSaveOrder = async () => {
    if (!customerName) {
      toast({
        title: "Missing Customer Name",
        description: "Please select a customer name",
        variant: "destructive"
      });
      return;
    }

    const validItems = items.filter(item => item.styleNo && item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        title: "No Items Added",
        description: "Please add at least one item with Style No and Quantity greater than 0",
        variant: "destructive"
      });
      return;
    }
    
    if (!auth.currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save orders",
        variant: "destructive",
      });
      return;
    }
 
    try {
      // Increment counters using transaction
      const invoiceCounterRef = ref(realtimeDb, 'salesInvoiceCounter');
      const orderCounterRef = ref(realtimeDb, 'salesOrderCounter');
      
      const invoiceResult = await runTransaction(invoiceCounterRef, (current) => {
        return (current ?? 0) + 1;
      });
      
      const orderResult = await runTransaction(orderCounterRef, (current) => {
        return (current ?? 0) + 1;
      });

      const finalInvoiceNo = invoiceResult.snapshot.val();
      const finalOrderNo = orderResult.snapshot.val();

      // Prepare order payload with proper structure for real-time dashboard
      const orderPayload = {
        userId: auth.currentUser.uid,
        customerName: customerName.trim(),
        invoiceNo: `SI${String(finalInvoiceNo).padStart(4, '0')}`,
        orderNo: `SO${String(finalOrderNo).padStart(4, '0')}`,
        orderDate,
        deliveryDate: deliveryDate || orderDate,
        notes: notes.trim(),
        items: validItems.map(item => ({
          styleNo: item.styleNo.trim(),
          description: item.description.trim(),
          size: item.size,
          quantity: item.quantity,
          branch: item.branch.trim(),
          rate: item.rate,
          amount: item.amount,
          remarks: item.remarks.trim()
        })),
        subtotal: calculateTotal(),
        total: calculateTotal(),
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firebase Realtime Database
      const salesOrdersRef = ref(realtimeDb, 'salesOrders');
      const newOrderRef = await push(salesOrdersRef, orderPayload);

      // Create delivery record
      const totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
      const deliveryPayload = {
        companyName: customerName.trim(),
        address: notes.trim() || "To be determined",
        deliveryDate: deliveryDate || orderDate,
        itemsDelivered: totalItems,
        status: "Scheduled",
        createdAt: new Date().toISOString()
      };

      const deliveriesRef = ref(realtimeDb, 'deliveries');
      await push(deliveriesRef, deliveryPayload);

      toast({
        title: "Order Saved Successfully! ✅",
        description: `Order ${orderPayload.orderNo} saved and will appear in Real-Time Dashboard`
      });

      // Reset form
      setCustomerName("");
      setDeliveryDate("");
      setNotes("");
      setItems([{ id: Date.now().toString(), styleNo: "", description: "", size: "", quantity: 0, branch: "", rate: 0, amount: 0, remarks: "" }]);
      
      // Update invoice and order numbers for next order
      setInvoiceNo(`SI${String(finalInvoiceNo + 1).padStart(4, '0')}`);
      setOrderNo(`SO${String(finalOrderNo + 1).padStart(4, '0')}`);
      
    } catch (error: any) {
      console.error('Failed to save sales order:', error);
      
      const errorMessage = error?.code === 'PERMISSION_DENIED' 
        ? "Permission denied. Please ensure Firebase rules are published correctly."
        : error?.message || "Failed to save order";
      
      toast({
        title: "Save Failed ❌",
        description: errorMessage,
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

        {/* All Previous Invoices Section */}
        {existingInvoices.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Previous Invoices</span>
                <Badge variant="secondary">{existingInvoices.length} Total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {existingInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{invoice.invoiceNumber}</span>
                        <Badge 
                          variant={invoice.status === "paid" ? "default" : "secondary"}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span>{invoice.customerName}</span>
                        <span className="mx-2">•</span>
                        <span>{invoice.date}</span>
                        <span className="mx-2">•</span>
                        <span className="font-medium">RS {invoice.total?.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => generateInvoicePDF(invoice.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
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
                <Label htmlFor="invoiceNo">Invoice No</Label>
                <Input
                  id="invoiceNo"
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="INV-001"
                />
              </div>
              <div>
                <Label htmlFor="orderNo">Order No</Label>
                <Input
                  id="orderNo"
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="ORD-001"
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
            <div className="flex gap-2">
              <Button onClick={handleGeneratePDF} size="sm" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF
              </Button>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
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
                    <TableHead>Branch</TableHead>
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
                        <div className="space-y-2">
                          {availableItemCodes.length > 0 && (
                            <Select value={item.styleNo} onValueChange={(value) => selectItemCode(item.id, value)}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Quick Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableItemCodes.map((ic) => (
                                  <SelectItem key={ic.id} value={ic.code}>
                                    {ic.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Input
                            value={item.styleNo}
                            onChange={(e) => updateItem(item.id, 'styleNo', e.target.value)}
                            placeholder="Style No"
                            className="w-32"
                          />
                        </div>
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
                          value={item.branch}
                          onChange={(e) => updateItem(item.id, 'branch', e.target.value)}
                          placeholder="Branch"
                          className="w-32"
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
