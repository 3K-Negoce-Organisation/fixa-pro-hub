import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Menu, Package, LogOut } from "lucide-react";
import ScrewIcon from "@/components/icons/ScrewIcon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CartDrawer } from "@/components/cart/CartDrawer";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/auth");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produits?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
      {/* Main header */}
      <div className="py-3 px-4">
        <div className="flex items-center justify-between gap-6 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <ScrewIcon size={32} className="text-primary-foreground" />
            <span className="font-bold text-lg leading-none">Vis à Bois</span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex">
              <Input
                type="search"
                placeholder="Rechercher un produit, une référence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-4 pr-4 bg-background text-foreground border-0 rounded-l-md rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button type="submit" className="h-10 px-4 bg-accent hover:bg-accent/90 rounded-l-none rounded-r-md">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/compte" className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-foreground hover:underline">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">{userEmail || "Compte"}</span>
            </Link>

            {userEmail && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-foreground hover:underline"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories nav */}
      <nav className="bg-primary-foreground/5 border-t border-primary-foreground/10">
        <div className="px-4 bg-primary">
          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link
                to="/produits"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
              >
                <Menu className="h-4 w-4" />
                Tous les produits
              </Link>
              <Link
                to="/produits?category=terrasse"
                className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
              >
                Vis Terrasse
              </Link>
              <Link
                to="/produits?category=charpente"
                className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
              >
                Vis Charpente
              </Link>
              <Link
                to="/produits?category=menuiserie"
                className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
              >
                Vis Menuiserie
              </Link>
              <Link
                to="/produits?category=tirefond"
                className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
              >
                Tirefond
              </Link>
              <Link
                to="/promos"
                className="px-3 py-1.5 text-sm font-medium text-accent hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
              >
                Promos
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/suivi"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
              >
                <Package className="h-4 w-4" />
                <span className="hidden md:inline">Suivi de commandes</span>
              </Link>
              <CartDrawer />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
