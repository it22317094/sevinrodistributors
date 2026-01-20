import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toTabularText } from "@/lib/tabularFile";

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: (items: ParsedItem[]) => void;
}

interface ParsedItem {
  styleNo: string;
  description: string;
  unitPrice: number;
}

export function BulkImportModal({ open, onOpenChange, onImportSuccess }: BulkImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewItems, setPreviewItems] = useState<ParsedItem[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'csv' || fileExtension === 'xlsx' || fileExtension === 'xls') {
        setFile(selectedFile);
        setPreviewItems([]);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
          variant: "destructive",
        });
      }
    }
  };

  const parseFile = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { fileContent, inferredType, sheetName, rowCount } = await toTabularText(file);

      console.log(
        "Sending file to parse:",
        file.name,
        inferredType === "xlsx" ? `(sheet: ${sheetName}, rows: ${rowCount ?? "?"})` : ""
      );

      const { data, error } = await supabase.functions.invoke('parse-inventory-file', {
        body: {
          fileContent,
          fileName: file.name,
        },
      });

      if (error) {
        console.error("Error parsing file:", error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const items = data?.items || [];
      
      if (items.length === 0) {
        toast({
          title: "No items found",
          description: "The file doesn't contain any valid items",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      setPreviewItems(items);
      toast({
        title: "File parsed successfully",
        description: `Found ${items.length} items ready to import`,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Failed to parse file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (previewItems.length === 0) {
      toast({
        title: "No items to import",
        description: "Please parse a file first",
        variant: "destructive",
      });
      return;
    }

    onImportSuccess(previewItems);
    setFile(null);
    setPreviewItems([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setFile(null);
    setPreviewItems([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Invoice Items</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV or Excel file with columns: Style No, Description, Unit Price.
              The system will intelligently detect column names regardless of format.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <div className="flex gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              <Button
                onClick={parseFile}
                disabled={!file || isProcessing}
                variant="outline"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Parse
                  </>
                )}
              </Button>
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          {previewItems.length > 0 && (
            <div className="space-y-2">
              <Label>Preview ({previewItems.length} items)</Label>
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Style No</th>
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-right p-2 font-medium">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{item.styleNo}</td>
                        <td className="p-2">{item.description || '-'}</td>
                        <td className="p-2 text-right">Rs. {item.unitPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={previewItems.length === 0}
            >
              Import {previewItems.length > 0 && `(${previewItems.length})`} Items
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
