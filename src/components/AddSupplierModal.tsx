import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ref, push } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface AddSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierAdded: () => void;
}

interface SupplierFormData {
  supplierName: string;
  address: string;
  phoneNumber: string;
  contactNumber: string;
}

export function AddSupplierModal({ open, onOpenChange, onSupplierAdded }: AddSupplierModalProps) {
  const [formData, setFormData] = useState<SupplierFormData>({
    supplierName: "",
    address: "",
    phoneNumber: "",
    contactNumber: "",
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

  const validateForm = () => {
    if (!formData.supplierName.trim()) {
      toast({
        title: "Validation Error",
        description: "Supplier name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.address.trim()) {
      toast({
        title: "Validation Error",
        description: "Address is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.phoneNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.contactNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Contact number is required",
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

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('Starting supplier submission...');
      const suppliersRef = ref(realtimeDb, 'suppliers');
      const newSupplierRef = push(suppliersRef);
      const supplierId = newSupplierRef.key;
      console.log('Generated supplier ID:', supplierId);

      const supplierData = {
        supplierId: supplierId,
        name: formData.supplierName,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
        contactNumber: formData.contactNumber,
        status: "Active",
        createdAt: new Date().toISOString()
      };
      console.log('Supplier data to save:', supplierData);

      await push(suppliersRef, supplierData);
      console.log('Supplier saved successfully to Firebase');

      toast({
        title: "Success",
        description: "Supplier added successfully",
      });

      // Reset form
      setFormData({
        supplierName: "",
        address: "",
        phoneNumber: "",
        contactNumber: "",
      });

      onSupplierAdded(); // Refresh supplier list
      onOpenChange(false); // Close modal
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast({
        title: "Error",
        description: "Failed to add supplier. Please try again.",
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
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter supplier address"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number *</Label>
            <Input
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleInputChange}
              placeholder="Enter contact number"
              required
            />
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