import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CharacteristicPictoProps = {
  iconUrl?: string | null;
  value: string;
  label?: string;
  fallback: ReactNode;
  className?: string;
};

/** Largeur fixe de la case valeur (alignée sur les visuels Alsafix uploadés en admin). */
const VALUE_ZONE_CLASS = "w-11 min-w-[2.75rem] max-w-[2.75rem]";

/**
 * Picto caractéristique Alsafix : valeur dans la case blanche à gauche du visuel,
 * icône à droite (image admin). Sans image custom → badge Lucide.
 */
export function CharacteristicPicto({
  iconUrl,
  value,
  label,
  fallback,
  className,
}: CharacteristicPictoProps) {
  const title = [value, label].filter(Boolean).join(" ");

  if (iconUrl) {
    return (
      <div
        className={cn("relative inline-flex h-10 shrink-0 align-middle", className)}
        title={title}
      >
        <img
          src={iconUrl}
          alt=""
          className="h-10 w-auto max-w-[7.5rem] object-contain object-left"
          loading="lazy"
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-[1] flex items-center justify-center border-r border-border/30 bg-white px-0.5",
            VALUE_ZONE_CLASS,
          )}
          aria-label={title}
        >
          <span className="block w-full truncate text-center text-[11px] font-semibold leading-none tracking-tight text-foreground whitespace-nowrap tabular-nums">
            {value}
          </span>
        </span>
      </div>
    );
  }

  const fallbackText = label ? `${value} ${label}`.trim() : value;

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-sm",
        className,
      )}
      title={title}
    >
      <span className="shrink-0 text-primary">{fallback}</span>
      <span className="font-medium whitespace-nowrap text-secondary-foreground">{fallbackText}</span>
    </div>
  );
}
