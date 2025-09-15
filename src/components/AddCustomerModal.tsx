import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ref, set, get, child } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerAdded?: () => void;
}

interface CustomerFormData {
  name: string;
  address: string;
  telephone: string;
  uniqueId: string;
}

export function AddCustomerModal({ open, onOpenChange, onCustomerAdded }: AddCustomerModalProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    address: "",
    telephone: "",
    uniqueId: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required.",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.address.trim()) {
      toast({
        title: "Validation Error",
        description: "Address is required.",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.telephone.trim()) {
      toast({
        title: "Validation Error",
        description: "Telephone number is required.",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.uniqueId.trim()) {
      toast({
        title: "Validation Error",
        description: "Unique ID is required.",
        variant: "destructive",
      });
      return false;
    }
    const phoneRegex = /^[+]?[(]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(formData.telephone)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid telephone number.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const checkUniqueId = async (uniqueId: string) => {
    try {
      const customersRef = ref(realtimeDb, 'customers');
      const snapshot = await get(child(customersRef, uniqueId));
      return snapshot.exists();
    } catch (error) {
      console.error("Error checking unique ID:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Check if unique ID already exists
      const idExists = await checkUniqueId(formData.uniqueId);
      if (idExists) {
        toast({
          title: "Error",
          description: "This Unique ID already exists. Please use a different ID.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Save customer with unique ID as key
      const customerRef = ref(realtimeDb, `customers/${formData.uniqueId}`);
      await set(customerRef, {
        name: formData.name,
        address: formData.address,
        telephone: formData.telephone,
        uniqueId: formData.uniqueId,
        createdAt: new Date().toISOString(),
        status: "Active",
        outstanding: "LKR 0.00",
      });

      toast({
        title: "Success",
        description: "Customer added successfully!",
      });

      // Reset form and close modal
      setFormData({ name: "", address: "", telephone: "", uniqueId: "" });
      onOpenChange(false);
      
      // Notify parent component to refresh customer list
      if (onCustomerAdded) {
        onCustomerAdded();
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
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
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter the customer information below. All fields are required and the Unique ID must be unique.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Customer Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter customer name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter customer address"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telephone">Telephone No.</Label>
              <Input
                id="telephone"
                type="tel"
                value={formData.telephone}
                onChange={(e) => handleInputChange("telephone", e.target.value)}
                placeholder="Enter telephone number"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="uniqueId">Unique ID</Label>
              <Input
                id="uniqueId"
                value={formData.uniqueId}
                onChange={(e) => handleInputChange("uniqueId", e.target.value)}
                placeholder="Enter unique customer ID"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}