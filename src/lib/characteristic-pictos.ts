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

function isGenericPictoRow(row: CharacteristicIconLike): boolean {
  return normalizeCharacteristicValue(row.characteristic_value) === "";
}

function pickGenericPicto<T extends CharacteristicIconLike>(rows: T[]): T | undefined {
  const genericRows = rows.filter(isGenericPictoRow);
  return genericRows.find((row) => row.icon_url) ?? genericRows[0];
}

function pickDisplayFields<T extends CharacteristicIconLike>(row: T): Partial<T> {
  return {
    picto_height_px: row.picto_height_px,
    picto_width_px: row.picto_width_px,
    text_placement: row.text_placement,
    text_offset_x: row.text_offset_x,
    text_offset_y: row.text_offset_y,
    text_font_size_px: row.text_font_size_px,
  } as Partial<T>;
}

/**
 * Résout le picto pour une caractéristique produit :
 * - usage / matériau : picto + affichage de la valeur exacte si configurés, sinon repli générique
 * - autres clés : picto générique (characteristic_value vide)
 */
export function resolveCharacteristicIcon<T extends CharacteristicIconLike>(
  icons: T[],
  characteristicKey: string,
  productValue?: string | null,
): T | undefined {
  const rows = icons.filter((icon) => icon.characteristic_key === characteristicKey);
  if (rows.length === 0) return undefined;

  const generic = pickGenericPicto(rows);

  if (isValueBasedCharacteristicKey(characteristicKey)) {
    const normalized = normalizeCharacteristicValue(productValue);
    if (normalized) {
      const exact = rows.find(
        (row) => normalizeCharacteristicValue(row.characteristic_value) === normalized,
      );
      if (exact?.icon_url) return exact;
      if (exact && generic?.icon_url) {
        return { ...generic, ...pickDisplayFields(exact) };
      }
    }
    return generic;
  }

  return generic ?? rows[0];
}
