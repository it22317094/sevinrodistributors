import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowLeft, DollarSign, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ref, onValue, query, orderByChild, update, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { format, isAfter } from "date-fns";

interface Bill {
  id: string;
  billId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paid: number;
  balance: number;
  status: "Unpaid" | "Partially Paid" | "Paid";
  dueDate: string;
  linkedOrderIds: string[];
  createdAt: string;
  description?: string;
}

export default function Billing() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
    fetchSuppliers();
    
    // Apply filters from URL params
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    
    if (status === 'unpaid') {
      setStatusFilter('unpaid');
    }
    if (supplierId) {
      setSupplierFilter(supplierId);
    }
  }, [searchParams]);

  useEffect(() => {
    filterBills();
  }, [bills, searchTerm, statusFilter, supplierFilter]);

  const fetchBills = () => {
    const billsRef = ref(realtimeDb, 'bills');
    const billsQuery = query(billsRef, orderByChild('dueDate'));
    
    const unsubscribe = onValue(billsQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const billsList = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        }));
        setBills(billsList);
      } else {
        setBills([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching bills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bills",
        variant: "destructive",
      });
      setLoading(false);
    });

    return unsubscribe;
  };

  const fetchSuppliers = () => {
    const suppliersRef = ref(realtimeDb, 'suppliers');
    
    const unsubscribe = onValue(suppliersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const suppliersList = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        }));
        setSuppliers(suppliersList);
      } else {
        setSuppliers([]);
      }
    });

    return unsubscribe;
  };

  const filterBills = () => {
    let filtered = bills;

    if (searchTerm) {
      filtered = filtered.filter(bill => 
        bill.billId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === 'unpaid') {
      filtered = filtered.filter(bill => bill.balance > 0);
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(bill => bill.status === statusFilter);
    }

    if (supplierFilter !== "all") {
      filtered = filtered.filter(bill => bill.supplierId === supplierFilter);
    }

    // Sort by overdue first, then by due date
    filtered.sort((a, b) => {
      const aOverdue = isAfter(new Date(), new Date(a.dueDate));
      const bOverdue = isAfter(new Date(), new Date(b.dueDate));
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    setFilteredBills(filtered);
  };

  const markBillAsPaid = async (billId: string, amount: number) => {
    setUpdating(billId);
    try {
      const billRef = ref(realtimeDb, `bills/${billId}`);
      await update(billRef, {
        status: 'Paid',
        paid: amount,
        balance: 0,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Bill marked as paid successfully",
      });
    } catch (error: any) {
      console.error('Error marking bill as paid:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark bill as paid",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string, balance: number) => {
    if (balance <= 0) {
      return <Badge variant="default">Paid</Badge>;
    }
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Unpaid": "destructive",
      "Partially Paid": "secondary",
      "Paid": "default"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const isOverdue = (dueDate: string, balance: number) => {
    if (balance <= 0) return false;
    return isAfter(new Date(), new Date(dueDate));
  };

  const unpaidBills = filteredBills.filter(bill => bill.balance > 0);
  const totalUnpaid = unpaidBills.reduce((sum, bill) => sum + bill.balance, 0);
  const overdueBills = unpaidBills.filter(bill => isOverdue(bill.dueDate, bill.balance));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Bills & Invoices</h1>
            <p className="text-muted-foreground">Manage supplier bills and payments</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unpaid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalUnpaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{unpaidBills.length} bills</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Bills</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueBills.length}</div>
              <p className="text-xs text-muted-foreground">Require immediate attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredBills.length}</div>
              <p className="text-xs text-muted-foreground">All bills shown</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Bill ID or Supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid (Exact)</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bills & Invoices</CardTitle>
            <CardDescription>All supplier bills and payment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linked Orders</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading bills...
                      </TableCell>
                    </TableRow>
                  ) : filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No bills found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => {
                      const overdue = isOverdue(bill.dueDate, bill.balance);
                      return (
                        <TableRow key={bill.id} className={overdue ? "bg-destructive/5" : ""}>
                          <TableCell className="font-medium">{bill.billId || bill.id}</TableCell>
                          <TableCell>{bill.supplierName}</TableCell>
                          <TableCell>${bill.amount.toLocaleString()}</TableCell>
                          <TableCell>${bill.paid.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={bill.balance > 0 ? "text-destructive font-medium" : ""}>
                              ${bill.balance.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={overdue ? "text-destructive font-medium" : ""}>
                                {format(new Date(bill.dueDate), "MMM dd, yyyy")}
                              </span>
                              {overdue && <AlertCircle className="h-4 w-4 text-destructive" />}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(bill.status, bill.balance)}</TableCell>
                          <TableCell>
                            {bill.linkedOrderIds?.length ? (
                              <Badge variant="outline">{bill.linkedOrderIds.length} orders</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {bill.balance > 0 && (
                              <Button 
                                size="sm"
                                onClick={() => markBillAsPaid(bill.id, bill.amount)}
                                disabled={updating === bill.id}
                              >
                                {updating === bill.id ? "Updating..." : "Mark as Paid"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}