import type { ReactNode } from "react";
import {
  Box,
  Circle,
  Gauge,
  Layers,
  Package,
  Plug,
  Ruler,
  Scale,
  Settings2,
  SlidersHorizontal,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import TorxIcon from "@/components/icons/TorxIcon";
import type { Product } from "@/lib/products";

export type ProductSpec = {
  key: string;
  value: string;
  label: string;
  fallback: ReactNode;
};

type SpecDefinition = {
  key: keyof Product;
  /** Préfixe collé devant la valeur (ex. « Ø »). */
  prefix?: string;
  /** Suffixe / unité affiché après la valeur (ex. « mm »). */
  label?: string;
  fallback: ReactNode;
  /** Icône spécifique selon la valeur (ex. Torx). */
  resolveFallback?: (value: string) => ReactNode;
};

/**
 * Ordre aligné avec la page admin « Pictos & caractéristiques ».
 * Toute nouvelle colonne caractéristique doit être déclarée ici pour être
 * affichée (valeur + picto) sous l'image sur la fiche produit.
 */
const SPEC_DEFINITIONS: SpecDefinition[] = [
  { key: "box_weight", label: "kg", fallback: <Scale className="h-4 w-4" /> },
  { key: "diameter_mm", prefix: "Ø", label: "mm", fallback: <Circle className="h-4 w-4" /> },
  { key: "length_mm", label: "mm", fallback: <Ruler className="h-4 w-4" /> },
  { key: "usage", fallback: <Box className="h-4 w-4" /> },
  { key: "material", fallback: <Layers className="h-4 w-4" /> },
  {
    key: "drive_type",
    fallback: <Settings2 className="h-4 w-4" />,
    resolveFallback: (value) => {
      const v = value.toLowerCase();
      return v.startsWith("tx") || v.includes("torx") ? (
        <TorxIcon className="h-4 w-4" />
      ) : (
        <Settings2 className="h-4 w-4" />
      );
    },
  },
  { key: "thickness_to_fix_mm", label: "mm", fallback: <SlidersHorizontal className="h-4 w-4" /> },
  { key: "thread_length_mm", label: "filet", fallback: <Wrench className="h-4 w-4" /> },
  { key: "head_diameter_mm", prefix: "Ø", label: "tête", fallback: <Target className="h-4 w-4" /> },

  // Colonnes étendues
  { key: "dimension", fallback: <Ruler className="h-4 w-4" /> },
  { key: "width_mm", label: "mm", fallback: <Ruler className="h-4 w-4" /> },
  { key: "height_mm", label: "mm", fallback: <Ruler className="h-4 w-4" /> },
  { key: "depth_mm", label: "mm", fallback: <Ruler className="h-4 w-4" /> },
  { key: "thickness_mm", label: "mm", fallback: <SlidersHorizontal className="h-4 w-4" /> },
  { key: "flat_length_mm", label: "mm", fallback: <Ruler className="h-4 w-4" /> },
  { key: "beam_dimension", fallback: <Ruler className="h-4 w-4" /> },
  { key: "technology", fallback: <Settings2 className="h-4 w-4" /> },
  { key: "consumable", fallback: <Box className="h-4 w-4" /> },
  { key: "classification", fallback: <Target className="h-4 w-4" /> },
  { key: "carrier_drill_d5_mm", prefix: "Ø", label: "mm", fallback: <Circle className="h-4 w-4" /> },
  { key: "carrier_drill_d9_11_mm", prefix: "Ø", label: "mm", fallback: <Circle className="h-4 w-4" /> },
  { key: "carrier_drill_d13_mm", prefix: "Ø", label: "mm", fallback: <Circle className="h-4 w-4" /> },
  { key: "carried_drill_d5_mm", prefix: "Ø", label: "mm", fallback: <Circle className="h-4 w-4" /> },
  { key: "power", fallback: <Zap className="h-4 w-4" /> },
  { key: "tank", fallback: <Box className="h-4 w-4" /> },
  { key: "pressure_gauge", fallback: <Gauge className="h-4 w-4" /> },
  { key: "power_supply", fallback: <Plug className="h-4 w-4" /> },
  { key: "flow_rate", fallback: <Gauge className="h-4 w-4" /> },
  { key: "connector_count", fallback: <Plug className="h-4 w-4" /> },
  { key: "els", fallback: <Settings2 className="h-4 w-4" /> },
  { key: "store_capacity", fallback: <Package className="h-4 w-4" /> },
  { key: "carton_quantity", label: "/ carton", fallback: <Package className="h-4 w-4" /> },
  { key: "pallet_quantity", label: "/ palette", fallback: <Package className="h-4 w-4" /> },
];

function hasValue(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === "string") return raw.trim().length > 0;
  if (typeof raw === "number") return !Number.isNaN(raw);
  return true;
}

export function buildProductSpecs(product: Product): ProductSpec[] {
  const specs: ProductSpec[] = [];

  for (const def of SPEC_DEFINITIONS) {
    const raw = product[def.key];
    if (!hasValue(raw)) continue;

    const rawText = String(raw).trim();
    const value = def.prefix ? `${def.prefix}${rawText}` : rawText;
    const fallback = def.resolveFallback ? def.resolveFallback(rawText) : def.fallback;

    specs.push({
      key: String(def.key),
      value,
      label: def.label ?? "",
      fallback,
    });
  }

  return specs;
}
