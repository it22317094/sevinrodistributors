import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
  if (!delivery) return null;

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
            <Label className="text-sm font-medium">Items Delivered</Label>
            <div className="text-sm text-muted-foreground">{delivery.itemsDelivered}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}