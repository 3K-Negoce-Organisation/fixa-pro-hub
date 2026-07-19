import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { AdminErrorProvider } from "@/contexts/AdminErrorContext";
import { StorefrontSiteProvider } from "@/contexts/StorefrontSiteContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import AuthGuard from "@/components/auth/AuthGuard";
import StorefrontAccessGuard from "@/components/auth/StorefrontAccessGuard";
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
import AdminBlogPage from "./pages/AdminBlogPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import AvisClientsPage from "./pages/AvisClientsPage";
import PromosPage from "./pages/PromosPage";
import MentionsLegalesPage from "./pages/MentionsLegalesPage";
import PolitiqueConfidentialitePage from "./pages/PolitiqueConfidentialitePage";
import CookiesPage from "./pages/CookiesPage";
import CGVPage from "./pages/CGVPage";
import LivraisonPage from "./pages/LivraisonPage";
import RetoursPage from "./pages/RetoursPage";
import FAQPage from "./pages/FAQPage";
import ContactPage from "./pages/ContactPage";
import InformationTechniquePage from "./pages/InformationTechniquePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider prioritizeSeoTags>
  <QueryClientProvider client={queryClient}>
    <StorefrontSiteProvider>
    <ThemeProvider>
      <TooltipProvider>
        <CartProvider>
          <FavoritesProvider>
            <AdminErrorProvider>
              <BrowserRouter>
                <Toaster />
                <Sonner />
                <CookieConsent />
                
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  {/* Suivi / confirmation : accessibles via lien email même boutique privée */}
                  <Route path="/suivi" element={<OrderTrackingPage />} />
                  <Route path="/confirmation" element={<OrderConfirmationPage />} />
                  <Route path="/paiement-annule" element={<StorefrontAccessGuard><PaymentCancelPage /></StorefrontAccessGuard>} />
                  <Route path="/" element={<StorefrontAccessGuard><Index /></StorefrontAccessGuard>} />
                  <Route path="/produits" element={<StorefrontAccessGuard><ProductsPage /></StorefrontAccessGuard>} />
                  <Route path="/promos" element={<StorefrontAccessGuard><PromosPage /></StorefrontAccessGuard>} />
                  <Route path="/produit/:handle" element={<StorefrontAccessGuard><ProductDetailPage /></StorefrontAccessGuard>} />
                  <Route path="/panier" element={<StorefrontAccessGuard><CartPage /></StorefrontAccessGuard>} />
                  <Route path="/compte" element={<AuthGuard><AccountPage /></AuthGuard>} />
                  <Route path="/admin/commandes" element={<AdminGuard><AdminOrdersPage /></AdminGuard>} />
                  <Route path="/admin/produits" element={<AdminGuard><AdminProductsPage /></AdminGuard>} />
                  <Route path="/admin/blog" element={<AdminGuard><AdminBlogPage /></AdminGuard>} />
                  <Route path="/blog" element={<StorefrontAccessGuard><BlogPage /></StorefrontAccessGuard>} />
                  <Route path="/blog/:slug" element={<StorefrontAccessGuard><BlogPostPage /></StorefrontAccessGuard>} />
                  <Route path="/avis-clients" element={<StorefrontAccessGuard><AvisClientsPage /></StorefrontAccessGuard>} />
                  <Route path="/mentions-legales" element={<StorefrontAccessGuard><MentionsLegalesPage /></StorefrontAccessGuard>} />
                  <Route path="/politique-confidentialite" element={<StorefrontAccessGuard><PolitiqueConfidentialitePage /></StorefrontAccessGuard>} />
                  <Route path="/cookies" element={<StorefrontAccessGuard><CookiesPage /></StorefrontAccessGuard>} />
                  <Route path="/cgv" element={<StorefrontAccessGuard><CGVPage /></StorefrontAccessGuard>} />
                  <Route path="/livraison" element={<StorefrontAccessGuard><LivraisonPage /></StorefrontAccessGuard>} />
                  <Route path="/retours" element={<StorefrontAccessGuard><RetoursPage /></StorefrontAccessGuard>} />
                  <Route path="/faq" element={<StorefrontAccessGuard><FAQPage /></StorefrontAccessGuard>} />
                  <Route path="/contact" element={<StorefrontAccessGuard><ContactPage /></StorefrontAccessGuard>} />
                  <Route path="/information-technique" element={<StorefrontAccessGuard><InformationTechniquePage /></StorefrontAccessGuard>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<StorefrontAccessGuard><NotFound /></StorefrontAccessGuard>} />
                </Routes>
              </BrowserRouter>
            </AdminErrorProvider>
          </FavoritesProvider>
        </CartProvider>
      </TooltipProvider>
    </ThemeProvider>
    </StorefrontSiteProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
