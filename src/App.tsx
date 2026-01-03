import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";

import AuthGuard from "@/components/auth/AuthGuard";
import AdminGuard from "@/components/auth/AdminGuard";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import PromosPage from "./pages/PromosPage";
import MentionsLegalesPage from "./pages/MentionsLegalesPage";
import PolitiqueConfidentialitePage from "./pages/PolitiqueConfidentialitePage";
import CookiesPage from "./pages/CookiesPage";
import FAQPage from "./pages/FAQPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <CookieConsent />
            
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/suivi" element={<AuthGuard><OrderTrackingPage /></AuthGuard>} />
              <Route path="/confirmation" element={<AuthGuard><OrderConfirmationPage /></AuthGuard>} />
              <Route path="/paiement-annule" element={<AuthGuard><PaymentCancelPage /></AuthGuard>} />
              <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
              <Route path="/produits" element={<AuthGuard><ProductsPage /></AuthGuard>} />
              <Route path="/promos" element={<AuthGuard><PromosPage /></AuthGuard>} />
              <Route path="/produit/:handle" element={<AuthGuard><ProductDetailPage /></AuthGuard>} />
              <Route path="/panier" element={<AuthGuard><CartPage /></AuthGuard>} />
              <Route path="/compte" element={<AuthGuard><AccountPage /></AuthGuard>} />
              <Route path="/admin/commandes" element={<AdminGuard><AdminOrdersPage /></AdminGuard>} />
              <Route path="/admin/produits" element={<AdminGuard><AdminProductsPage /></AdminGuard>} />
              <Route path="/mentions-legales" element={<AuthGuard><MentionsLegalesPage /></AuthGuard>} />
              <Route path="/politique-confidentialite" element={<AuthGuard><PolitiqueConfidentialitePage /></AuthGuard>} />
              <Route path="/cookies" element={<AuthGuard><CookiesPage /></AuthGuard>} />
              <Route path="/faq" element={<AuthGuard><FAQPage /></AuthGuard>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<AuthGuard><NotFound /></AuthGuard>} />
            </Routes>
          </BrowserRouter>
        </FavoritesProvider>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
