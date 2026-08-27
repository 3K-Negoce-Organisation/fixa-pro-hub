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
/** Cache-bust so WhatsApp / LinkedIn / iMessage refetch after logo updates. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg?v=20260721`;
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
  "/guide-choix-vis-a-bois": {
    title: "Comment choisir ses vis à bois — Guide | Vis-à-Bois",
    description:
      "Guide pratique pour choisir ses vis à bois : diamètre, longueur, matériau (zingué, inox A2/A4), usages terrasse, charpente et tirefond.",
  },
  "/comparatif-vis-inox-a2-a4": {
    title: "Vis inox A2 vs A4 — Comparatif | Vis-à-Bois",
    description:
      "Différence entre vis inox A2 et A4 : corrosion, usages intérieur/extérieur, bord de mer. Quel inox choisir pour vos vis à bois.",
  },
  "/a-propos": {
    title: "À propos de Vis-à-Bois — Spécialiste vis à bois | 3K-Négoce",
    description:
      "Vis-à-Bois est la boutique en ligne de 3K-Négoce, spécialisée dans les vis à bois pour particuliers et professionnels. Catalogue, livraison 24/48h.",
  },
};

/** Seuils livraison par défaut (alignés src/lib/shipping.ts) pour FAQ JSON-LD serveur. */
const DEFAULT_FREE_SHIPPING_TTC = 150;
const DEFAULT_SHIPPING_FEE_TTC = 12;

