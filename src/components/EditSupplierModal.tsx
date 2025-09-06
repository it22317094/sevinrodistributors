import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ref, update } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any;
  onSupplierUpdated: () => void;
}

export default function EditSupplierModal({ open, onOpenChange, supplier, onSupplierUpdated }: EditSupplierModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    dueDate: null as Date | null,
    amountPaid: '',
    description: '',
    invoiceDate: null as Date | null,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        dueDate: supplier.dueDate ? new Date(supplier.dueDate) : null,
        amountPaid: supplier.amountPaid?.toString() || '',
        description: supplier.description || '',
        invoiceDate: supplier.invoiceDate ? new Date(supplier.invoiceDate) : null,
      });
    }
  }, [supplier]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.amountPaid || !formData.invoiceDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Amount Paid, Invoice Date)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        supplierId: supplier.id,
        name: formData.name,
        dueDate: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
        amountPaid: parseFloat(formData.amountPaid),
        description: formData.description,
        invoiceDate: formData.invoiceDate ? format(formData.invoiceDate, 'yyyy-MM-dd') : null,
        updatedAt: new Date().toISOString()
      };

      console.log('Updating supplier:', supplier.id, updateData);
      
      const supplierRef = ref(realtimeDb, `suppliers/${supplier.id}`);
      await update(supplierRef, updateData);
      
      console.log('Supplier updated successfully');
      
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      onSupplierUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="dueDate">Due Date</Label>
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
                  selected={formData.dueDate || undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date || null }))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountPaid">Amount Paid *</Label>
            <Input
              id="amountPaid"
              name="amountPaid"
              type="number"
              step="0.01"
              value={formData.amountPaid}
              onChange={handleInputChange}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Notes about supplier or payment"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.invoiceDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.invoiceDate ? format(formData.invoiceDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.invoiceDate || undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, invoiceDate: date || null }))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name || !formData.amountPaid || !formData.invoiceDate}
            >
              {loading ? "Updating..." : "Update Supplier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}