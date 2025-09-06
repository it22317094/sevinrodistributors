import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, DollarSign, AlertCircle } from "lucide-react";

interface PendingBillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PendingBillsModal({ open, onOpenChange }: PendingBillsModalProps) {
  const [bills, setBills] = useState<any[]>([]);
  const { getDocuments, updateDocument } = useFirestore('bills');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPendingBills();
    }
  }, [open]);

  const fetchPendingBills = async () => {
    try {
      const billsData = await getDocuments();
      const pendingBills = billsData.filter((bill: any) => bill.status === 'Pending');
      setBills(pendingBills);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch pending bills",
        variant: "destructive",
      });
    }
  };

  const handlePayBill = async (billId: string) => {
    try {
      await updateDocument(billId, { 
        status: 'Paid', 
        paidDate: new Date().toISOString() 
      });
      toast({
        title: "Success",
        description: "Bill marked as paid",
      });
      fetchPendingBills(); // Refresh bills
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bill",
        variant: "destructive",
      });
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending Bills
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {bills.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending bills found</p>
          ) : (
            bills.map((bill) => (
              <Card key={bill.id} className={isOverdue(bill.dueDate) ? "border-destructive" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Bill #{bill.billNumber}
                        {isOverdue(bill.dueDate) && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Supplier: {bill.supplierName}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {new Date(bill.dueDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${bill.amount}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isOverdue(bill.dueDate) ? "destructive" : "outline"}>
                        {isOverdue(bill.dueDate) ? "Overdue" : "Pending"}
                      </Badge>
                      <Button size="sm" onClick={() => handlePayBill(bill.id)}>
                        Mark as Paid
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Description:</strong> {bill.description}</p>
                    <p><strong>Invoice Date:</strong> {new Date(bill.invoiceDate).toLocaleDateString()}</p>
                    {bill.notes && <p><strong>Notes:</strong> {bill.notes}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}