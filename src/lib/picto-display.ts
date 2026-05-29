import type { CSSProperties } from "react";

export type PictoTextPlacement = "inside" | "outside";

export type PictoDisplayConfig = {
  picto_height_px?: number | null;
  picto_width_px?: number | null;
  text_placement?: PictoTextPlacement | string | null;
  text_offset_x?: number | null;
  text_offset_y?: number | null;
  text_font_size_px?: number | null;
};

export type ResolvedPictoDisplay = {
  pictoHeightPx: number;
  pictoWidthPx: number | null;
  textPlacement: PictoTextPlacement;
  textOffsetX: number;
  textOffsetY: number;
  textFontSizePx: number;
};

export function resolvePictoDisplay(config?: PictoDisplayConfig | null): ResolvedPictoDisplay {
  const placement = config?.text_placement === "inside" ? "inside" : "outside";
  return {
    pictoHeightPx: clampNumber(config?.picto_height_px, 36, 16, 160),
    pictoWidthPx: normalizeOptionalWidth(config?.picto_width_px),
    textPlacement: placement,
    textOffsetX: clampNumber(config?.text_offset_x, placement === "inside" ? 0 : 8, -80, 120),
    textOffsetY: clampNumber(config?.text_offset_y, 0, -80, 120),
    textFontSizePx: clampNumber(config?.text_font_size_px, 14, 8, 28),
  };
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeOptionalWidth(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(320, Math.round(n));
}

export function pictoImageStyle(cfg: ResolvedPictoDisplay): CSSProperties {
  return {
    height: cfg.pictoHeightPx,
    width: cfg.pictoWidthPx ?? "auto",
    maxWidth: "none",
    display: "block",
  };
}

export function pictoTextStyle(cfg: ResolvedPictoDisplay): CSSProperties {
  const base: CSSProperties = {
    fontSize: cfg.textFontSizePx,
    lineHeight: 1.15,
  };

  if (cfg.textPlacement === "inside") {
    return {
      ...base,
      left: "50%",
      top: "50%",
      transform: `translate(calc(-50% + ${cfg.textOffsetX}px), calc(-50% + ${cfg.textOffsetY}px))`,
    };
  }

  return {
    ...base,
    marginLeft: cfg.textOffsetX,
    marginTop: cfg.textOffsetY,
  };
}
