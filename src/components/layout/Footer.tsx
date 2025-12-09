import { Link } from "react-router-dom";
import { Package, Phone, Mail, MapPin, Truck, Shield, CreditCard } from "lucide-react";
export function Footer() {
  return <footer className="bg-foreground text-background mt-auto">
      {/* Trust badges */}
      <div className="border-b border-background/10">
        <div className="container py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold">Livraison Express</p>
                <p className="text-sm text-background/70">24/48h sur stock - Gratuite dès 150€ HT</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold">Qualité Garantie</p>
                <p className="text-sm text-background/70">Normes CE - Certifications ETA</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold">Paiement Sécurisé</p>
                <p className="text-sm text-background/70">CB, Virement, Compte Pro 30j</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Package className="h-6 w-6" />
              <span className="font-bold text-lg">vis-a-bois</span>
            </Link>
            <p className="text-sm text-background/70 mb-4">
              Spécialiste du matériel de fixation pour les professionnels du bâtiment depuis 1998.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <a href="tel:04XXXXXXXX" className="flex items-center gap-2 hover:text-accent">
                <Phone className="h-4 w-4" />
                04 XX XX XX XX
              </a>
              <a href="mailto:contact@vis-a-bois.fr" className="flex items-center gap-2 hover:text-accent">
                <Mail className="h-4 w-4" />
                contact@vis-a-bois.fr
              </a>
              
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Catégories</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link to="/produits?cat=terrasse" className="hover:text-background">Vis Terrasse</Link></li>
              <li><Link to="/produits?cat=charpente" className="hover:text-background">Vis Charpente</Link></li>
              <li>Vis menuiserie<Link to="/produits?cat=agglo" className="hover:text-background">Vis Aggloméré</Link></li>
              
              <li><Link to="/produits" className="hover:text-background">Tous les produits</Link></li>
            </ul>
          </div>

          {/* Account */}
          

          {/* Info */}
          <div>
            <h4 className="font-semibold mb-4">Informations</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link to="/cgv" className="hover:text-background">CGV Pro</Link></li>
              <li><Link to="/livraison" className="hover:text-background">Livraison</Link></li>
              <li><Link to="/retours" className="hover:text-background">Retours & SAV</Link></li>
              <li><Link to="/contact" className="hover:text-background">Contact</Link></li>
              
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-background/10">
        <div className="container py-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-background/50">
          <p>© 2024 vis-a-bois - Tous droits réservés</p>
          <div className="flex gap-4">
            <Link to="/mentions-legales" className="hover:text-background">Mentions légales</Link>
            <Link to="/confidentialite" className="hover:text-background">Politique de confidentialité</Link>
            <Link to="/cookies" className="hover:text-background">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>;
}