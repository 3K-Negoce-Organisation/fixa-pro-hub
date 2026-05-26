import { roundMoney } from "./money.ts";

/** Stripe metadata values are limited to 500 characters each. */
export const STRIPE_METADATA_VALUE_MAX = 500;
const CHUNK_SIZE = 480;

export type CompactCartItem = {
  i: string;
  q: number;
  p: number;
  t: number;
};

export type PayableCartLine = {
  id: string;
  quantity: number;
  priceHT: number;
  priceTTC: number;
  isGift?: boolean;
};

export function filterPayableCartLines<T extends PayableCartLine>(items: T[]): T[] {
  return items.filter((item) => !item.isGift && item.quantity > 0);
}

export function toCompactCartItems(
  items: Array<{ id: string; quantity: number; priceHT: number; priceTTC: number }>,
): CompactCartItem[] {
  return items.map((item) => ({
    i: item.id,
    q: item.quantity,
    p: roundMoney(item.priceHT),
    t: roundMoney(item.priceTTC),
  }));
}

/** Serialize compact cart lines into Stripe metadata (single key or chunked). */
export function stripeMetadataForCompactItems(
  compact: CompactCartItem[],
): Record<string, string> {
  const payload = JSON.stringify(compact);
  const fields: Record<string, string> = {
    items_count: String(compact.length),
  };

  if (payload.length <= STRIPE_METADATA_VALUE_MAX) {
    fields.items_compact = payload;
    return fields;
  }

  const partCount = Math.ceil(payload.length / CHUNK_SIZE);
  if (partCount > 45) {
    throw new Error(
      "Panier trop volumineux pour le paiement en ligne. Réduisez le nombre de références ou contactez-nous.",
    );
  }
  fields.items_compact_parts = String(partCount);
  for (let i = 0; i < partCount; i++) {
    fields[`items_compact_${i}`] = payload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
  }
  return fields;
}

export function parseCompactItemsFromMetadata(
  metadata: Record<string, string | undefined>,
): CompactCartItem[] {
  const single = metadata.items_compact;
  if (single) {
    return JSON.parse(single) as CompactCartItem[];
  }

  const partCount = Number.parseInt(metadata.items_compact_parts || "0", 10);
  if (partCount > 0) {
    let payload = "";
    for (let i = 0; i < partCount; i++) {
      payload += metadata[`items_compact_${i}`] ?? "";
    }
    if (payload) {
      return JSON.parse(payload) as CompactCartItem[];
    }
  }

  return [];
}

export function compactItemsToOrderLines(compact: CompactCartItem[]) {
  return compact.map((item) => {
    const priceTTC =
      item.t > 0 ? roundMoney(item.t) : roundMoney(roundMoney(item.p) * 1.2);
    const priceHT = item.p > 0 ? roundMoney(item.p) : roundMoney(priceTTC / 1.2);
    return {
      id: item.i,
      quantity: item.q,
      priceHT,
      priceTTC,
    };
  });
}
