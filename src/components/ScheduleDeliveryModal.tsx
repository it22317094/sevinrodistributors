import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ref, push, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

interface ScheduleDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeliveryScheduled: () => void;
}

export function ScheduleDeliveryModal({ open, onOpenChange, onDeliveryScheduled }: ScheduleDeliveryModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!companyName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Company name is required",
      });
      return;
    }
    
    if (!address.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Delivery address is required",
      });
      return;
    }
    
    if (!deliveryDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Delivery date is required",
      });
      return;
    }

    setLoading(true);
    
    try {
      const deliveriesRef = ref(realtimeDb, 'deliveries');
      await push(deliveriesRef, {
        companyName: companyName.trim(),
        address: address.trim(),
        deliveryDate: format(deliveryDate, 'yyyy-MM-dd'),
        status: "Scheduled",
        itemsDelivered: 0,
        createdAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Delivery scheduled",
      });
      
      // Reset form
      setCompanyName("");
      setAddress("");
      setDeliveryDate(undefined);
      
      onOpenChange(false);
      onDeliveryScheduled();
    } catch (error) {
      console.error("Error scheduling delivery:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Couldn't save delivery. Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Delivery</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Delivery Address *</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter delivery address"
              rows={3}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Delivery Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deliveryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deliveryDate}
                  onSelect={setDeliveryDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Scheduling..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}