import { useState, useEffect } from "react";
import { ref, get, set, push, remove } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export interface Customer {
  id: string;
  uniqueId?: string;
  name: string;
  contact: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'Active' | 'Inactive' | 'Overdue';
  outstanding: number;
  lastOrder?: string;
  createdAt: string;
  updatedAt: string;
}

export function useFirebaseCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const customersRef = ref(realtimeDb, 'customers');
      const snapshot = await get(customersRef);
      
      if (snapshot.exists()) {
        const customersData = snapshot.val();
        const customersList: Customer[] = Object.entries(customersData).map(([id, data]: [string, any]) => ({
          id,
          ...data
        }));
        setCustomers(customersList);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      const customersRef = ref(realtimeDb, 'customers');
      const newCustomerRef = push(customersRef);
      
      const newCustomer: Omit<Customer, 'id'> = {
        ...customerData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await set(newCustomerRef, newCustomer);
      
      toast({
        title: "Success",
        description: "Customer added successfully"
      });
      
      await fetchCustomers(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCustomer = async (customerId: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    try {
      setLoading(true);
      const customerRef = ref(realtimeDb, `customers/${customerId}`);
      
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await set(customerRef, updateData);
      
      toast({
        title: "Success",
        description: "Customer updated successfully"
      });
      
      await fetchCustomers(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    try {
      setLoading(true);
      const customerRef = ref(realtimeDb, `customers/${customerId}`);
      await remove(customerRef);
      
      toast({
        title: "Success",
        description: "Customer deleted successfully"
      });
      
      await fetchCustomers(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer
  };
}