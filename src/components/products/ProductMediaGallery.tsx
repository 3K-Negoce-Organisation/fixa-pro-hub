import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { ProductCarouselItem } from "@/lib/productMedia";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  items: ProductCarouselItem[];
  alt: string;
  /** Image de repli si aucun média (placeholder). */
  fallbackUrl: string;
};

export function ProductMediaGallery({ items, alt, fallbackUrl }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const media = items.length > 0 ? items : null;
  const active = media?.[activeIndex] ?? null;
  const multi = (media?.length ?? 0) > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  useEffect(() => {
    if (!media?.length) return;
    if (activeIndex >= media.length) setActiveIndex(0);
  }, [media, activeIndex]);

  const go = (delta: number) => {
    if (!media?.length) return;
    setActiveIndex((i) => (i + delta + media.length) % media.length);
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-square bg-white rounded-lg flex items-center justify-center p-4 border border-border overflow-hidden">
        {active?.kind === "video" ? (
          <iframe
            key={active.id}
            src={`${active.embedUrl}?rel=0`}
            title={`${alt} — vidéo`}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <img
            src={active?.kind === "image" ? active.url : fallbackUrl}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        )}

        {multi && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-sm bg-white/90 hover:bg-white"
              onClick={() => go(-1)}
              aria-label="Média précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-sm bg-white/90 hover:bg-white"
              onClick={() => go(1)}
              aria-label="Média suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {multi && media && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Médias du produit">
          {media.map((item, index) => {
            const selected = index === activeIndex;
            const thumbSrc = item.kind === "image" ? item.url : item.thumbUrl;
            return (
              <button
                key={item.kind === "image" ? `img-${item.url}-${index}` : `vid-${item.id}-${index}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={
                  item.kind === "image"
                    ? `Image ${index + 1}`
                    : `Vidéo ${index + 1}`
                }
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-md border bg-white transition-shadow",
                  selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40",
                )}
              >
                <img
                  src={thumbSrc}
                  alt=""
                  className="h-full w-full object-contain p-1"
                  loading="lazy"
                />
                {item.kind === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
