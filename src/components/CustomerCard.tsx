import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  status: string;
  outstanding: number;
  lastOrder?: string;
  outstandingInvoices?: Array<{
    invoiceNo: string;
    amount: number;
    dueDate?: string;
  }>;
}

interface CustomerCardProps {
  customer: Customer;
  onInvoiceClick: (customerId: string, customerName: string) => void;
}

export function CustomerCard({ customer, onInvoiceClick }: CustomerCardProps) {
  const hasOutstanding = customer.outstanding > 0;
  
  return (
    <div className="group relative overflow-hidden border rounded-lg bg-card transition-all hover:shadow-lg hover:border-primary/50">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between p-6 gap-4">
        <div className="flex-1 space-y-3">
          {/* Customer Name & Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-xl text-foreground">{customer.name}</h3>
            <Badge variant={customer.status === "Active" ? "default" : "destructive"} className="text-xs">
              {customer.status}
            </Badge>
          </div>
          
          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium">Contact:</span>
              <span>{customer.contact}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Email:</span>
                <span className="truncate">{customer.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Outstanding Summary - Sales Style */}
        <div className={`flex-shrink-0 p-4 rounded-lg border-2 ${
          hasOutstanding 
            ? 'bg-destructive/5 border-destructive/20' 
            : 'bg-success/5 border-success/20'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={`h-4 w-4 ${hasOutstanding ? 'text-destructive' : 'text-success'}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Outstanding Balance
            </span>
          </div>
          <div className={`text-2xl font-bold ${
            hasOutstanding ? 'text-destructive' : 'text-success'
          }`}>
            Rs. {customer.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {hasOutstanding && customer.outstandingInvoices && customer.outstandingInvoices.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {customer.outstandingInvoices.length} pending invoice{customer.outstandingInvoices.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Outstanding Invoices Details - Professional Sales Layout */}
      {hasOutstanding && customer.outstandingInvoices && customer.outstandingInvoices.length > 0 && (
        <div className="px-6 pb-4">
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Pending Invoices</h4>
            </div>
            <div className="grid gap-2">
              {customer.outstandingInvoices.map((invoice, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {invoice.invoiceNo}
                    </Badge>
                    {invoice.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due: {invoice.dueDate}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-destructive">
                    Rs. {invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 pb-6 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          View Details
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1"
          onClick={() => onInvoiceClick(customer.id, customer.name)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </div>
    </div>
  );
}