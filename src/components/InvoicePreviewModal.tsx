import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AggregatedItem } from "@/hooks/useInvoiceFromOrders";
import { useInvoicePDFGenerator } from "@/hooks/useInvoicePDFGenerator";

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerName: string;
  items: AggregatedItem[];
  invoiceNumber?: number;
  onConfirm?: () => Promise<void>;
  showConfirmButton?: boolean;
}

export function InvoicePreviewModal({ 
  open, 
  onOpenChange, 
  customerId, 
  customerName, 
  items, 
  invoiceNumber,
  onConfirm,
  showConfirmButton = true 
}: InvoicePreviewModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { generateInvoicePDF, loading: pdfLoading } = useInvoicePDFGenerator();

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;

  const handleConfirm = async () => {
    if (onConfirm) {
      setIsConfirming(true);
      try {
        await onConfirm();
        onOpenChange(false);
      } finally {
        setIsConfirming(false);
      }
    }
  };

  const handleGeneratePDF = async () => {
    if (invoiceNumber) {
      await generateInvoicePDF(invoiceNumber.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoiceNumber ? `Invoice #${invoiceNumber}` : 'Invoice Preview'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">SEVINRO DISTRIBUTORS</h2>
                <div className="text-sm text-muted-foreground mt-2">
                  <p>No. 138/A, Alawwa, Gampaha</p>
                  <p>Tel: 071 39 65 580, 0777 92 90 36</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold">INVOICE</h3>
                {invoiceNumber && (
                  <>
                    <p className="text-sm">Invoice No.: {invoiceNumber}</p>
                    <p className="text-sm">Order No.: {invoiceNumber}</p>
                    <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4">
              <p className="font-semibold">TO:</p>
              <p>{customerName}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead className="w-16">No.</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Qty.</TableHead>
                  <TableHead className="w-32">Price</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={`${item.itemCode}-${item.unitPrice}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.itemCode}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>Rs. {item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">Rs. {item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                
                {/* Empty rows for spacing */}
                {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, index) => (
                  <TableRow key={`empty-${index}`}>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Total */}
            <div className="border-t p-4 bg-orange-50">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="font-semibold">Total Amount: Rs. {total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Signature lines */}
          <div className="flex justify-between pt-8 border-t">
            <div className="text-center">
              <div className="border-b border-dotted border-gray-400 w-48 mb-2"></div>
              <p className="text-sm">Authorised By</p>
            </div>
            <div className="text-center">
              <div className="border-b border-dotted border-gray-400 w-48 mb-2"></div>
              <p className="text-sm">Customer Signature</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {invoiceNumber && (
              <Button 
                variant="outline" 
                onClick={handleGeneratePDF}
                disabled={pdfLoading}
              >
                {pdfLoading ? "Generating PDF..." : "Generate PDF"}
              </Button>
            )}
            {showConfirmButton && (
              <Button 
                onClick={handleConfirm}
                disabled={isConfirming || items.length === 0}
              >
                {isConfirming ? "Creating..." : "Confirm & Create Invoice"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}