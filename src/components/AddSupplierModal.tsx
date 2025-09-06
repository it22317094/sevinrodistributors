import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ref, push, serverTimestamp, query, orderByChild, equalTo, get } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface AddSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierAdded: () => void;
}

interface SupplierFormData {
  supplierName: string;
  dueDate: Date | undefined;
  amount: string;
  description: string;
  invoiceNo: string;
  status: string;
}

export function AddSupplierModal({ open, onOpenChange, onSupplierAdded }: AddSupplierModalProps) {
  const [formData, setFormData] = useState<SupplierFormData>({
    supplierName: "",
    dueDate: undefined,
    amount: "",
    description: "",
    invoiceNo: "",
    status: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = async () => {
    if (!formData.supplierName.trim()) {
      toast({
        title: "Validation Error",
        description: "Supplier name is required",
        variant: "destructive",
      });
      return false;
    }

    // Check for duplicate supplier names
    const nameLower = formData.supplierName.trim().toLowerCase();
    const suppliersRef = ref(realtimeDb, 'suppliers');
    const duplicateQuery = query(suppliersRef, orderByChild('nameLower'), equalTo(nameLower));
    
    try {
      const snapshot = await get(duplicateQuery);
      if (snapshot.exists()) {
        toast({
          title: "Validation Error",
          description: "Supplier name already exists.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }

    if (!formData.dueDate) {
      toast({
        title: "Validation Error",
        description: "Due date is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.amount.trim() || isNaN(Number(formData.amount))) {
      toast({
        title: "Validation Error",
        description: "Valid amount is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.invoiceNo.trim()) {
      toast({
        title: "Validation Error",
        description: "Invoice number is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.status) {
      toast({
        title: "Validation Error",
        description: "Status is required",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add a supplier",
        variant: "destructive",
      });
      return;
    }

    if (!(await validateForm())) {
      return;
    }

    setLoading(true);
    try {
      // Create supplier
      const suppliersRef = ref(realtimeDb, 'suppliers');
      const newSupplierRef = push(suppliersRef);
      const supplierId = newSupplierRef.key;
      
      const supplierData = {
        supplierId: supplierId,
        name: formData.supplierName,
        nameLower: formData.supplierName.trim().toLowerCase(),
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await push(suppliersRef, supplierData);
      
      // Create invoice
      const invoicesRef = ref(realtimeDb, 'invoices');
      const newInvoiceRef = push(invoicesRef);
      const invoiceId = newInvoiceRef.key;
      
      const amount = Number(formData.amount);
      const paid = formData.status === 'Paid' ? amount : 0;
      const balance = amount - paid;
      
      const invoiceData = {
        invoiceId: invoiceId,
        invoiceNo: formData.invoiceNo,
        supplierId: supplierId,
        supplierName: formData.supplierName,
        dueDate: format(formData.dueDate!, 'yyyy-MM-dd'),
        amount: amount,
        paid: paid,
        balance: balance,
        description: formData.description,
        status: formData.status,
        createdAt: serverTimestamp()
      };

      await push(invoicesRef, invoiceData);

      toast({
        title: "Success",
        description: "Supplier and invoice added successfully",
      });

      // Reset form
      setFormData({
        supplierName: "",
        dueDate: undefined,
        amount: "",
        description: "",
        invoiceNo: "",
        status: "",
      });

      onSupplierAdded(); // Refresh supplier list
      onOpenChange(false); // Close modal
    } catch (error: any) {
      console.error("Error adding supplier:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add supplier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>
            Enter the supplier information below. All fields are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name *</Label>
            <Input
              id="supplierName"
              name="supplierName"
              value={formData.supplierName}
              onChange={handleInputChange}
              placeholder="Enter supplier name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="Enter amount"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter description"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNo">Invoice No *</Label>
            <Input
              id="invoiceNo"
              name="invoiceNo"
              value={formData.invoiceNo}
              onChange={handleInputChange}
              placeholder="Enter invoice number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}