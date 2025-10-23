import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, DollarSign, Package } from "lucide-react";
import { ref, get } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  total: number;
  status: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
}

interface CustomerInvoicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function CustomerInvoicesModal({
  open,
  onOpenChange,
  customerId,
  customerName,
}: CustomerInvoicesModalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      fetchCustomerInvoices();
    }
  }, [open, customerId]);

  const fetchCustomerInvoices = async () => {
    setLoading(true);
    try {
      const invoicesRef = ref(realtimeDb, 'invoices');
      const snapshot = await get(invoicesRef);
      
      if (snapshot.exists()) {
        const allInvoices = snapshot.val();
        const customerInvoices = Object.entries(allInvoices)
          .filter(([_, invoice]: [string, any]) => 
            invoice.customerId === customerId
          )
          .map(([id, invoice]: [string, any]) => ({
            id,
            invoiceNumber: invoice.invoiceNumber || invoice.invoiceNo || 'N/A',
            date: invoice.date || invoice.createdAt || '',
            dueDate: invoice.dueDate || '',
            total: invoice.total || 0,
            status: invoice.status || 'Pending',
            items: invoice.items || []
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setInvoices(customerInvoices);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error("Error fetching customer invoices:", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'overdue':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidAmount = invoices.filter(inv => inv.status.toLowerCase() === 'paid').reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            Invoice History
          </DialogTitle>
          <DialogDescription className="text-base">
            All invoices for <span className="font-semibold text-foreground">{customerName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <Card className="border-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Total Invoices</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{invoices.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-success/20 bg-success/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Paid</span>
              </div>
              <div className="text-2xl font-bold text-success">
                Rs. {paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-destructive/20 bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-destructive" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Pending</span>
              </div>
              <div className="text-2xl font-bold text-destructive">
                Rs. {pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Invoices List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No invoices found for this customer</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <Card key={invoice.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Invoice Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                          {invoice.invoiceNumber}
                        </Badge>
                        <Badge className={`${getStatusColor(invoice.status)} border`}>
                          {invoice.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Date:</span>
                          <span>{invoice.date}</span>
                        </div>
                        {invoice.dueDate && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">Due:</span>
                            <span>{invoice.dueDate}</span>
                          </div>
                        )}
                      </div>

                      {invoice.items && invoice.items.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{invoice.items.length} item{invoice.items.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Amount</div>
                      <div className="text-3xl font-bold text-primary">
                        Rs. {invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {invoice.items && invoice.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Items</div>
                      <div className="grid gap-2">
                        {invoice.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                            <span className="font-medium">{item.name}</span>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span>Qty: {item.quantity}</span>
                              <span>@ Rs. {item.price.toLocaleString('en-IN')}</span>
                              <span className="font-semibold text-foreground">
                                Rs. {item.amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        ))}
                        {invoice.items.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            + {invoice.items.length - 3} more item{invoice.items.length - 3 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
