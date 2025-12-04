// Mock data for development - simulates Shopify Storefront API responses

export interface MockProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  tags: string[];
  priceHT: number;
  image: string;
  variants: Array<{
    id: string;
    title: string;
    priceHT: number;
    available: boolean;
    quantity: number;
  }>;
  specs: {
    diameter: string;
    length: string;
    driveType: string;
    material: string;
    headType: string;
    norm?: string;
    thread?: string;
    coating?: string;
  };
}

export const mockProducts: MockProduct[] = [
  {
    id: "1",
    handle: "vis-terrasse-torx-5x50-a2",
    title: "Vis terrasse Torx TX25 5x50mm Inox A2 - Boîte de 200",
    description: "Vis pour terrasse bois en acier inoxydable A2, tête fraisée, empreinte Torx TX25. Idéale pour les lames de terrasse et bardage.",
    productType: "Vis Terrasse",
    tags: ["diameter:5mm", "length:50mm", "drive:Torx TX25", "material:Inox A2", "head:Fraisée"],
    priceHT: 42.50,
    image: "/placeholder.svg",
    variants: [
      { id: "1-100", title: "Boîte de 100", priceHT: 24.90, available: true, quantity: 127 },
      { id: "1-200", title: "Boîte de 200", priceHT: 42.50, available: true, quantity: 54 },
      { id: "1-500", title: "Boîte de 500", priceHT: 89.90, available: true, quantity: 23 },
    ],
    specs: {
      diameter: "5mm",
      length: "50mm",
      driveType: "Torx TX25",
      material: "Inox A2",
      headType: "Fraisée",
      norm: "DIN 7505",
      thread: "Filetage partiel",
      coating: "Inox naturel",
    },
  },
  {
    id: "2",
    handle: "vis-charpente-torx-8x120-zingue",
    title: "Vis charpente Torx TX40 8x120mm Zingué - Boîte de 50",
    description: "Vis pour charpente et construction bois, acier zingué, grande résistance mécanique. Filetage partiel pour un serrage optimal.",
    productType: "Vis Charpente",
    tags: ["diameter:8mm", "length:120mm", "drive:Torx TX40", "material:Acier Zingué", "head:Fraisée"],
    priceHT: 28.90,
    image: "/placeholder.svg",
    variants: [
      { id: "2-50", title: "Boîte de 50", priceHT: 28.90, available: true, quantity: 89 },
      { id: "2-100", title: "Boîte de 100", priceHT: 52.50, available: true, quantity: 45 },
      { id: "2-200", title: "Boîte de 200", priceHT: 98.00, available: false, quantity: 0 },
    ],
    specs: {
      diameter: "8mm",
      length: "120mm",
      driveType: "Torx TX40",
      material: "Acier Zingué",
      headType: "Fraisée",
      norm: "ETA-11/0030",
      thread: "Filetage partiel 70mm",
      coating: "Zingué bichromaté",
    },
  },
  {
    id: "3",
    handle: "vis-agglo-pz-4x40-zingue",
    title: "Vis aggloméré Pozidriv PZ2 4x40mm Zingué - Boîte de 500",
    description: "Vis universelle pour panneaux aggloméré et MDF, tête fraisée, empreinte Pozidriv PZ2.",
    productType: "Vis Agglo",
    tags: ["diameter:4mm", "length:40mm", "drive:Pozidriv PZ2", "material:Acier Zingué", "head:Fraisée"],
    priceHT: 18.50,
    image: "/placeholder.svg",
    variants: [
      { id: "3-200", title: "Boîte de 200", priceHT: 8.90, available: true, quantity: 234 },
      { id: "3-500", title: "Boîte de 500", priceHT: 18.50, available: true, quantity: 156 },
      { id: "3-1000", title: "Boîte de 1000", priceHT: 32.90, available: true, quantity: 67 },
    ],
    specs: {
      diameter: "4mm",
      length: "40mm",
      driveType: "Pozidriv PZ2",
      material: "Acier Zingué",
      headType: "Fraisée",
      norm: "DIN 7505-A",
      thread: "Filetage total",
      coating: "Zingué jaune",
    },
  },
  {
    id: "4",
    handle: "vis-terrasse-torx-5x60-a4",
    title: "Vis terrasse Torx TX25 5x60mm Inox A4 Marine - Boîte de 200",
    description: "Vis premium pour terrasse en environnement marin ou piscine. Inox A4 (316) haute résistance à la corrosion.",
    productType: "Vis Terrasse",
    tags: ["diameter:5mm", "length:60mm", "drive:Torx TX25", "material:Inox A4", "head:Fraisée"],
    priceHT: 68.90,
    image: "/placeholder.svg",
    variants: [
      { id: "4-100", title: "Boîte de 100", priceHT: 38.50, available: true, quantity: 34 },
      { id: "4-200", title: "Boîte de 200", priceHT: 68.90, available: true, quantity: 12 },
    ],
    specs: {
      diameter: "5mm",
      length: "60mm",
      driveType: "Torx TX25",
      material: "Inox A4 (316)",
      headType: "Fraisée",
      norm: "DIN 7505",
      thread: "Filetage partiel",
      coating: "Inox marine",
    },
  },
  {
    id: "5",
    handle: "vis-charpente-torx-6x80-zingue",
    title: "Vis charpente Torx TX30 6x80mm Zingué - Boîte de 100",
    description: "Vis universelle charpente pour ossature bois, chevrons et solives. Haute résistance à l'arrachement.",
    productType: "Vis Charpente",
    tags: ["diameter:6mm", "length:80mm", "drive:Torx TX30", "material:Acier Zingué", "head:Fraisée"],
    priceHT: 24.50,
    image: "/placeholder.svg",
    variants: [
      { id: "5-50", title: "Boîte de 50", priceHT: 14.90, available: true, quantity: 78 },
      { id: "5-100", title: "Boîte de 100", priceHT: 24.50, available: true, quantity: 45 },
      { id: "5-200", title: "Boîte de 200", priceHT: 44.90, available: true, quantity: 19 },
    ],
    specs: {
      diameter: "6mm",
      length: "80mm",
      driveType: "Torx TX30",
      material: "Acier Zingué",
      headType: "Fraisée",
      norm: "ETA-11/0030",
      thread: "Filetage partiel 45mm",
      coating: "Zingué bichromaté",
    },
  },
  {
    id: "6",
    handle: "boulon-hex-m10x60-zingue",
    title: "Boulon hexagonal M10x60mm Acier Zingué Classe 8.8 - Sachet de 25",
    description: "Boulon haute résistance classe 8.8 pour assemblages mécaniques. Livré avec écrou et rondelle.",
    productType: "Boulonnerie",
    tags: ["diameter:10mm", "length:60mm", "drive:Hexagonal", "material:Acier Zingué", "head:Hexagonale"],
    priceHT: 12.90,
    image: "/placeholder.svg",
    variants: [
      { id: "6-10", title: "Sachet de 10", priceHT: 5.90, available: true, quantity: 145 },
      { id: "6-25", title: "Sachet de 25", priceHT: 12.90, available: true, quantity: 89 },
      { id: "6-100", title: "Boîte de 100", priceHT: 45.90, available: true, quantity: 34 },
    ],
    specs: {
      diameter: "M10",
      length: "60mm",
      driveType: "Hexagonal",
      material: "Acier Zingué 8.8",
      headType: "Hexagonale",
      norm: "DIN 933",
      thread: "Filetage total",
      coating: "Zingué blanc",
    },
  },
  {
    id: "7",
    handle: "vis-agglo-pz-5x50-zingue",
    title: "Vis aggloméré Pozidriv PZ2 5x50mm Zingué - Boîte de 500",
    description: "Vis polyvalente pour menuiserie et agencement. Pointe 4 tailles pour vissage sans pré-perçage.",
    productType: "Vis Agglo",
    tags: ["diameter:5mm", "length:50mm", "drive:Pozidriv PZ2", "material:Acier Zingué", "head:Fraisée"],
    priceHT: 22.90,
    image: "/placeholder.svg",
    variants: [
      { id: "7-200", title: "Boîte de 200", priceHT: 11.50, available: true, quantity: 189 },
      { id: "7-500", title: "Boîte de 500", priceHT: 22.90, available: true, quantity: 98 },
      { id: "7-1000", title: "Boîte de 1000", priceHT: 39.90, available: false, quantity: 0 },
    ],
    specs: {
      diameter: "5mm",
      length: "50mm",
      driveType: "Pozidriv PZ2",
      material: "Acier Zingué",
      headType: "Fraisée",
      norm: "DIN 7505-A",
      thread: "Filetage total",
      coating: "Zingué jaune",
    },
  },
  {
    id: "8",
    handle: "vis-terrasse-torx-4.5x45-a2",
    title: "Vis terrasse Torx TX20 4.5x45mm Inox A2 - Boîte de 250",
    description: "Vis fine pour terrasse composite et résineux tendre. Tête extra plate pour finition discrète.",
    productType: "Vis Terrasse",
    tags: ["diameter:4.5mm", "length:45mm", "drive:Torx TX20", "material:Inox A2", "head:Plate"],
    priceHT: 35.90,
    image: "/placeholder.svg",
    variants: [
      { id: "8-100", title: "Boîte de 100", priceHT: 16.90, available: true, quantity: 67 },
      { id: "8-250", title: "Boîte de 250", priceHT: 35.90, available: true, quantity: 28 },
    ],
    specs: {
      diameter: "4.5mm",
      length: "45mm",
      driveType: "Torx TX20",
      material: "Inox A2",
      headType: "Plate extra fine",
      norm: "Spéciale composite",
      thread: "Double filet",
      coating: "Inox naturel",
    },
  },
];

