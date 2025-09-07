import { useState, useEffect, useCallback, useMemo } from 'react';
import { ref, onValue, off, get, runTransaction } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface Sale {
  id: string;
  date: string;
  customerId: string;
  items: Array<{
    sku: string;
    description: string;
    qty: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'unpaid' | 'partial';
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isActive: boolean;
}

export const useFirebaseReports = () => {
  const { isAuthenticated } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoiceCounter, setInvoiceCounter] = useState<number>(10004);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const salesRef = ref(realtimeDb, 'sales');
    const inventoryRef = ref(realtimeDb, 'inventory');
    const customersRef = ref(realtimeDb, 'customers');
    const counterRef = ref(realtimeDb, 'invoiceCounter');

    const unsubscribeSales = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const salesArray = Object.entries(data).map(([id, sale]: [string, any]) => ({
          id,
          ...sale,
        }));
        setSales(salesArray);
      } else {
        setSales([]);
      }
    }, (err) => {
      console.error('Sales fetch error:', err);
      setSales([]); // Set empty array instead of error to prevent render loop
    });

    const unsubscribeInventory = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const inventoryArray = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          ...item,
        }));
        setInventory(inventoryArray);
      } else {
        setInventory([]);
      }
    }, (err) => {
      console.error('Inventory fetch error:', err);
      setInventory([]); // Set empty array instead of error to prevent render loop
    });

    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customersArray = Object.entries(data).map(([id, customer]: [string, any]) => ({
          id,
          ...customer,
        }));
        setCustomers(customersArray);
      } else {
        setCustomers([]);
      }
    }, (err) => {
      console.error('Customers fetch error:', err);
      setCustomers([]); // Set empty array instead of error to prevent render loop
    });

    const unsubscribeCounter = onValue(counterRef, (snapshot) => {
      const data = snapshot.val();
      setInvoiceCounter(data || 10004);
      setLoading(false);
    }, (err) => {
      console.error('Counter fetch error:', err);
      setInvoiceCounter(10004); // Set default value instead of error to prevent render loop
      setLoading(false);
    });

    return () => {
      off(salesRef);
      off(inventoryRef);
      off(customersRef);
      off(counterRef);
    };
  }, [isAuthenticated]);

  const incrementInvoiceCounter = useCallback(async (): Promise<number> => {
    const counterRef = ref(realtimeDb, 'invoiceCounter');
    let newCounter = 10004;
    
    try {
      await runTransaction(counterRef, (currentValue) => {
        newCounter = (currentValue || 10004) + 1;
        return newCounter;
      });
    } catch (error) {
      console.error('Error incrementing invoice counter:', error);
    }
    
    return newCounter;
  }, []);

  // Calculate KPIs with useMemo to prevent infinite re-renders
  const calculateKPIs = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Current month sales
    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });

    // Previous month sales
    const previousMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === previousMonth && saleDate.getFullYear() === previousYear;
    });

    const totalSalesMTD = currentMonthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalSalesPrevious = previousMonthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    const outstandingAmount = sales
      .filter(sale => sale.status !== 'paid')
      .reduce((sum, sale) => sum + (sale.total || 0), 0);

    const inventoryValue = inventory.reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.costPrice || 0)), 0);

    const activeCustomers = customers.filter(customer => customer.isActive).length;

    // Calculate COGS for profit margin
    const currentMonthCOGS = currentMonthSales.reduce((sum, sale) => {
      const saleCOGS = sale.items.reduce((itemSum, item) => {
        const inventoryItem = inventory.find(inv => inv.sku === item.sku);
        const costPrice = inventoryItem?.costPrice || 0;
        return itemSum + (item.qty * costPrice);
      }, 0);
      return sum + saleCOGS;
    }, 0);

    const profitMargin = totalSalesMTD > 0 
      ? ((totalSalesMTD - currentMonthCOGS) / totalSalesMTD) * 100 
      : 0;

    return {
      totalSalesMTD,
      totalSalesPrevious,
      outstandingAmount,
      inventoryValue,
      activeCustomers,
      previousActiveCustomers: activeCustomers, // Simplified for now
      profitMargin,
      salesChange: totalSalesPrevious > 0 
        ? ((totalSalesMTD - totalSalesPrevious) / totalSalesPrevious) * 100 
        : 0,
    };
  }, [sales, inventory, customers]);

  return {
    sales,
    inventory,
    customers,
    invoiceCounter,
    loading,
    error,
    isAuthenticated,
    calculateKPIs,
    incrementInvoiceCounter,
  };
};