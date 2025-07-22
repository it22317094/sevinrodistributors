import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Truck, Package, MapPin, Calendar } from "lucide-react";

const deliveries = [
  { id: "DEL-001", customer: "Fashion House Ltd", address: "123 Fashion St, NYC", status: "In Transit", driver: "John Doe", date: "2024-01-15", items: 5 },
  { id: "DEL-002", customer: "Designer Boutique", address: "456 Style Ave, LA", status: "Delivered", driver: "Jane Smith", date: "2024-01-14", items: 3 },
  { id: "DEL-003", customer: "Retail Chain Co", address: "789 Commerce Rd, Chicago", status: "Scheduled", driver: "Mike Johnson", date: "2024-01-16", items: 8 },
  { id: "DEL-004", customer: "Modern Tailors", address: "321 Craft Lane, Boston", status: "Preparing", driver: "Sarah Davis", date: "2024-01-15", items: 2 },
];

export default function Delivery() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Delivery Management</h1>
            <p className="text-muted-foreground">Track deliveries and manage good receiver notes</p>
          </div>
          <Button className="mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Delivery
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">23</div>
              <p className="text-xs text-muted-foreground">Currently en route</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Deliveries</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Scheduled today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">125</div>
              <p className="text-xs text-muted-foreground">Successfully delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search deliveries..." className="pl-10" />
              </div>
              <Button variant="outline">Filter by Status</Button>
              <Button variant="outline">Sort by Date</Button>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries List */}
        <Card>
          <CardHeader>
            <CardTitle>Deliveries</CardTitle>
            <CardDescription>Track delivery status and manage good receiver notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{delivery.id}</h3>
                      <Badge 
                        variant={
                          delivery.status === "Delivered" ? "default" : 
                          delivery.status === "In Transit" ? "secondary" : 
                          delivery.status === "Scheduled" ? "outline" :
                          "secondary"
                        }
                      >
                        {delivery.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Customer: {delivery.customer}</p>
                      <p>Address: {delivery.address}</p>
                      <p>Driver: {delivery.driver}</p>
                      <p>Date: {delivery.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-primary">{delivery.items}</div>
                      <div className="text-xs text-muted-foreground">Items</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Track</Button>
                      <Button variant="outline" size="sm">Details</Button>
                      {delivery.status === "Delivered" && (
                        <Button size="sm">Good Receipt</Button>
                      )}
                      {delivery.status === "In Transit" && (
                        <Button size="sm">Update Status</Button>
                      )}
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