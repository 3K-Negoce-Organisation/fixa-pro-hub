import { roundMoney } from "@/lib/utils";
import { TVA_RATE } from "@/lib/shipping";

export type CartPricedLine = {
  priceHT: number;
  priceTTC?: number;
  quantity: number;
  isGift?: boolean;
};

/** Prix unitaire TTC catalogue (price_ttc), repli HT × 1,2 si absent. */
export function lineUnitTTC(line: Pick<CartPricedLine, "priceHT" | "priceTTC">): number {
  if (line.priceTTC != null && line.priceTTC > 0) {
    return roundMoney(line.priceTTC);
  }
  return roundMoney(roundMoney(line.priceHT) * (1 + TVA_RATE));
}

/** Prix unitaire HT dérivé du TTC catalogue. */
export function lineUnitHT(line: Pick<CartPricedLine, "priceHT" | "priceTTC">): number {
  return roundMoney(lineUnitTTC(line) / (1 + TVA_RATE));
}

export function cartProductsTTC(items: CartPricedLine[]): number {
  return roundMoney(
    items.reduce((sum, item) => {
      if (item.isGift) return sum;
      return sum + lineUnitTTC(item) * item.quantity;
    }, 0),
  );
}

export function cartProductsHT(items: CartPricedLine[]): number {
  return roundMoney(
    items.reduce((sum, item) => {
      if (item.isGift) return sum;
      return sum + lineUnitHT(item) * item.quantity;
    }, 0),
  );
}
