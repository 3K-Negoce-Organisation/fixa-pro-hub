import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  pictoImageStyle,
  pictoTextStyle,
  resolvePictoDisplay,
  type PictoDisplayConfig,
} from "@/lib/picto-display";

type CharacteristicPictoProps = {
  iconUrl?: string | null;
  value: string;
  label?: string;
  fallback: ReactNode;
  display?: PictoDisplayConfig | null;
  className?: string;
};

function formatDisplayText(value: string, label?: string): string {
  const v = value.trim();
  const l = (label || "").trim();
  if (!l) return v;
  if (v.toLowerCase().includes(l.toLowerCase())) return v;
  return `${v} ${l}`.trim();
}

export function CharacteristicPicto({
  iconUrl,
  value,
  label,
  fallback,
  display,
  className,
}: CharacteristicPictoProps) {
  const displayText = formatDisplayText(value, label);
  const cfg = resolvePictoDisplay(display);

  if (iconUrl) {
    if (cfg.textPlacement === "inside") {
      return (
        <div
          className={cn("relative inline-block shrink-0 align-middle", className)}
          title={displayText}
        >
          <img src={iconUrl} alt="" style={pictoImageStyle(cfg)} loading="lazy" />
          <span
            className="pointer-events-none absolute font-semibold whitespace-nowrap tabular-nums text-foreground"
            style={pictoTextStyle(cfg)}
          >
            {displayText}
          </span>
        </div>
      );
    }

    return (
      <div
        className={cn("inline-flex shrink-0 items-start align-middle", className)}
        title={displayText}
      >
        <img src={iconUrl} alt="" style={pictoImageStyle(cfg)} loading="lazy" />
        <span
          className="font-semibold whitespace-nowrap tabular-nums text-foreground"
          style={pictoTextStyle(cfg)}
        >
          {displayText}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex shrink-0 items-start gap-2 align-middle", className)}
      title={displayText}
    >
      <span
        className="inline-flex items-center justify-center rounded-md border border-border bg-secondary text-primary"
        style={{ height: cfg.pictoHeightPx, width: cfg.pictoHeightPx }}
      >
        {fallback}
      </span>
      <span
        className="font-semibold whitespace-nowrap text-secondary-foreground"
        style={{ fontSize: cfg.textFontSizePx, marginTop: cfg.textOffsetY }}
      >
        {displayText}
      </span>
    </div>
  );
}
