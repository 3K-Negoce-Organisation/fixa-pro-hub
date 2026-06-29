/** Données SEO partagées build + serveur (alignées sur src/lib/seo.ts et staticPageSeo.ts). */

export const SITE_URL = "https://www.vis-a-bois.com";
export const CANONICAL_HOST = "www.vis-a-bois.com";
/** Hôtes à rediriger en 301 vers le domaine canonique (GSC robots.txt, SEO). */
export const REDIRECT_HOSTS = new Set([
  "vis-a-bois.com",
  "vis-a-bois.fr",
  "www.vis-a-bois.fr",
]);
export const SITE_NAME = "Vis-à-Bois";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const DEFAULT_TITLE = "Vis à bois — Vis-à-Bois | Livraison 24/48h";
export const DEFAULT_DESCRIPTION =
  "Spécialiste des vis à bois pour particuliers et bricoleurs : terrasse, charpente, tirefond. +5000 références en stock. Livraison 24/48h.";

export const STATIC_PAGES = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  "/produits": {
    title: `Catalogue vis à bois — ${SITE_NAME}`,
    description:
      "Parcourez notre catalogue de vis à bois pour particuliers : terrasse, charpente, agglo, tirefond. Livraison 24/48h.",
  },
  "/promos": {
    title: `Promotions vis à bois — ${SITE_NAME}`,
    description: "Offres et promotions sur une sélection de vis à bois. Livraison 24/48h chez Vis-à-Bois.",
  },
  "/information-technique": {
    title: `Fiches techniques vis à bois — ${SITE_NAME}`,
    description: "Téléchargez les fiches techniques PDF de nos gammes de vis à bois professionnelles.",
  },
  "/faq": {
    title: "FAQ vis à bois professionnelles — Vis-à-Bois",
    description:
      "Questions fréquentes sur l'achat de vis à bois, la livraison, les paiements et les retours. Vis-à-Bois, spécialiste B2B.",
  },
  "/contact": {
    title: "Contact — Vis à bois professionnelles | Vis-à-Bois",
    description:
      "Contactez Vis-à-Bois pour vos commandes de vis à bois professionnelles, devis et conseils techniques. Réponse rapide.",
  },
  "/cgv": {
    title: "Conditions générales de vente — Vis-à-Bois",
    description: "CGV du site vis-a-bois.com : commandes, paiement, livraison et garanties pour l'achat de vis à bois.",
  },
  "/mentions-legales": {
    title: "Mentions légales — Vis-à-Bois",
    description: "Mentions légales du site vis-a-bois.com, édité par 3K-Négoce.",
  },
  "/politique-confidentialite": {
    title: "Politique de confidentialité — Vis-à-Bois",
    description: "Protection des données personnelles sur vis-a-bois.com : collecte, finalités et droits RGPD.",
  },
  "/cookies": {
    title: "Politique cookies — Vis-à-Bois",
    description: "Utilisation des cookies sur vis-a-bois.com et gestion de vos préférences.",
  },
  "/livraison": {
    title: "Livraison vis à bois — Délais et zones | Vis-à-Bois",
    description:
      "Livraison 24/48h de vos vis à bois en France métropolitaine. Frais de port, DOM-TOM et conditions de livraison.",
  },
  "/retours": {
    title: "Retours et remboursements — Vis-à-Bois",
    description: "Procédure de retour pour vos commandes de vis à bois sur vis-a-bois.com. Délai de 30 jours.",
  },
};

/** Routes privées / transactionnelles : noindex dans le HTML initial. */
export const NOINDEX_PATH_PREFIXES = [
  "/auth",
  "/compte",
  "/admin",
  "/panier",
  "/suivi",
  "/confirmation",
  "/paiement-annule",
];

export function absoluteUrl(path) {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildCategoryTitle(categoryName) {
  const lower = categoryName.toLowerCase();
  if (lower.includes("vis")) return `${categoryName} — Vis-à-Bois`;
  return `Vis à bois ${categoryName} — Vis-à-Bois`;
}

export function buildCategoryDescription(categoryName, productCount) {
  const countText =
    productCount && productCount > 0
      ? `${productCount} références de vis à bois`
      : "Large gamme de vis à bois";
  return `${countText} pour ${categoryName.toLowerCase()}. Acier zingué, inox A2/A4, livraison 24/48h. Commandez sur Vis-à-Bois.`;
}

export function buildProductTitle(title) {
  return `${title} — ${SITE_NAME}`;
}

export function buildProductDescription(product) {
  if (product.description?.trim()) {
    return product.description.trim().split(/\r?\n/)[0].slice(0, 160);
  }
  const parts = ["Vis à bois professionnelle"];
  if (product.diameter_mm && product.length_mm) {
    parts.push(`${product.diameter_mm}×${product.length_mm} mm`);
  }
  if (product.material) parts.push(product.material);
  if (product.drive_type) parts.push(product.drive_type);
  if (product.usage) parts.push(`usage ${product.usage}`);
  if (product.categories?.name) parts.push(product.categories.name);
  return `${parts.join(" — ")}. Livraison 24/48h chez ${SITE_NAME}.`;
}

export function manifestKey(pathname, searchParams) {
  if (pathname === "/produits") {
    const q = searchParams.get("q");
    const category = searchParams.get("category");
    if (q) return `/produits?q=${encodeURIComponent(q)}`;
    if (category) return `/produits?category=${encodeURIComponent(category)}`;
    return "/produits";
  }
  return pathname;
}

export function toManifestEntry({ title, description, canonical, noindex = false, ogImage = DEFAULT_OG_IMAGE }) {
  return {
    title,
    description,
    canonical: absoluteUrl(canonical),
    ogImage,
    ...(noindex ? { noindex: true } : {}),
  };
}
