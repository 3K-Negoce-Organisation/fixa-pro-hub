import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Menu, Package, LogOut, Settings, ChevronDown, Database, Palette } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logoVisABois from "@/assets/logo-vis-a-bois.jpeg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SupplierSettingsDialog } from "@/components/admin/SupplierSettingsDialog";
import { ThemeSettingsDialog } from "@/components/admin/ThemeSettingsDialog";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ENVIRONMENT, getEnvironmentLabel, getEnvironmentColor } from "@/lib/environment";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Fonction pour générer un slug URL à partir du nom de catégorie
const categoryToSlug = (category: string): string => {
  return category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/\s+/g, "-") // Espaces vers tirets
    .replace(/[^a-z0-9-]/g, ""); // Supprimer caractères spéciaux
};

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [dbInfoDialogOpen, setDbInfoDialogOpen] = useState(false);
  const [dbStats, setDbStats] = useState<{ table: string; count: number }[]>([]);
  const navigate = useNavigate();
  const adminMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch categories from database
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("is_active", true)
        .not("category", "is", null);

      if (error) throw error;

      // Get unique categories and count
      const categoryMap = new Map<string, number>();
      data?.forEach((p) => {
        if (p.category) {
          categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
        }
      });

      // Convert to array and sort by name
      return Array.from(categoryMap.entries())
        .map(([name, count]) => ({
          name,
          slug: categoryToSlug(name),
          count,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleAdminMenuEnter = () => {
    if (adminMenuTimeoutRef.current) {
      clearTimeout(adminMenuTimeoutRef.current);
      adminMenuTimeoutRef.current = null;
    }
    setAdminMenuOpen(true);
  };

  const handleAdminMenuLeave = () => {
    adminMenuTimeoutRef.current = setTimeout(() => {
      setAdminMenuOpen(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (adminMenuTimeoutRef.current) {
        clearTimeout(adminMenuTimeoutRef.current);
      }
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour >= 18 ? "Bonsoir" : "Bonjour";
  };

  const getDisplayName = () => {
    if (userFirstName) {
      return `${getGreeting()} ${userFirstName}`;
    }
    return userEmail || "Compte";
  };

  const loadUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data?.first_name) {
      setUserFirstName(data.first_name);
    } else {
      setUserFirstName(null);
    }
  };

  useEffect(() => {
    const checkAdmin = async (userId: string | undefined) => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      const {
        data
      } = await supabase.from('user_roles' as any).select('role').eq('user_id', userId).eq('role', 'admin').single();
      setIsAdmin(!!data);
    };
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email ?? null);
      checkAdmin(session?.user?.id);
      if (session?.user?.id) {
        loadUserProfile(session.user.id);
      } else {
        setUserFirstName(null);
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUserEmail(session?.user?.email ?? null);
      checkAdmin(session?.user?.id);
      if (session?.user?.id) {
        loadUserProfile(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchDbStats = async () => {
    const tables = ['products', 'profiles', 'orders', 'order_items', 'user_carts', 'supplier_settings', 'user_roles'];
    const stats: { table: string; count: number }[] = [];
    
    for (const table of tables) {
      const { count } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
      stats.push({ table, count: count || 0 });
    }
    
    setDbStats(stats);
  };

  const openDbInfoDialog = () => {
    fetchDbStats();
    setDbInfoDialogOpen(true);
  };

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
  return <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
      {/* Main header */}
      <div className="py-3 px-4">
        <div className="flex items-center justify-between gap-6 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img 
              src={logoVisABois} 
              alt="Vis à Bois" 
              className="h-10 md:h-12 w-auto"
            />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex">
              <Input type="search" placeholder="Rechercher un produit, une référence..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 pl-4 pr-4 bg-background text-foreground border-0 rounded-l-md rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0" />
              <Button type="submit" className="h-10 px-4 bg-accent hover:bg-accent/90 rounded-l-none rounded-r-md">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/compte" className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-foreground hover:underline">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">{getDisplayName()}</span>
            </Link>

            {/* Admin dropdown visible only for pierre.kabore@gmail.com on all environments */}
            {userEmail === "pierre.kabore@gmail.com" && (
              <div 
                className="relative"
                onMouseEnter={handleAdminMenuEnter}
                onMouseLeave={handleAdminMenuLeave}
              >
                <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-foreground hover:underline">
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline">Admin</span>
                  <span className={`hidden md:inline text-xs px-1.5 py-0.5 rounded ${getEnvironmentColor()} bg-primary-foreground/20`}>
                    {getEnvironmentLabel()}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {adminMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-background border border-border rounded-md shadow-lg z-50">
                    <Link 
                      to="/admin/commandes" 
                      className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      Gestion des commandes
                    </Link>
                    <Link 
                      to="/admin/produits" 
                      className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      Gestion des produits
                    </Link>
                    <button
                      onClick={() => setSupplierDialogOpen(true)}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      Paramètres fournisseur
                    </button>
                    <button
                      onClick={() => setThemeDialogOpen(true)}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Palette className="h-4 w-4" />
                      Personnalisation thème
                    </button>
                    <div className="border-t border-border" />
                    <button
                      onClick={openDbInfoDialog}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Database className="h-4 w-4" />
                      Infos Base de Données
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <SupplierSettingsDialog 
              open={supplierDialogOpen} 
              onOpenChange={setSupplierDialogOpen} 
            />
            
            <ThemeSettingsDialog
              open={themeDialogOpen}
              onOpenChange={setThemeDialogOpen}
            />

            {/* Database Info Dialog */}
            <Dialog open={dbInfoDialogOpen} onOpenChange={setDbInfoDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Infos Base de Données
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Environnement:</span>
                      <span className={getEnvironmentColor()}>{getEnvironmentLabel()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Supabase Project ID:</span>
                      <code className="text-xs bg-background px-2 py-0.5 rounded">
                        {import.meta.env.VITE_SUPABASE_PROJECT_ID || "N/A"}
                      </code>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Supabase URL:</span>
                      <code className="text-xs bg-background px-2 py-0.5 rounded truncate max-w-[180px]" title={import.meta.env.VITE_SUPABASE_URL}>
                        {import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0] || "N/A"}
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Tables & Enregistrements</h4>
                    <div className="bg-muted rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left px-3 py-2 font-medium">Table</th>
                            <th className="text-right px-3 py-2 font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbStats.map((stat) => (
                            <tr key={stat.table} className="border-b border-border last:border-0">
                              <td className="px-3 py-1.5 font-mono text-xs">{stat.table}</td>
                              <td className="px-3 py-1.5 text-right font-medium">{stat.count}</td>
                            </tr>
                          ))}
                          {dbStats.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-3 py-2 text-center text-muted-foreground">
                                Chargement...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {userEmail && <button onClick={handleLogout} className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-foreground hover:underline">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>}
          </div>
        </div>
      </div>

      {/* Categories nav */}
      <nav className="bg-primary-foreground/5 border-t border-primary-foreground/10">
        <div className="px-4 bg-primary">
          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link to="/produits" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap">
                <Menu className="h-4 w-4" />
                Tous les produits
              </Link>
              {categories.map((cat) => (
                <Link 
                  key={cat.slug} 
                  to={`/produits?category=${cat.slug}`} 
                  className="px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}
              <Link to="/promos" className="px-3 py-1.5 text-sm font-medium text-accent hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap">
                Promos
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/suivi" className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap">
                <Package className="h-4 w-4" />
                <span className="hidden md:inline">Suivi de commandes</span>
              </Link>
              <CartDrawer />
            </div>
          </div>
        </div>
      </nav>
    </header>;
}