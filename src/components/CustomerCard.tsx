import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  status: string;
  outstanding: number;
  lastOrder?: string;
}

interface CustomerCardProps {
  customer: Customer;
  onInvoiceClick: (customerId: string, customerName: string) => void;
}

export function CustomerCard({ customer, onInvoiceClick }: CustomerCardProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold text-lg">{customer.name}</h3>
          <Badge variant={customer.status === "Active" ? "default" : "destructive"}>
            {customer.status}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Contact: {customer.contact}</p>
          <p>Email: {customer.email}</p>
          <p>Last Order: {customer.lastOrder}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
        <div className="text-center">
          <div className={`text-lg font-semibold ${customer.status === "Overdue" ? "text-destructive" : "text-primary"}`}>
            Rs. {customer.outstanding.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Outstanding</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">View</Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onInvoiceClick(customer.id, customer.name)}
          >
            Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}