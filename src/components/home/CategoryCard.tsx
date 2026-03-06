import { Link } from "react-router-dom";
import { Layers, Frame, PanelTop, Wrench, LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  deck: Layers,
  frame: Frame,
  panel: PanelTop,
  bolt: Wrench,
};

interface CategoryCardProps {
  id: string;
  name: string;
  slug: string;
  count?: number;
  imageUrl?: string | null;
  icon?: string;
}

export function CategoryCard({ id, name, slug, imageUrl, icon }: CategoryCardProps) {
  const Icon = iconMap[icon || ""] || Layers;

  return (
    <Link to={`/produits?category=${slug}`} className="category-card group">
      {imageUrl ? (
        <div className="w-12 h-12 mb-2 rounded-lg overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <Icon className="h-8 w-8 text-primary hidden" />
        </div>
      ) : (
        <Icon className="h-8 w-8 text-primary mb-2" />
      )}
      <span className="font-medium text-sm text-center">{name}</span>
    </Link>
  );
}