export const categories = [
  { id: "terrasse", name: "Vis Terrasse", icon: "deck", count: 3 },
  { id: "charpente", name: "Vis Charpente", icon: "frame", count: 2 },
  { id: "agglo", name: "Vis Agglo", icon: "panel", count: 2 },
  { id: "boulonnerie", name: "Boulonnerie", icon: "bolt", count: 1 },
];

export const filterOptions = {
  diameter: ["4mm", "4.5mm", "5mm", "6mm", "8mm", "10mm"],
  length: ["40mm", "45mm", "50mm", "60mm", "80mm", "120mm"],
  driveType: ["Torx TX20", "Torx TX25", "Torx TX30", "Torx TX40", "Pozidriv PZ2", "Hexagonal"],
  material: ["Acier Zingué", "Inox A2", "Inox A4", "Acier Zingué 8.8"],
  headType: ["Fraisée", "Plate", "Plate extra fine", "Hexagonale"],
};

export function filterProducts(products: MockProduct[], filters: Record<string, string[]>): MockProduct[] {
  return products.filter((product) => {
    for (const [key, values] of Object.entries(filters)) {
      if (values.length === 0) continue;
      
      const tagKey = key === "driveType" ? "drive" : key;
      const hasMatch = values.some((value) => 
        product.tags.some((tag) => tag.toLowerCase().includes(value.toLowerCase()))
      );
      
      if (!hasMatch) return false;
    }
    return true;
  });
}

export function searchProducts(products: MockProduct[], query: string): MockProduct[] {
  const lowerQuery = query.toLowerCase();
  return products.filter(
    (product) =>
      product.title.toLowerCase().includes(lowerQuery) ||
      product.description.toLowerCase().includes(lowerQuery) ||
      product.productType.toLowerCase().includes(lowerQuery) ||
      product.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getProductByHandle(handle: string): MockProduct | undefined {
  return mockProducts.find((p) => p.handle === handle);
}

export function getProductsByCategory(category: string): MockProduct[] {
  const categoryMap: Record<string, string> = {
    terrasse: "Vis Terrasse",
    charpente: "Vis Charpente",
    agglo: "Vis Agglo",
    boulonnerie: "Boulonnerie",
  };
  
  const productType = categoryMap[category];
  return productType ? mockProducts.filter((p) => p.productType === productType) : mockProducts;
}
