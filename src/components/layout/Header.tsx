import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, Menu, Package, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { totalItems } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produits?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
      {/* Top bar */}
      <div className="border-b border-primary-foreground/10">
        <div className="container flex items-center justify-between py-1.5 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>04 XX XX XX XX</span>
            </span>
            <span>Livraison gratuite dès 150€ HT</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/compte" className="hover:underline">Mon compte Pro</Link>
            <Link to="/suivi" className="hover:underline">Suivi de commande</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container py-3">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Package className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">vis-a-bois</span>
              <span className="text-[10px] text-primary-foreground/70">Matériel de fixation</span>
            </div>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <Input
                type="search"
                placeholder="Rechercher un produit, une référence... (ex: vis terrasse 5x50)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 bg-background text-foreground border-0 rounded-sm"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-accent hover:bg-accent/90 rounded-sm px-4"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/compte">
                <User className="h-5 w-5 mr-1.5" />
                <span className="hidden lg:inline">Compte</span>
              </Link>
            </Button>

            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 relative" asChild>
              <Link to="/panier">
                <ShoppingCart className="h-5 w-5 mr-1.5" />
                <span className="hidden lg:inline">Panier</span>
                {totalItems > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent text-accent-foreground text-xs">
                    {totalItems > 99 ? "99+" : totalItems}
                  </Badge>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Categories nav */}
      <nav className="bg-primary-foreground/5 border-t border-primary-foreground/10">
        <div className="container">
          <div className="flex items-center gap-1 py-1.5 overflow-x-auto">
            <Link
              to="/produits"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
            >
              <Menu className="h-4 w-4" />
              Tous les produits
            </Link>
            <Link
              to="/produits?cat=terrasse"
              className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
            >
              Vis Terrasse
            </Link>
            <Link
              to="/produits?cat=charpente"
              className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
            >
              Vis Charpente
            </Link>
            <Link
              to="/produits?cat=agglo"
              className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
            >
              Vis Agglo
            </Link>
            <Link
              to="/produits?cat=boulonnerie"
              className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
            >
              Boulonnerie
            </Link>
            <Link
              to="/promos"
              className="px-3 py-1.5 text-sm font-medium text-accent hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
            >
              Promos
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
