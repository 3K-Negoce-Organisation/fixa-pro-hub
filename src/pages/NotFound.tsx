import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PageBackground } from "@/components/layout/PageBackground";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageSeo } from "@/components/seo/PageSeo";
import { DEFAULT_DESCRIPTION, absoluteUrl } from "@/lib/seo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageBackground>
      <PageSeo
        title="Page introuvable — Vis-à-Bois"
        description={DEFAULT_DESCRIPTION}
        canonical={absoluteUrl(location.pathname)}
        noindex
      />
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Page non trouvée</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Retour à l'accueil
          </a>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default NotFound;
