import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ref, update, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

interface Delivery {
  id: string;
  companyName: string;
  address: string;
  deliveryDate: string;
  status: string;
  itemsDelivered: number;
}

interface DeliveryDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: Delivery | null;
}

export function DeliveryDetailsModal({ open, onOpenChange, delivery }: DeliveryDetailsModalProps) {
  const { toast } = useToast();

  if (!delivery) return null;

  const handleMarkDelivered = async () => {
    try {
      const deliveryRef = ref(realtimeDb, `deliveries/${delivery.id}`);
      await update(deliveryRef, {
        status: "Delivered",
        deliveredAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Marked as delivered.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking delivery as delivered:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Couldn't update delivery status.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delivery Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Company Name</Label>
            <div className="text-sm text-muted-foreground">{delivery.companyName}</div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Address</Label>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{delivery.address}</div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Delivery Date</Label>
            <div className="text-sm text-muted-foreground">{delivery.deliveryDate}</div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div>
              <Badge variant={delivery.status === "Delivered" ? "default" : delivery.status === "In Transit" ? "secondary" : "outline"}>
                {delivery.status}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Items</Label>
            <div className="text-sm text-muted-foreground">{delivery.itemsDelivered}</div>
          </div>
        </div>
        
        {delivery.status !== "Delivered" && (
          <DialogFooter>
            <Button 
              onClick={handleMarkDelivered}
              className="bg-green-600 hover:bg-green-700"
            >
              Mark Delivered
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}