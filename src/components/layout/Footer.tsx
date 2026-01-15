import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="sticky bottom-0 z-40 bg-zinc-900 text-white mt-auto">
      <div className="container py-4 flex flex-col items-center gap-2">
        {/* Liens produits et infos */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          <Link to="/produits?category=terrasse" className="hover:text-white/80 hover:underline">Vis Terrasse</Link>
          <Link to="/produits?category=charpente" className="hover:text-white/80 hover:underline">Vis Charpente</Link>
          <Link to="/produits?category=menuiserie" className="hover:text-white/80 hover:underline">Vis Menuiserie</Link>
          <Link to="/produits" className="hover:text-white/80 hover:underline">Tous les produits</Link>
          <Link to="/information-technique" className="hover:text-white/80 hover:underline">Infos techniques</Link>
          <Link to="/faq" className="hover:text-white/80 hover:underline">FAQ</Link>
          <Link to="/contact" className="hover:text-white/80 hover:underline">Contact</Link>
        </div>
        
        {/* Liens légaux */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-white/70">
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
    </footer>
  );
}