import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CharacteristicPictoProps = {
  iconUrl?: string | null;
  value: string;
  label?: string;
  fallback: ReactNode;
  className?: string;
};

function formatDisplayText(value: string, label?: string): string {
  const v = value.trim();
  const l = (label || "").trim();
  if (!l) return v;
  if (v.toLowerCase().includes(l.toLowerCase())) return v;
  return `${v} ${l}`.trim();
}

/**
 * Picto caractéristique : image admin en taille native, valeur à côté (sm+) ou en dessous (mobile).
 */
export function CharacteristicPicto({
  iconUrl,
  value,
  label,
  fallback,
  className,
}: CharacteristicPictoProps) {
  const displayText = formatDisplayText(value, label);

  if (iconUrl) {
    return (
      <div
        className={cn(
          "inline-flex shrink-0 flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2",
          className,
        )}
        title={displayText}
      >
        <img
          src={iconUrl}
          alt=""
          className="block h-auto w-auto max-w-none"
          loading="lazy"
        />
        <span className="text-center text-sm font-semibold leading-tight text-foreground whitespace-nowrap tabular-nums sm:text-left">
          {displayText}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex shrink-0 flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2",
        className,
      )}
      title={displayText}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary text-primary">
        {fallback}
      </span>
      <span className="text-center text-sm font-semibold whitespace-nowrap text-secondary-foreground sm:text-left">
        {displayText}
      </span>
    </div>
  );
}
