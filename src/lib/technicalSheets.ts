export type TechnicalSheet = {
  id: string;
  title: string;
  description: string;
  file: string;
};

export const TECHNICAL_SHEETS: TechnicalSheet[] = [
  {
    id: "vbf",
    title: "VIS À BOIS VBF",
    description: "Vis à bois VBF - tête fraisée - galvanisée. Vis Bois tête Fraisée technique pour la construction bois.",
    file: "/docs/FT-VBF.pdf",
  },
  {
    id: "vbht",
    title: "VIS BOIS TIREFOND VBHT",
    description: "Vis à bois tirefond - tête hexagonale - version zinguée. Vis de construction pour les assemblages structurels de composants en bois.",
    file: "/docs/FT-VBHT.pdf",
  },
  {
    id: "vrac-qs",
    title: "VIS À BOIS QS",
    description: "Vis à bois dur sans pré-perçage «QUADRA SPEED» - version INOX C1 et A4. Idéale pour la fixation de terrasses et constructions en bois.",
    file: "/docs/FT-VRAC-QS.pdf",
  },
  {
    id: "vbl",
    title: "VIS BOIS LONGUE VBL",
    description: "Fiche technique des vis bois longues pour charpente et ossature bois.",
    file: "/docs/FT-VBL.pdf",
  },
];

/** Associe un produit à la fiche technique PDF de sa gamme (VBF, VBHT, QS, VBL). */
export function getTechnicalSheetForProduct(product: {
  title?: string | null;
  handle?: string | null;
  code_alsafix?: string | null;
  categories?: { name?: string | null; slug?: string | null } | null;
}): TechnicalSheet | null {
  const haystack = [
    product.title,
    product.handle,
    product.code_alsafix,
    product.categories?.name,
    product.categories?.slug,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\bvbht\b|tirefond|tire-fond/.test(haystack)) {
    return TECHNICAL_SHEETS.find((s) => s.id === "vbht") ?? null;
  }
  if (/\bvbl\b/.test(haystack)) {
    return TECHNICAL_SHEETS.find((s) => s.id === "vbl") ?? null;
  }
  if (/\bqs\b|quadra|terrasse/.test(haystack)) {
    return TECHNICAL_SHEETS.find((s) => s.id === "vrac-qs") ?? null;
  }
  if (/\bvbf\b|charpente|agglo/.test(haystack)) {
    return TECHNICAL_SHEETS.find((s) => s.id === "vbf") ?? null;
  }

  return TECHNICAL_SHEETS.find((s) => s.id === "vbf") ?? null;
}
