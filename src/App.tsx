import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import AuthGuard from "@/components/auth/AuthGuard";
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import PromosPage from "./pages/PromosPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/suivi" element={<OrderTrackingPage />} />
            <Route path="/confirmation" element={<OrderConfirmationPage />} />
            <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
            <Route path="/produits" element={<AuthGuard><ProductsPage /></AuthGuard>} />
            <Route path="/promos" element={<AuthGuard><PromosPage /></AuthGuard>} />
            <Route path="/produit/:handle" element={<AuthGuard><ProductDetailPage /></AuthGuard>} />
            <Route path="/panier" element={<AuthGuard><CartPage /></AuthGuard>} />
            <Route path="/compte" element={<AuthGuard><AccountPage /></AuthGuard>} />
            <Route path="/admin/commandes" element={<AuthGuard><AdminOrdersPage /></AuthGuard>} />
            <Route path="/admin/produits" element={<AuthGuard><AdminProductsPage /></AuthGuard>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
