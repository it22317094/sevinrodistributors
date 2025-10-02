import { useState } from "react";
import { ref, get, set, runTransaction } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export interface OrderItem {
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface AggregatedItem {
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  status: string;
  invoiced?: boolean;
  invoiceNumber?: number;
}

export interface InvoiceData {
  number: number;
  customerId: string;
  customerName: string;
  items: AggregatedItem[];
  subtotal: number;
  total: number;
  date: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function useInvoiceFromOrders() {
  const [loading, setLoading] = useState(false);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  const fetchEligibleOrders = async (customerId: string) => {
    try {
      setLoading(true);
      const ordersRef = ref(realtimeDb, 'orders');
      const snapshot = await get(ordersRef);
      
      if (!snapshot.exists()) {
        setEligibleOrders([]);
        setAggregatedItems([]);
        return [];
      }

      const ordersData = snapshot.val();
      const orders: Order[] = Object.entries(ordersData)
        .map(([id, orderData]: [string, any]) => ({
          id,
          ...orderData
        }))
        .filter((order: Order) => 
          order.customerId === customerId &&
          (order.status === 'CONFIRMED' || order.status === 'READY') &&
          !order.invoiced
        );

      setEligibleOrders(orders);

      // Aggregate items
      const itemsMap = new Map<string, AggregatedItem>();
      
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            const key = `${item.itemCode}-${item.unitPrice}`;
            if (itemsMap.has(key)) {
              const existingItem = itemsMap.get(key)!;
              existingItem.quantity += item.quantity;
              existingItem.total += item.total;
            } else {
              itemsMap.set(key, {
                itemCode: item.itemCode,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total
              });
            }
          });
        }
      });

      const aggregated = Array.from(itemsMap.values());
      setAggregatedItems(aggregated);
      
      return orders;
    } catch (error) {
      console.error('Error fetching eligible orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch eligible orders",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async (customerId: string, customerName: string): Promise<number | null> => {
    try {
      setLoading(true);

      if (eligibleOrders.length === 0) {
        toast({
          title: "No Orders",
          description: "No eligible orders found for this customer",
          variant: "destructive"
        });
        return null;
      }

      // Check if customer already has an invoice
      const invoicesRef = ref(realtimeDb, 'invoices');
      const invoicesSnapshot = await get(invoicesRef);
      
      let existingInvoiceNumber: number | null = null;
      let existingInvoiceData: InvoiceData | null = null;

      if (invoicesSnapshot.exists()) {
        const invoicesData = invoicesSnapshot.val();
        // Find existing invoice for this customer
        for (const [invoiceNum, invoice] of Object.entries(invoicesData)) {
          const inv = invoice as InvoiceData;
          if (inv.customerId === customerId) {
            existingInvoiceNumber = Number(invoiceNum);
            existingInvoiceData = inv;
            break;
          }
        }
      }

      if (existingInvoiceNumber && existingInvoiceData) {
        // Merge new items with existing invoice
        const existingItemsMap = new Map<string, AggregatedItem>();
        
        // Add existing items to map
        existingInvoiceData.items.forEach(item => {
          const key = `${item.itemCode}-${item.unitPrice}`;
          existingItemsMap.set(key, { ...item });
        });

        // Merge new aggregated items
        aggregatedItems.forEach(item => {
          const key = `${item.itemCode}-${item.unitPrice}`;
          if (existingItemsMap.has(key)) {
            const existingItem = existingItemsMap.get(key)!;
            existingItem.quantity += item.quantity;
            existingItem.total += item.total;
          } else {
            existingItemsMap.set(key, { ...item });
          }
        });

        const mergedItems = Array.from(existingItemsMap.values());
        const subtotal = mergedItems.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal;

        // Update existing invoice
        const updatedInvoiceData: InvoiceData = {
          ...existingInvoiceData,
          items: mergedItems,
          subtotal,
          total,
          updatedAt: new Date().toISOString()
        };

        const invoiceRef = ref(realtimeDb, `invoices/${existingInvoiceNumber}`);
        await set(invoiceRef, updatedInvoiceData);

        // Update orders to mark as invoiced
        const updatePromises = eligibleOrders.map(order => {
          const orderRef = ref(realtimeDb, `orders/${order.id}`);
          return set(orderRef, {
            ...order,
            invoiced: true,
            invoiceNumber: existingInvoiceNumber,
            status: 'INVOICED',
            updatedAt: new Date().toISOString()
          });
        });

        await Promise.all(updatePromises);

        toast({
          title: "Success",
          description: `Invoice ${existingInvoiceNumber} updated with new items`,
        });

        return existingInvoiceNumber;
      } else {
        // Create new invoice
        const counterRef = ref(realtimeDb, 'invoiceCounter');
        const invoiceNumber = await runTransaction(counterRef, (currentValue) => {
          if (currentValue === null) {
            return 10000;
          }
          return currentValue + 1;
        });

        if (invoiceNumber.committed && invoiceNumber.snapshot.val()) {
          const newInvoiceNumber = invoiceNumber.snapshot.val();
          
          const subtotal = aggregatedItems.reduce((sum, item) => sum + item.total, 0);
          const total = subtotal;

          const invoiceData: InvoiceData = {
            number: newInvoiceNumber,
            customerId,
            customerName,
            items: aggregatedItems,
            subtotal,
            total,
            date: new Date().toISOString().split('T')[0],
            status: 'CREATED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const invoiceRef = ref(realtimeDb, `invoices/${newInvoiceNumber}`);
          await set(invoiceRef, invoiceData);

          const updatePromises = eligibleOrders.map(order => {
            const orderRef = ref(realtimeDb, `orders/${order.id}`);
            return set(orderRef, {
              ...order,
              invoiced: true,
              invoiceNumber: newInvoiceNumber,
              status: 'INVOICED',
              updatedAt: new Date().toISOString()
            });
          });

          await Promise.all(updatePromises);

          toast({
            title: "Success",
            description: `Invoice ${newInvoiceNumber} created successfully`,
          });

          return newInvoiceNumber;
        }

        throw new Error('Failed to generate invoice number');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    aggregatedItems,
    eligibleOrders,
    fetchEligibleOrders,
    createInvoice
  };
}