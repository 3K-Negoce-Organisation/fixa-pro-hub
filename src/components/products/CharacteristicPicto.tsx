import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CharacteristicPictoProps = {
  iconUrl?: string | null;
  value: string;
  label?: string;
  fallback: ReactNode;
  className?: string;
};

/**
 * Picto caractéristique Alsafix : la valeur dynamique est centrée dans la case blanche
 * (partie gauche du visuel uploadé en admin). Sans image custom, badge compact Lucide.
 */
export function CharacteristicPicto({
  iconUrl,
  value,
  label,
  fallback,
  className,
}: CharacteristicPictoProps) {
  if (iconUrl) {
    return (
      <div
        className={cn("relative inline-flex h-9 shrink-0 items-stretch", className)}
        title={[value, label].filter(Boolean).join(" ")}
      >
        <img
          src={iconUrl}
          alt=""
          className="h-9 w-auto max-w-[9.5rem] object-contain object-left"
          loading="lazy"
        />
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex w-[32%] max-w-[2.35rem] items-center justify-center px-0.5 text-center text-[10px] font-semibold leading-tight tracking-tight text-foreground"
          aria-hidden
        >
          <span className="line-clamp-2 break-all">{value}</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm",
        className,
      )}
    >
      <span className="text-primary">{fallback}</span>
      <span className="font-medium text-secondary-foreground">{value}</span>
      {label ? <span className="text-xs text-secondary-foreground/70">{label}</span> : null}
    </div>
  );
}
