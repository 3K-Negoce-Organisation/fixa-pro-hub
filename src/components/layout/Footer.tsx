import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="sticky bottom-0 z-40 bg-theme-footer text-theme-footer mt-auto">
      <div className="container py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Liens infos et légaux */}
          <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-sm">
            <Link to="/information-technique" className="text-theme-footer-hover hover:underline">Infos techniques</Link>
            <Link to="/blog" className="text-theme-footer-hover hover:underline">Blog</Link>
            <Link to="/faq" className="text-theme-footer-hover hover:underline">FAQ</Link>
            <Link to="/contact" className="text-theme-footer-hover hover:underline">Contact</Link>
            <span className="opacity-30 hidden md:inline">|</span>
            <Link to="/cgv" className="opacity-70 text-theme-footer-hover hover:underline">CGV</Link>
            <Link to="/mentions-legales" className="opacity-70 text-theme-footer-hover hover:underline">Mentions légales</Link>
            <Link to="/politique-confidentialite" className="opacity-70 text-theme-footer-hover hover:underline">Confidentialité</Link>
            <Link to="/cookies" className="opacity-70 text-theme-footer-hover hover:underline">Cookies</Link>
            <Link to="/livraison" className="opacity-70 text-theme-footer-hover hover:underline">Livraison</Link>
            <Link to="/retours" className="opacity-70 text-theme-footer-hover hover:underline">Retours</Link>
          </div>
          
          {/* Copyright */}
          <p className="text-xs opacity-50 shrink-0">
            © 2024 vis-a-bois
          </p>
        </div>
      </div>
    </footer>
  );
}