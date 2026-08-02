import { cn } from "@/lib/utils";
import type { MarketplaceUnivers } from "@/hooks/useMarketplaceHome";
import { UniversTile } from "@/components/home/UniversTile";

type UniversGridProps = {
  univers: MarketplaceUnivers[];
  columns?: string;
  aspect?: string;
  className?: string;
  labelPlacement?: "overlay" | "below";
};

export function UniversGrid({
  univers,
  columns = "grid-cols-2 sm:grid-cols-4",
  aspect = "aspect-[4/5] sm:aspect-square",
  className,
  labelPlacement = "overlay",
}: UniversGridProps) {
  return (
    <div className={cn("grid gap-4 sm:gap-5 lg:gap-6", columns, className)}>
      {univers.map((item, index) => (
        <UniversTile
          key={item.slug}
          item={item}
          delayMs={index * 40}
          aspect={aspect}
          labelPlacement={labelPlacement}
        />
      ))}
    </div>
  );
}
