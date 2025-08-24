import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Invoices from "./pages/Invoices";
import Delivery from "./pages/Delivery";
import Reports from "./pages/Reports";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Role-specific Dashboards */}
              <Route 
                path="/admin-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/supplier-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['supplier']}>
                    <SupplierDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/customer-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin-only Routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Header />
                    <Index />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/suppliers" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Header />
                    <Suppliers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/customers" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Header />
                    <Customers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/inventory" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Header />
                    <Inventory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/invoices" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Header />
                    <Invoices />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/delivery" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Header />
                    <Delivery />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Header />
                    <Reports />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
