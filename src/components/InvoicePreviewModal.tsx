import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AggregatedItem } from "@/hooks/useInvoiceFromOrders";
import { useInvoiceGenerator } from "@/hooks/useInvoiceGenerator";

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
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
  const { generateInvoicePDF, loading: pdfLoading } = useInvoiceGenerator();

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
                  <p>No - 136/A, Akarawita, Gampaha</p>
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
                <TableRow className="bg-orange-200">
                  <TableHead className="w-16 border-r border-orange-300">No.</TableHead>
                  <TableHead className="border-r border-orange-300">Style No</TableHead>
                  <TableHead className="border-r border-orange-300">Description</TableHead>
                  <TableHead className="w-20 border-r border-orange-300">Qty</TableHead>
                  <TableHead className="w-32 border-r border-orange-300">Price</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={`${item.itemCode}-${item.unitPrice}`} className="border-b">
                    <TableCell className="border-r border-gray-300">{index + 1}</TableCell>
                    <TableCell className="border-r border-gray-300">{item.itemCode}</TableCell>
                    <TableCell className="border-r border-gray-300">{item.description}</TableCell>
                    <TableCell className="border-r border-gray-300">{item.quantity}</TableCell>
                    <TableCell className="border-r border-gray-300">Rs. {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">Rs. {item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                
                {/* Empty rows for spacing */}
                {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, index) => (
                  <TableRow key={`empty-${index}`} className="border-b">
                    <TableCell className="border-r border-gray-300">&nbsp;</TableCell>
                    <TableCell className="border-r border-gray-300">&nbsp;</TableCell>
                    <TableCell className="border-r border-gray-300">&nbsp;</TableCell>
                    <TableCell className="border-r border-gray-300">&nbsp;</TableCell>
                    <TableCell className="border-r border-gray-300">&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Total */}
            <div className="border-t p-4 bg-orange-100">
              <div className="flex justify-end">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="font-semibold">Rs. {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signature lines */}
          <div className="flex justify-between pt-12 mt-8">
            <div className="text-center">
              <div className="border-b border-dotted border-gray-400 w-48 mb-2"></div>
              <p className="text-sm font-medium">Authorised By</p>
            </div>
            <div className="text-center">
              <div className="border-b border-dotted border-gray-400 w-48 mb-2"></div>
              <p className="text-sm font-medium">Customer Signature</p>
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