/** FAQ plate pour schema.org FAQPage (valeurs shipping par défaut). */
export const FAQ_ITEMS_FOR_SCHEMA = [
  {
    question: "Comment passer une commande ?",
    answer:
      "Parcourez notre catalogue, ajoutez les articles à votre panier, puis validez depuis la page panier. Vous pouvez vous connecter, créer un compte, ou commander en tant qu'invité en indiquant votre email au moment du paiement.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer:
      "Nous acceptons les paiements par carte bancaire (Visa, Mastercard) via notre plateforme sécurisée Stripe. Tous les paiements sont cryptés et sécurisés.",
  },
  {
    question: "Puis-je modifier ou annuler ma commande ?",
    answer:
      "Vous pouvez modifier ou annuler votre commande tant qu'elle n'a pas été expédiée. Contactez-nous rapidement par téléphone au 06 17 91 20 29 ou par email pour toute modification.",
  },
  {
    question: "Comment obtenir une facture ?",
    answer:
      "Une facture est automatiquement générée et envoyée par email après chaque commande. Vous pouvez également la retrouver dans votre espace client, section 'Mes commandes'.",
  },
  {
    question: "Quels sont les délais de livraison ?",
    answer:
      "Les délais de livraison varient généralement entre 3 et 7 jours ouvrés selon votre localisation et la disponibilité des produits. Les commandes sont préparées sous 24 à 48h.",
  },
  {
    question: "Quels sont les frais de livraison ?",
    answer: `La livraison est gratuite lorsque le montant de vos produits (hors frais de port) atteint ${DEFAULT_FREE_SHIPPING_TTC} € TTC. En dessous de ce seuil, des frais forfaitaires de ${DEFAULT_SHIPPING_FEE_TTC} € TTC s'affichent dans le récapitulatif du panier avant le paiement.`,
  },
  {
    question: "Comment suivre ma commande ?",
    answer:
      "Une fois votre commande expédiée, vous recevrez un SMS avec un numéro de suivi. Vous pouvez également suivre l'état de votre commande depuis votre espace client dans la section 'Suivi de commandes'.",
  },
  {
    question: "Livrez-vous à l'international ?",
    answer:
      "Actuellement, nous livrons uniquement en France métropolitaine. Pour toute demande spécifique, n'hésitez pas à nous contacter.",
  },
  {
    question: "Comment choisir la bonne vis pour mon projet ?",
    answer:
      "Le choix de la vis dépend de plusieurs facteurs : le matériau à fixer (bois, métal, etc.), l'usage (intérieur/extérieur), et les contraintes mécaniques. Consultez nos fiches produits détaillées ou contactez-nous pour des conseils personnalisés.",
  },
  {
    question: "Quelle est la différence entre les vis inox A2 et A4 ?",
    answer:
      "L'inox A2 convient pour un usage intérieur ou extérieur protégé. L'inox A4, plus résistant à la corrosion, est recommandé pour les environnements agressifs (bord de mer, piscine, milieux chimiques).",
  },
  {
    question: "Que signifie le conditionnement par boîte ?",
    answer:
      "Nos vis sont vendues par boîtes contenant un nombre défini d'unités. Le nombre de vis par boîte est indiqué sur chaque fiche produit. Cela permet d'optimiser les coûts et de disposer du stock nécessaire pour vos projets.",
  },
  {
    question: "Les produits sont-ils garantis ?",
    answer:
      "Tous nos produits sont garantis conformes aux normes en vigueur. En cas de défaut de fabrication, nous procédons à un échange ou un remboursement selon les conditions de notre politique de retour.",
  },
  {
    question: "Comment créer un compte ?",
    answer:
      "Rendez-vous sur la page Connexion / Inscription, onglet « Inscription », et créez votre compte avec votre adresse email. Vous recevrez un email de confirmation : cliquez sur le lien pour activer votre compte. La boutique est ouverte à tous ; un compte vous permet de retrouver vos commandes et de gagner du temps lors de vos prochains achats.",
  },
  {
    question: "Comment modifier mes informations personnelles ?",
    answer:
      "Connectez-vous à votre compte et accédez à la section 'Mon compte' pour modifier vos informations personnelles, adresses de facturation et de livraison.",
  },
  {
    question: "Comment exercer mes droits RGPD ?",
    answer:
      "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Rendez-vous dans votre espace client, section 'Paramètres RGPD', ou contactez-nous directement.",
  },
  {
    question: "Mon mot de passe est oublié, que faire ?",
    answer:
      "Sur la page de connexion, cliquez sur 'Mot de passe oublié'. Vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.",
  },
  {
    question: "Comment effectuer un retour ?",
    answer:
      "Pour effectuer un retour, contactez notre service client dans les 14 jours suivant la réception. Les produits doivent être retournés dans leur emballage d'origine, non utilisés et en parfait état.",
  },
  {
    question: "Que faire si ma commande est endommagée ?",
    answer:
      "En cas de colis endommagé, refusez la livraison ou émettez des réserves auprès du transporteur. Contactez-nous immédiatement avec des photos du dommage pour que nous puissions traiter votre réclamation.",
  },
  {
    question: "Quel est le délai de remboursement ?",
    answer:
      "Une fois le retour réceptionné et validé, le remboursement est effectué sous 14 jours ouvrés sur le moyen de paiement utilisé lors de la commande.",
  },
];

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    legalName: "3K-Négoce",
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.jpg`,
    description: DEFAULT_DESCRIPTION,
    email: "contact@vis-a-bois.com",
    telephone: "+33617912029",
    address: {
      "@type": "PostalAddress",
      streetAddress: "47 rue Vivienne",
      addressLocality: "Paris",
      postalCode: "75002",
      addressCountry: "FR",
    },
    vatID: "FR45102662483",
    sameAs: [SITE_URL],
    areaServed: { "@type": "Country", name: "France" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+33617912029",
      contactType: "customer service",
      availableLanguage: "French",
      areaServed: "FR",
    },
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/produits?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildFaqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS_FOR_SCHEMA.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Texte crawlable (noscript) — pages clés uniquement, sans impact UI React. */
export const CRAWL_HTML_BY_PATH = {
  "/": `<h1>Vis à bois — Vis-à-Bois</h1><p>${DEFAULT_DESCRIPTION}</p><p>Vis-à-Bois est la boutique en ligne de 3K-Négoce, spécialisée dans les vis à bois pour terrasse, charpente, agglo et tirefond. Catalogue en stock, livraison France métropolitaine 24/48h.</p><ul><li><a href="${SITE_URL}/guide-choix-vis-a-bois">Guide : comment choisir ses vis à bois</a></li><li><a href="${SITE_URL}/comparatif-vis-inox-a2-a4">Comparatif inox A2 vs A4</a></li><li><a href="${SITE_URL}/faq">FAQ</a></li><li><a href="${SITE_URL}/a-propos">À propos</a></li></ul>`,
  "/faq": `<h1>FAQ vis à bois — Vis-à-Bois</h1>${FAQ_ITEMS_FOR_SCHEMA.map(
    (item) => `<h2>${item.question}</h2><p>${item.answer}</p>`,
  ).join("")}`,
  "/guide-choix-vis-a-bois": `<h1>Comment choisir ses vis à bois</h1><p>Pour choisir une vis à bois, retenez d’abord l’usage (terrasse, charpente, agglo, tirefond), puis le matériau (acier zingué, inox A2 ou inox A4), le diamètre et la longueur. Vis-à-Bois propose plus de 5000 références en stock avec livraison 24/48h.</p>`,
  "/comparatif-vis-inox-a2-a4": `<h1>Vis inox A2 vs A4</h1><p>L’inox A2 convient à l’intérieur et à l’extérieur protégé. L’inox A4 résiste mieux à la corrosion (bord de mer, piscine, milieux agressifs). Choisissez A4 dès que l’environnement est corrosif.</p>`,
  "/a-propos": `<h1>À propos de Vis-à-Bois</h1><p>Vis-à-Bois est édité par 3K-Négoce (SAS, 47 rue Vivienne, 75002 Paris). Spécialiste des vis à bois pour particuliers et professionnels, livraison France métropolitaine.</p>`,
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

export function toManifestEntry({
  title,
  description,
  canonical,
  noindex = false,
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd,
  crawlHtml,
}) {
  return {
    title,
    description,
    canonical: absoluteUrl(canonical),
    ogImage,
    ...(noindex ? { noindex: true } : {}),
    ...(jsonLd ? { jsonLd } : {}),
    ...(crawlHtml ? { crawlHtml } : {}),
  };
}

/** Enrichit une entrée manifest avec JSON-LD / crawlHtml pour les pages GEO. */
export function withGeoExtras(path, entry) {
  const extras = {};
  if (path === "/") {
    extras.jsonLd = [buildWebsiteJsonLd(), buildOrganizationJsonLd()];
  } else if (path === "/faq") {
    extras.jsonLd = [buildFaqPageJsonLd(), buildOrganizationJsonLd()];
  } else if (path === "/a-propos") {
    extras.jsonLd = [buildOrganizationJsonLd()];
  } else if (path === "/guide-choix-vis-a-bois" || path === "/comparatif-vis-inox-a2-a4") {
    extras.jsonLd = [buildOrganizationJsonLd()];
  }
  if (CRAWL_HTML_BY_PATH[path]) {
    extras.crawlHtml = CRAWL_HTML_BY_PATH[path];
  }
  return { ...entry, ...extras };
}
