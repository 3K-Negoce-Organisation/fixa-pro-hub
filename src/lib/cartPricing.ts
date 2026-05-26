import { roundMoney } from "@/lib/utils";
import { TVA_RATE } from "@/lib/shipping";

export type CartPricedLine = {
  priceHT: number;
  priceTTC?: number;
  quantity: number;
  isGift?: boolean;
};

export type CatalogPrices = {
  price_ht?: number | null;
  price_ttc?: number | null;
};

/** Prix unitaire TTC catalogue (price_ttc), repli HT × 1,2 si absent. */
export function lineUnitTTC(line: Pick<CartPricedLine, "priceHT" | "priceTTC">): number {
  if (line.priceTTC != null && line.priceTTC > 0) {
    return roundMoney(line.priceTTC);
  }
  return roundMoney(roundMoney(line.priceHT) * (1 + TVA_RATE));
}

/** Prix unitaire HT dérivé du TTC catalogue (aligné admin cartTotals). */
export function lineUnitHT(line: Pick<CartPricedLine, "priceHT" | "priceTTC">): number {
  return roundMoney(lineUnitTTC(line) / (1 + TVA_RATE));
}

/** Total ligne TTC — même règle que admin-hub-central cartTotals.clientLineTotalTtc */
export function clientLineTotalTtc(priceTtc: number, quantity: number): number {
  return roundMoney(roundMoney(priceTtc) * quantity);
}

/** Prix panier canoniques : TTC catalogue prioritaire, HT toujours dérivé du TTC arrondi. */
export function normalizeCartLinePricing(
  line: Pick<CartPricedLine, "priceHT" | "priceTTC">,
  catalog?: CatalogPrices,
): { priceHT: number; priceTTC: number } {
  let priceTTC: number;
  if (catalog?.price_ttc != null && catalog.price_ttc > 0) {
    priceTTC = roundMoney(catalog.price_ttc);
  } else if (line.priceTTC != null && line.priceTTC > 0) {
    priceTTC = roundMoney(line.priceTTC);
  } else if (catalog?.price_ht != null && catalog.price_ht > 0) {
    priceTTC = roundMoney(roundMoney(catalog.price_ht) * (1 + TVA_RATE));
  } else {
    priceTTC = lineUnitTTC(line);
  }
  const priceHT = roundMoney(priceTTC / (1 + TVA_RATE));
  return { priceHT, priceTTC };
}

export function cartProductsTTC(items: CartPricedLine[]): number {
  return roundMoney(
    items.reduce((sum, item) => {
      if (item.isGift) return sum;
      return sum + clientLineTotalTtc(lineUnitTTC(item), item.quantity);
    }, 0),
  );
}

export function cartProductsHT(items: CartPricedLine[]): number {
  return roundMoney(
    items.reduce((sum, item) => {
      if (item.isGift) return sum;
      const unitTtc = lineUnitTTC(item);
      return sum + roundMoney(unitTtc / (1 + TVA_RATE)) * item.quantity;
    }, 0),
  );
}
