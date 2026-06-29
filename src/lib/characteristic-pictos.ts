/** Caractéristiques dont le picto dépend de la valeur produit (ex. usage, matière). */
export const VALUE_BASED_CHARACTERISTIC_KEYS = ["usage", "material"] as const;

export type ValueBasedCharacteristicKey = (typeof VALUE_BASED_CHARACTERISTIC_KEYS)[number];

export function isValueBasedCharacteristicKey(key: string): key is ValueBasedCharacteristicKey {
  return (VALUE_BASED_CHARACTERISTIC_KEYS as readonly string[]).includes(key);
}

export function normalizeCharacteristicValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export type CharacteristicIconLike = {
  characteristic_key: string;
  characteristic_value?: string | null;
  icon_url?: string | null;
  picto_height_px?: number | null;
  picto_width_px?: number | null;
  text_placement?: string | null;
  text_offset_x?: number | null;
  text_offset_y?: number | null;
  text_font_size_px?: number | null;
};

/** Résout le picto : valeur exacte, puis repli sur picto générique (characteristic_value vide). */
export function resolveCharacteristicIcon<T extends CharacteristicIconLike>(
  icons: T[],
  characteristicKey: string,
  productValue?: string | null,
): T | undefined {
  const siteScoped = icons.filter((i) => i.characteristic_key === characteristicKey);
  if (isValueBasedCharacteristicKey(characteristicKey)) {
    const normalized = normalizeCharacteristicValue(productValue);
    if (normalized) {
      const exact = siteScoped.find(
        (i) => normalizeCharacteristicValue(i.characteristic_value) === normalized,
      );
      if (exact?.icon_url) return exact;
    }
  }
  return siteScoped.find((i) => !i.characteristic_value || i.characteristic_value === "");
}
