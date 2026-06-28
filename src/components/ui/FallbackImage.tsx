import { useState, useEffect, type ImgHTMLAttributes } from "react";
import { TREX_FALLBACK_SRC } from "@/lib/imageFallback";
import { cn } from "@/lib/utils";

type FallbackImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
};

/** Image produit / picto avec repli T-Rex si URL absente ou en erreur. */
export function FallbackImage({ src, className, alt = "", ...props }: FallbackImageProps) {
  const resolved = (src?.trim() || TREX_FALLBACK_SRC);
  const [currentSrc, setCurrentSrc] = useState(resolved);

  useEffect(() => {
    setCurrentSrc(src?.trim() || TREX_FALLBACK_SRC);
  }, [src]);

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={cn(className)}
      onError={() => {
        if (currentSrc !== TREX_FALLBACK_SRC) setCurrentSrc(TREX_FALLBACK_SRC);
      }}
    />
  );
}
