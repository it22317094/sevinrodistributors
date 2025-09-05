import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Package, AlertTriangle, Layers, Eye, Trash2, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { ref, push, set, onValue, query, orderByChild } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  inventoryNo: string;
  item: string;
  description: string;
  unitPrice: number;
  category: string;
  quantity?: number;
  unit?: string;
  minStock?: number;
  supplier?: string;
}

interface InventoryLog {
  id: string;
  inventoryId: string;
  action: string;
  quantity: number;
  timestamp: number;
  notes?: string;
}

export default function Inventory() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"low-high" | "high-low">("low-high");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryLog[]>([]);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  
  const [formData, setFormData] = useState({
    inventoryNo: "",
    item: "",
    description: "",
    unitPrice: "",
    category: ""
  });

  const categories = ["Cotton", "Silk", "Polyester", "Linen", "Wool", "Denim"];

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const inventoryRef = ref(realtimeDb, 'inventory');
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      const items = data ? Object.entries(data).map(([key, value]: [string, any]) => ({
        id: key,
        ...value
      })) : [];
      setInventory(items);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    let filtered = inventory.filter(item => 
      item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    filtered.sort((a, b) => {
      const aStock = a.quantity || 0;
      const bStock = b.quantity || 0;
      return sortOrder === "low-high" ? aStock - bStock : bStock - aStock;
    });

    setFilteredInventory(filtered);
  }, [inventory, searchTerm, selectedCategory, sortOrder]);

  const handleAddItem = async () => {
    if (!isAuthenticated) return;
    
    try {
      const inventoryRef = ref(realtimeDb, 'inventory');
      const newItemRef = push(inventoryRef);
      
      await set(newItemRef, {
        inventoryNo: formData.inventoryNo,
        item: formData.item,
        description: formData.description,
        unitPrice: parseFloat(formData.unitPrice),
        category: formData.category,
        quantity: 0,
        unit: "units",
        minStock: 10,
        supplier: "TBD",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      setFormData({
        inventoryNo: "",
        item: "",
        description: "",
        unitPrice: "",
        category: ""
      });
      setShowAddModal(false);
      
      toast({
        title: "Success",
        description: "Item added to inventory successfully",
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        title: "Error",
        description: "Failed to add item to inventory",
        variant: "destructive",
      });
    }
  };

  const handleAdjustStock = async () => {
    if (!isAuthenticated || !selectedItem) return;
    
    try {
      const newQuantity = parseInt(adjustQuantity);
      if (isNaN(newQuantity) || newQuantity < 0) {
        toast({
          title: "Error",
          description: "Please enter a valid quantity",
          variant: "destructive",
        });
        return;
      }

      // Update inventory item
      const itemRef = ref(realtimeDb, `inventory/${selectedItem.id}`);
      await set(itemRef, {
        ...selectedItem,
        quantity: newQuantity,
        updatedAt: Date.now()
      });

      // Log the adjustment
      const logsRef = ref(realtimeDb, 'inventoryLogs');
      const newLogRef = push(logsRef);
      await set(newLogRef, {
        inventoryId: selectedItem.id,
        action: `Stock adjusted to ${newQuantity}`,
        quantity: newQuantity,
        timestamp: Date.now(),
        notes: adjustNotes || undefined
      });

      setShowAdjustModal(false);
      setAdjustQuantity("");
      setAdjustNotes("");
      setSelectedItem(null);
      
      toast({
        title: "Success",
        description: "Stock quantity updated successfully",
      });
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast({
        title: "Error",
        description: "Failed to adjust stock quantity",
        variant: "destructive",
      });
    }
  };

  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustQuantity((item.quantity || 0).toString());
    setShowAdjustModal(true);
  };

  const openRemoveConfirm = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowRemoveConfirm(true);
  };

  const handleRemoveStock = async () => {
    if (!isAuthenticated || !selectedItem) return;
    
    try {
      // Update inventory item to zero stock
      const itemRef = ref(realtimeDb, `inventory/${selectedItem.id}`);
      await set(itemRef, {
        ...selectedItem,
        quantity: 0,
        updatedAt: Date.now()
      });

      // Log the removal
      const logsRef = ref(realtimeDb, 'inventoryLogs');
      const newLogRef = push(logsRef);
      await set(newLogRef, {
        inventoryId: selectedItem.id,
        action: "Stock removed (set to 0)",
        quantity: 0,
        timestamp: Date.now(),
        notes: "Stock completely removed"
      });

      setShowRemoveConfirm(false);
      setSelectedItem(null);
      
      toast({
        title: "Success",
        description: "Stock removed successfully",
      });
    } catch (error) {
      console.error("Error removing stock:", error);
      toast({
        title: "Error",
        description: "Failed to remove stock",
        variant: "destructive",
      });
    }
  };

  const handleViewHistory = async (item: InventoryItem) => {
    if (!isAuthenticated) return;
    
    try {
      const logsRef = ref(realtimeDb, 'inventoryLogs');
      const logsQuery = query(logsRef, orderByChild('inventoryId'));
      
      onValue(logsQuery, (snapshot) => {
        const data = snapshot.val();
        const logs = data ? Object.entries(data)
          .map(([key, value]: [string, any]) => ({ id: key, ...value }))
          .filter((log: any) => log.inventoryId === item.id)
          .sort((a: any, b: any) => b.timestamp - a.timestamp) : [];
        
        setSelectedItemHistory(logs);
        setSelectedItemName(item.item);
        setShowHistoryModal(true);
      }, { onlyOnce: true });
    } catch (error) {
      console.error("Error loading history:", error);
      toast({
        title: "Error",
        description: "Failed to load item history",
        variant: "destructive",
      });
    }
  };

  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => (item.quantity || 0) <= (item.minStock || 0)).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.unitPrice * (item.quantity || 0)), 0);
  const uniqueCategories = [...new Set(inventory.map(item => item.category))].length;
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Inventory Management</h1>
            <p className="text-muted-foreground">Track and manage your fabric inventory</p>
          </div>
          <Button className="mt-4 sm:mt-0" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">Different fabric types</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Need reordering</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Current inventory value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueCategories}</div>
              <p className="text-xs text-muted-foreground">Fabric categories</p>
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
                  placeholder="Search inventory..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => setSortOrder(sortOrder === "low-high" ? "high-low" : "low-high")}
              >
                Sort by Stock ({sortOrder === "low-high" ? "Low→High" : "High→Low"})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>Manage your fabric inventory and stock levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Inventory No</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right w-[100px]">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSortOrder(sortOrder === "low-high" ? "high-low" : "low-high")}
                        className="h-auto p-0 hover:bg-transparent"
                      >
                        Stock <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.inventoryNo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.item}</span>
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            {(item.quantity || 0) <= (item.minStock || 0) && (
                              <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                        <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${(item.quantity || 0) <= (item.minStock || 0) ? "text-destructive" : "text-primary"}`}>
                            {item.quantity || 0}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{item.unit || 'units'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="outline" size="sm" onClick={() => openAdjustModal(item)}>
                              Adjust
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => openRemoveConfirm(item)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleViewHistory(item)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No inventory items found. Add your first item to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Item Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="inventoryNo">Inventory Number</Label>
                <Input
                  id="inventoryNo"
                  value={formData.inventoryNo}
                  onChange={(e) => setFormData({ ...formData, inventoryNo: e.target.value })}
                  placeholder="INV-001"
                />
              </div>
              <div>
                <Label htmlFor="item">Item Name</Label>
                <Input
                  id="item"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  placeholder="Cotton Fabric - White"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="High quality cotton fabric"
                />
              </div>
              <div>
                <Label htmlFor="unitPrice">Unit Price</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="12.50"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddItem}
                  disabled={!formData.inventoryNo || !formData.item || !formData.description || !formData.unitPrice || !formData.category}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Adjust Stock Modal */}
        <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Stock - {selectedItem?.item}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  value={selectedItem?.quantity || 0}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="newQuantity">New Quantity</Label>
                <Input
                  id="newQuantity"
                  type="number"
                  min="0"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="Enter new quantity"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Reason for adjustment"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAdjustStock}
                  disabled={!adjustQuantity || adjustQuantity === (selectedItem?.quantity || 0).toString()}
                >
                  Update Stock
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Stock Confirmation */}
        <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Stock</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove all stock for "{selectedItem?.item}"? This will set the quantity to 0 and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveStock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove Stock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View History Modal */}
        <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Inventory History - {selectedItemName}</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {selectedItemHistory.length > 0 ? (
                <div className="space-y-3">
                  {selectedItemHistory.map((log) => (
                    <div key={log.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-sm text-muted-foreground">Quantity: {log.quantity}</p>
                          {log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No history available for this item.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}