import { absoluteUrl } from "@/lib/seo";

export type StaticPageSeo = {
  title: string;
  description: string;
  path: string;
};

export const STATIC_PAGE_SEO = {
  promos: {
    title: "Promotions vis à bois — Vis-à-Bois",
    description: "Offres et promotions sur une sélection de vis à bois. Livraison 24/48h chez Vis-à-Bois.",
    path: "/promos",
  },
  faq: {
    title: "FAQ vis à bois professionnelles — Vis-à-Bois",
    description:
      "Questions fréquentes sur l'achat de vis à bois, la livraison, les paiements et les retours. Vis-à-Bois, spécialiste B2B.",
    path: "/faq",
  },
  blog: {
    title: "Blog vis à bois — Conseils et guides | Vis-à-Bois",
    description:
      "Guides pratiques pour choisir et poser vos vis à bois : terrasse, charpente, tirefond, empreintes Torx. Conseils Vis-à-Bois.",
    path: "/blog",
  },
  contact: {
    title: "Contact — Vis à bois professionnelles | Vis-à-Bois",
    description:
      "Contactez Vis-à-Bois pour vos commandes de vis à bois professionnelles, devis et conseils techniques. Réponse rapide.",
    path: "/contact",
  },
  cgv: {
    title: "Conditions générales de vente — Vis-à-Bois",
    description: "CGV du site vis-a-bois.com : commandes, paiement, livraison et garanties pour l'achat de vis à bois.",
    path: "/cgv",
  },
  mentions: {
    title: "Mentions légales — Vis-à-Bois",
    description: "Mentions légales du site vis-a-bois.com, édité par 3K-Négoce.",
    path: "/mentions-legales",
  },
  privacy: {
    title: "Politique de confidentialité — Vis-à-Bois",
    description: "Protection des données personnelles sur vis-a-bois.com : collecte, finalités et droits RGPD.",
    path: "/politique-confidentialite",
  },
  cookies: {
    title: "Politique cookies — Vis-à-Bois",
    description: "Utilisation des cookies sur vis-a-bois.com et gestion de vos préférences.",
    path: "/cookies",
  },
  livraison: {
    title: "Livraison vis à bois — Délais et zones | Vis-à-Bois",
    description:
      "Livraison 24/48h de vos vis à bois en France métropolitique. Frais de port, DOM-TOM et conditions de livraison.",
    path: "/livraison",
  },
  retours: {
    title: "Retours et remboursements — Vis-à-Bois",
    description: "Procédure de retour pour vos commandes de vis à bois sur vis-a-bois.com. Délai de 30 jours.",
    path: "/retours",
  },
} as const satisfies Record<string, StaticPageSeo>;

export function staticPageCanonical(path: string): string {
  return absoluteUrl(path);
}
