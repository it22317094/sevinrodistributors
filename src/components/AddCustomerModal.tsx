import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  email: string;
  address: string;
  telephone: string;
  branches: string[];
}

export function AddCustomerModal({ open, onOpenChange, onCustomerAdded }: AddCustomerModalProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    address: "",
    telephone: "",
    branches: [],
  });
  
  const branchOptions = [
    { value: "Branch 1", label: "Maharagama (M)" },
    { value: "Branch 2", label: "Horana (H)" },
    { value: "Branch 3", label: "Branch 3" },
    { value: "Branch 4", label: "Branch 4" },
    { value: "Branch 5", label: "Branch 5" },
    { value: "Branch 6", label: "Branch 6" },
  ];
  
  const handleBranchToggle = (branch: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      branches: checked 
        ? [...prev.branches, branch]
        : prev.branches.filter(b => b !== branch)
    }));
  };
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateUniqueId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `CUST-${timestamp}-${random}`.toUpperCase();
  };

  const validateForm = () => {
    // Validate email format if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return false;
      }
    }
    
    // Validate phone format if provided
    if (formData.telephone.trim()) {
      const phoneRegex = /^[+]?[(]?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(formData.telephone)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid telephone number.",
          variant: "destructive",
        });
        return false;
      }
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
      // Generate unique ID automatically
      const uniqueId = generateUniqueId();

      // Save customer with auto-generated unique ID as key
      const customerRef = ref(realtimeDb, `customers/${uniqueId}`);
      await set(customerRef, {
        name: formData.name,
        email: formData.email,
        contact: formData.telephone,
        branches: formData.branches,
        uniqueId: uniqueId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "Active",
        outstanding: 0,
      });

      toast({
        title: "Success",
        description: `Customer added successfully! ID: ${uniqueId}`,
      });

      // Reset form and close modal
      setFormData({ name: "", email: "", address: "", telephone: "", branches: [] });
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
            Enter the customer information below. A unique ID will be generated automatically.
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter customer address (optional)"
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
              />
            </div>
            <div className="grid gap-2">
              <Label>Branches</Label>
              <div className="grid grid-cols-3 gap-2">
                {branchOptions.map((branch) => (
                  <div key={branch.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={branch.value}
                      checked={formData.branches.includes(branch.value)}
                      onCheckedChange={(checked) => handleBranchToggle(branch.value, checked as boolean)}
                    />
                    <Label htmlFor={branch.value} className="text-sm font-normal cursor-pointer">
                      {branch.label}
                    </Label>
                  </div>
                ))}
              </div>
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