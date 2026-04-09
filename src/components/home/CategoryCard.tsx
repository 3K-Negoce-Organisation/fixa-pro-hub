import { useState } from "react";
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

export function CategoryCard({ name, slug, imageUrl, icon }: CategoryCardProps) {
  const Icon = iconMap[icon || ""] || Layers;
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = Boolean(imageUrl) && !imageFailed;

  return (
    <Link
      to={`/produits?category=${slug}`}
      className="category-card group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="relative w-full aspect-[4/5] sm:aspect-square overflow-hidden bg-muted">
        {showPhoto ? (
          <>
            <img
              src={imageUrl!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
              aria-hidden
            />
            <span className="absolute inset-x-0 bottom-0 px-2 pb-3 pt-8 text-center text-sm font-semibold leading-tight text-white drop-shadow-sm">
              {name}
            </span>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <Icon className="h-10 w-10 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-medium text-foreground">{name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
