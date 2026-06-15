/**
 * Descriptions SEO de secours pour produits prioritaires sans description en base.
 * Clé = handle produit. Compléter via l'admin quand possible.
 */
export const PRODUCT_SEO_FALLBACK_DESCRIPTIONS: Record<string, string> = {
  "vis-terrasse-torx-5x50-a2":
    "Vis à bois terrasse Torx 5×50 mm inox A2 — fixation professionnelle de lames bois et terrasses extérieures. Tête fraisée, anti-corrosion, livraison 24/48h.",
  "vis-terrasse-torx-5x60-a4":
    "Vis à bois terrasse Torx 5×60 mm inox A4 — résistance maximale en milieu marin et extérieur. Idéale pour terrasses bois exotique et composite.",
  "vis-charpente-torx-8x120-zingue":
    "Vis à bois charpente Torx 8×120 mm acier zingué — assemblages structurels, chevrons et ossature bois. Haute résistance mécanique pour professionnels.",
  "vis-charpente-torx-6x80-zingue":
    "Vis à bois charpente Torx 6×80 mm zinguée — vis universelle pour menuiserie et charpente. Filetage adapté au bois massif, prix HT.",
};

export function getProductSeoFallbackDescription(handle: string | null | undefined): string | null {
  if (!handle) return null;
  return PRODUCT_SEO_FALLBACK_DESCRIPTIONS[handle] ?? null;
}
