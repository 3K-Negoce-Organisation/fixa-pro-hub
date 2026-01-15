import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="sticky bottom-0 z-40 bg-zinc-900 text-white mt-auto">
      {/* Colonnes de liens */}
      <div className="container py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
          {/* Catégories */}
          <div>
            <Link to="/produits?category=terrasse" className="font-medium hover:underline">Vis Terrasse</Link>
            <p className="text-sm text-white/60 mt-1">Inox A2 & A4, têtes fraisées</p>
          </div>
          <div>
            <Link to="/produits?category=charpente" className="font-medium hover:underline">Vis Charpente</Link>
            <p className="text-sm text-white/60 mt-1">Gros diamètres, haute résistance</p>
          </div>
          <div>
            <Link to="/produits?category=menuiserie" className="font-medium hover:underline">Vis Menuiserie</Link>
            <p className="text-sm text-white/60 mt-1">Précision et finition</p>
          </div>
          <div>
            <Link to="/produits" className="font-medium hover:underline">Tous les produits</Link>
            <p className="text-sm text-white/60 mt-1">Catalogue complet</p>
          </div>
          
          {/* Informations */}
          <div>
            <Link to="/information-technique" className="font-medium hover:underline">Infos techniques</Link>
            <p className="text-sm text-white/60 mt-1">Guides & documentation</p>
          </div>
          <div>
            <Link to="/faq" className="font-medium hover:underline">FAQ</Link>
            <p className="text-sm text-white/60 mt-1">Questions fréquentes</p>
          </div>
          <div>
            <Link to="/contact" className="font-medium hover:underline">Contact</Link>
            <p className="text-sm text-white/60 mt-1">Service client</p>
          </div>
        </div>
      </div>

      {/* Liens légaux centrés */}
      <div className="border-t border-white/10">
        <div className="container py-4 flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/70">
            <Link to="/cgv" className="hover:text-white hover:underline">CGV</Link>
            <Link to="/mentions-legales" className="hover:text-white hover:underline">Mentions légales</Link>
            <Link to="/politique-confidentialite" className="hover:text-white hover:underline">Politique de confidentialité</Link>
            <Link to="/cookies" className="hover:text-white hover:underline">Cookies</Link>
            <Link to="/livraison" className="hover:text-white hover:underline">Livraison</Link>
            <Link to="/retours" className="hover:text-white hover:underline">Retours & SAV</Link>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-white/50">
            © 2024 vis-a-bois - Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
}