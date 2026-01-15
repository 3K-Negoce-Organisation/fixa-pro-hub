import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="sticky bottom-0 z-40 bg-zinc-900 text-white mt-auto">
      <div className="container py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Liens infos et légaux */}
          <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-sm">
            <Link to="/information-technique" className="hover:text-white/80 hover:underline">Infos techniques</Link>
            <Link to="/faq" className="hover:text-white/80 hover:underline">FAQ</Link>
            <Link to="/contact" className="hover:text-white/80 hover:underline">Contact</Link>
            <span className="text-white/30 hidden md:inline">|</span>
            <Link to="/cgv" className="text-white/70 hover:text-white hover:underline">CGV</Link>
            <Link to="/mentions-legales" className="text-white/70 hover:text-white hover:underline">Mentions légales</Link>
            <Link to="/politique-confidentialite" className="text-white/70 hover:text-white hover:underline">Confidentialité</Link>
            <Link to="/cookies" className="text-white/70 hover:text-white hover:underline">Cookies</Link>
            <Link to="/livraison" className="text-white/70 hover:text-white hover:underline">Livraison</Link>
            <Link to="/retours" className="text-white/70 hover:text-white hover:underline">Retours</Link>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-white/50 shrink-0">
            © 2024 vis-a-bois
          </p>
        </div>
      </div>
    </footer>
  );
}