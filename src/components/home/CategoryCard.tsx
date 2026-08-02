import { useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Frame, PanelTop, Wrench, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  /** Mode dense pour 8 univers sur une ligne (12eVisuel). */
  compact?: boolean;
}

export function CategoryCard({ name, slug, imageUrl, icon, compact = false }: CategoryCardProps) {
  const Icon = iconMap[icon || ""] || Layers;
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = Boolean(imageUrl) && !imageFailed;

  return (
    <Link
      to={`/produits?category=${slug}`}
      aria-label={`Voir les produits — ${name}`}
      className="category-card group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-muted",
          compact ? "aspect-square" : "aspect-[4/5] sm:aspect-square",
        )}
      >
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
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 text-center font-semibold leading-tight text-white drop-shadow-sm",
                compact
                  ? "px-0.5 pb-1 pt-4 text-[10px] sm:px-1 sm:pb-1.5 sm:text-xs md:text-[11px] lg:text-xs xl:text-sm"
                  : "px-2 pb-3 pt-8 text-sm",
              )}
            >
              {name}
            </span>
          </>
        ) : (
          <div
            className={cn(
              "flex h-full flex-col items-center justify-center text-center",
              compact ? "gap-1 p-1" : "gap-2 p-4",
            )}
          >
            <Icon
              className={cn("shrink-0 text-primary", compact ? "h-5 w-5 sm:h-6 sm:w-6" : "h-10 w-10")}
              aria-hidden
            />
            <span
              className={cn(
                "font-medium text-foreground",
                compact ? "text-[10px] leading-tight sm:text-xs" : "text-sm",
              )}
            >
              {name}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
