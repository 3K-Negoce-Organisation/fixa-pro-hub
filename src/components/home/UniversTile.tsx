import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceUnivers } from "@/hooks/useMarketplaceHome";

type UniversTileProps = {
  item: MarketplaceUnivers;
  delayMs?: number;
  aspect?: string;
  className?: string;
  labelPlacement?: "overlay" | "below";
};

export function UniversTile({
  item,
  delayMs = 0,
  aspect = "aspect-[4/5] sm:aspect-square",
  className,
  labelPlacement = "overlay",
}: UniversTileProps) {
  const media = (
    <div
      className={cn(
        "relative overflow-hidden bg-[#e8ecf3] rounded-[var(--theme-border-radius,0)]",
        aspect,
      )}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out",
            item.active && "group-hover:scale-[1.06]",
            !item.active && "opacity-50 grayscale",
          )}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#000d4f] to-[#001a7a]" />
      )}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          labelPlacement === "overlay"
            ? "bg-gradient-to-t from-black/70 via-black/15 to-transparent"
            : "bg-black/0 group-hover:bg-black/10",
        )}
        aria-hidden
      />
      {!item.active && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
          Bientôt
        </span>
      )}
      {labelPlacement === "overlay" && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 p-3 sm:p-4">
          <span className="text-sm font-semibold leading-tight tracking-tight text-white sm:text-[15px]">
            {item.name}
          </span>
          {item.active && (
            <ArrowUpRight className="h-4 w-4 shrink-0 text-white/0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
          )}
        </div>
      )}
    </div>
  );

  const below =
    labelPlacement === "below" ? (
      <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
        <div>
          <div className="text-sm font-semibold tracking-tight text-[var(--mh-text,#000d4f)]">
            {item.name}
          </div>
          {!item.active && (
            <div className="mt-0.5 text-[11px] font-medium text-[var(--mh-muted,rgba(0,13,79,0.55))]">
              Bientôt disponible
            </div>
          )}
        </div>
        {item.active && (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--mh-accent,#000d4f)] opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
    ) : null;

  const classNames = cn(
    "group block outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2",
    !item.active && "cursor-not-allowed",
    className,
  );

  const content = (
    <>
      {media}
      {below}
    </>
  );

  if (item.active) {
    return (
      <Link
        to={`/produits?gamme=${encodeURIComponent(item.slug)}`}
        className={classNames}
        style={{ animationDelay: `${delayMs}ms` }}
        aria-label={`Voir la gamme ${item.name}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={classNames}
      style={{ animationDelay: `${delayMs}ms` }}
      title="Bientôt disponible"
      aria-disabled="true"
    >
      {content}
    </div>
  );
}
