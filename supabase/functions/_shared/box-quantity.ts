export function getBoxQuantityLabel(
  boxQuantity: number | null | undefined,
  variantTitle?: string | null,
): string | null {
  if (!boxQuantity || boxQuantity <= 0) return null;

  const vt = (variantTitle || "").toLowerCase();
  if (vt.includes("boîte") || vt.includes("boite")) {
    if (vt.includes(String(boxQuantity))) return null;
  }

  return `Boîte de ${boxQuantity} vis`;
}
