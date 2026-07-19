import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveBlogCta, type BlogCtaType, type BlogPost } from "@/lib/blog";

const ICONS: Record<Exclude<BlogCtaType, "custom">, typeof Package> = {
  catalogue: Package,
  devis: MessageSquare,
  avis: Star,
};

interface BlogCtaProps {
  post: Pick<BlogPost, "cta_type" | "cta_label" | "cta_url">;
}

export function BlogCta({ post }: BlogCtaProps) {
  const cta = resolveBlogCta(post);
  const type = (post.cta_type || "catalogue") as BlogCtaType;
  const Icon = type === "custom" ? ArrowRight : ICONS[type] ?? ArrowRight;
  const external = cta.url.startsWith("http");

  return (
    <aside className="mt-12 rounded-lg border border-primary/25 bg-primary/5 p-6 md:p-8">
      <p className="text-sm font-medium text-primary mb-1">Et maintenant ?</p>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Passez à l&apos;action sur Vis-à-Bois
      </h2>
      <p className="text-sm text-muted-foreground mb-3 max-w-xl">
        Retrouvez nos vis à bois professionnelles, demandez conseil, ou partagez votre avis
        pour aider d&apos;autres artisans et bricoleurs.
      </p>
      <p className="text-sm text-muted-foreground mb-5">
        Vous avez une question ?{" "}
        <Link to="/contact" className="text-primary underline underline-offset-2 hover:text-primary/80">
          Contactez-nous
        </Link>
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {external ? (
            <a href={cta.url} target="_blank" rel="noopener noreferrer">
              <Icon className="h-4 w-4 mr-2" />
              {cta.label}
            </a>
          ) : (
            <Link to={cta.url}>
              <Icon className="h-4 w-4 mr-2" />
              {cta.label}
            </Link>
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link to="/produits">Voir le site</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/avis-clients">Laisser un avis</Link>
        </Button>
      </div>
    </aside>
  );
}
