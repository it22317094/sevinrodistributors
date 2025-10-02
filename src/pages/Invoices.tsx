import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, FileText, DollarSign, Calendar, ChevronDown } from "lucide-react";
import { ref, get, update } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceGenerator } from "@/hooks/useInvoiceGenerator";
import CustomerInvoiceModal from "@/components/CustomerInvoiceModal";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
  date: string;
  createdAt: string;
}

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { generateInvoicePDF, loading: pdfLoading } = useInvoiceGenerator();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showCustomerInvoiceModal, setShowCustomerInvoiceModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const invoicesRef = ref(realtimeDb, 'invoices');
        const snapshot = await get(invoicesRef);
        
        if (snapshot.exists()) {
          const invoicesData = snapshot.val();
          const invoicesList: Invoice[] = Object.entries(invoicesData).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
          }));
          
          setInvoices(invoicesList);
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Filter and sort invoices
  useEffect(() => {
    let filtered = invoices.filter(invoice => {
      const matchesSearch = (invoice.invoiceNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (invoice.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort invoices
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, statusFilter, sortOrder]);

  const getTotalAmount = () => {
    return invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
  };

  const getPendingCount = () => {
    return invoices.filter(invoice => invoice.status === 'pending').length;
  };

  const getOverdueCount = () => {
    // For demo purposes, consider invoices older than 30 days as overdue
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return invoices.filter(invoice => 
      invoice.status === 'pending' && new Date(invoice.date) < thirtyDaysAgo
    ).length;
  };


  const handleMarkPaid = async (invoiceId: string, invoice: Invoice) => {
    try {
      // Update invoice status in Firebase
      const invoiceRef = ref(realtimeDb, `invoices/${invoiceId}`);
      await update(invoiceRef, { status: 'paid' });

      // Update local state
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
        )
      );

      toast({
        title: "Invoice marked as paid",
        description: `Invoice ${invoice.invoiceNumber} has been marked as paid.`,
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error updating invoice",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Invoice Management</h1>
            <p className="text-muted-foreground">Create and manage customer invoices</p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button variant="outline" onClick={() => setShowCustomerInvoiceModal(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Customer Invoice
            </Button>
            <Button onClick={() => navigate('/dashboard')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.length}</div>
              <p className="text-xs text-muted-foreground">Total created</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">RS {getTotalAmount().toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{getPendingCount()}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{getOverdueCount()}</div>
              <p className="text-xs text-muted-foreground">Requires follow-up</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search invoices..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-background">
                    Filter by Status
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border shadow-lg z-50">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")} className="hover:bg-accent">
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("pending")} className="hover:bg-accent">
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("paid")} className="hover:bg-accent">
                    Paid
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("overdue")} className="hover:bg-accent">
                    Overdue
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-background">
                    Sort by Date
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border shadow-lg z-50">
                  <DropdownMenuItem onClick={() => setSortOrder("newest")} className="hover:bg-accent">
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("oldest")} className="hover:bg-accent">
                    Oldest First
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Manage customer invoices and payment tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {invoices.length === 0 ? "No invoices found. Create your first invoice!" : "No invoices match your current filters."}
                </p>
                <Button className="mt-4" onClick={() => navigate('/dashboard')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => generateInvoicePDF(invoice.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                        <Badge 
                          variant={
                            invoice.status === "paid" ? "default" : 
                            invoice.status === "pending" ? "secondary" : 
                            "destructive"
                          }
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Customer: {invoice.customerName}</p>
                        <p>Invoice Date: {invoice.date}</p>
                        <p>Created: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-primary">RS {invoice.total?.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Amount</div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={pdfLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            generateInvoicePDF(invoice.id);
                          }}
                        >
                          {pdfLoading ? 'Generating...' : 'Generate PDF'}
                        </Button>
                        {invoice.status !== "paid" && (
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkPaid(invoice.id, invoice);
                            }}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Invoice Modal */}
        <CustomerInvoiceModal
          open={showCustomerInvoiceModal}
          onOpenChange={setShowCustomerInvoiceModal}
          customerId={selectedCustomer?.id}
          customerName={selectedCustomer?.name}
        />
      </div>
    </div>
  );
}