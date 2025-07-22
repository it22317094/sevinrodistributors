import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, AlertTriangle, Layers } from "lucide-react";

const inventory = [
  { id: 1, name: "Cotton Fabric - White", category: "Cotton", quantity: 450, unit: "yards", minStock: 100, supplier: "Premium Textiles", price: "$12.50" },
  { id: 2, name: "Silk Fabric - Royal Blue", category: "Silk", quantity: 75, unit: "yards", minStock: 50, supplier: "Global Fabric Co", price: "$45.00" },
  { id: 3, name: "Polyester Blend - Gray", category: "Polyester", quantity: 25, unit: "yards", minStock: 100, supplier: "Quality Materials", price: "$8.75" },
  { id: 4, name: "Linen Fabric - Natural", category: "Linen", quantity: 180, unit: "yards", minStock: 80, supplier: "Premium Textiles", price: "$22.00" },
];

export default function Inventory() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Inventory Management</h1>
            <p className="text-muted-foreground">Track and manage your fabric inventory</p>
          </div>
          <Button className="mt-4 sm:mt-0">
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
              <div className="text-2xl font-bold">847</div>
              <p className="text-xs text-muted-foreground">Different fabric types</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">12</div>
              <p className="text-xs text-muted-foreground">Need reordering</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$145,890</div>
              <p className="text-xs text-muted-foreground">Current inventory value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
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
                <Input placeholder="Search inventory..." className="pl-10" />
              </div>
              <Button variant="outline">Filter by Category</Button>
              <Button variant="outline">Sort by Stock</Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>Manage your fabric inventory and stock levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <Badge variant="outline">{item.category}</Badge>
                      {item.quantity <= item.minStock && (
                        <Badge variant="destructive">Low Stock</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Supplier: {item.supplier}</p>
                      <p>Price per unit: {item.price}</p>
                      <p>Minimum stock: {item.minStock} {item.unit}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${item.quantity <= item.minStock ? "text-destructive" : "text-primary"}`}>
                        {item.quantity}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.unit}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Adjust</Button>
                      <Button variant="outline" size="sm">Reorder</Button>
                      <Button variant="outline" size="sm">History</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}