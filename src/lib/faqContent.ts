import { DEFAULT_SHIPPING_CONFIG } from "@/lib/shipping";

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  title: string;
  questions: FaqItem[];
};

export function buildFaqCategories(shipping: {
  freeShippingThresholdTtc: number;
  defaultShippingFeeTtc: number;
} = DEFAULT_SHIPPING_CONFIG): FaqCategory[] {
  return [
    {
      title: "Commandes et Paiement",
      questions: [
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
      ],
    },
    {
      title: "Livraison",
      questions: [
        {
          question: "Quels sont les délais de livraison ?",
          answer:
            "Les délais de livraison varient généralement entre 3 et 7 jours ouvrés selon votre localisation et la disponibilité des produits. Les commandes sont préparées sous 24 à 48h.",
        },
        {
          question: "Quels sont les frais de livraison ?",
          answer: `La livraison est gratuite lorsque le montant de vos produits (hors frais de port) atteint ${shipping.freeShippingThresholdTtc} € TTC. En dessous de ce seuil, des frais forfaitaires de ${shipping.defaultShippingFeeTtc} € TTC s'affichent dans le récapitulatif du panier avant le paiement.`,
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
      ],
    },
    {
      title: "Produits",
      questions: [
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
      ],
    },
    {
      title: "Compte et Données",
      questions: [
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
      ],
    },
    {
      title: "Retours et Réclamations",
      questions: [
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
      ],
    },
  ];
}

export function flattenFaqItems(
  shipping: {
    freeShippingThresholdTtc: number;
    defaultShippingFeeTtc: number;
  } = DEFAULT_SHIPPING_CONFIG,
): FaqItem[] {
  return buildFaqCategories(shipping).flatMap((category) => category.questions);
}

export function buildFaqPageJsonLd(
  shipping: {
    freeShippingThresholdTtc: number;
    defaultShippingFeeTtc: number;
  } = DEFAULT_SHIPPING_CONFIG,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: flattenFaqItems(shipping).map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
