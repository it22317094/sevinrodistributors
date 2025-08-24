import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);

  const myItems = [
    { id: 1, name: 'Premium Cotton Fabric', category: 'Cotton', price: 450, quantity: 100, status: 'approved' },
    { id: 2, name: 'Silk Blend Material', category: 'Silk', price: 850, quantity: 50, status: 'pending' },
    { id: 3, name: 'Organic Hemp Fabric', category: 'Hemp', price: 320, quantity: 75, status: 'approved' }
  ];

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Item submitted",
      description: "Your item has been submitted for admin approval.",
    });
    setShowAddForm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Supplier Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {user?.name || user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Supplier</Badge>
              <Button variant="outline" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <Package className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved Items</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Items</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Item */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add New Item
                <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {showAddForm ? 'Cancel' : 'Add Item'}
                </Button>
              </CardTitle>
              <CardDescription>Submit new inventory items for approval</CardDescription>
            </CardHeader>
            <CardContent>
              {showAddForm ? (
                <form onSubmit={handleSubmitItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input id="itemName" placeholder="Enter item name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cotton">Cotton</SelectItem>
                        <SelectItem value="silk">Silk</SelectItem>
                        <SelectItem value="wool">Wool</SelectItem>
                        <SelectItem value="synthetic">Synthetic</SelectItem>
                        <SelectItem value="hemp">Hemp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price per meter</Label>
                      <Input id="price" type="number" placeholder="₹0" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity (meters)</Label>
                      <Input id="quantity" type="number" placeholder="0" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Describe the fabric details" />
                  </div>
                  <Button type="submit" className="w-full">Submit for Approval</Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click "Add Item" to submit new inventory</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Items */}
          <Card>
            <CardHeader>
              <CardTitle>My Items</CardTitle>
              <CardDescription>Items you've submitted to the inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                      <p className="text-sm">₹{item.price}/meter • {item.quantity} meters</p>
                    </div>
                    <Badge 
                      variant={item.status === 'approved' ? 'default' : 'secondary'}
                      className={item.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}