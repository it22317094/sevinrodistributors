import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Truck, Package, MapPin, Calendar } from "lucide-react";
import { ScheduleDeliveryModal } from "@/components/ScheduleDeliveryModal";
import { DeliveryDetailsModal } from "@/components/DeliveryDetailsModal";
import { ref, onValue } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

interface Delivery {
  id: string;
  companyName: string;
  address: string;
  deliveryDate: string;
  status: string;
  itemsDelivered: number;
  createdAt?: number;
}

export default function Delivery() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  useEffect(() => {
    const deliveriesRef = ref(realtimeDb, 'deliveries');
    const unsubscribe = onValue(deliveriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deliveriesArray = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        }));
        setDeliveries(deliveriesArray);
      } else {
        setDeliveries([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDeliveryScheduled = () => {
    // Deliveries will be updated automatically via the real-time listener
  };

  const handleShowDetails = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setDetailsModalOpen(true);
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Delivery Management</h1>
            <p className="text-muted-foreground">Manage delivery status and good receiver notes</p>
          </div>
          <Button className="mt-4 sm:mt-0" onClick={() => setScheduleModalOpen(true)}>
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
            <CardDescription>Manage delivery status and good receiver notes</CardDescription>
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
                      <h3 className="font-semibold text-lg">{delivery.companyName}</h3>
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
                      <p>Address: {delivery.address}</p>
                      <p>Date: {delivery.deliveryDate}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-primary">{delivery.itemsDelivered}</div>
                      <div className="text-xs text-muted-foreground">Items</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleShowDetails(delivery)}>
                        Details
                      </Button>
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

        <ScheduleDeliveryModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          onDeliveryScheduled={handleDeliveryScheduled}
        />

        <DeliveryDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          delivery={selectedDelivery}
        />
      </div>
    </div>
  );
}