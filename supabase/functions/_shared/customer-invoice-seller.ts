/** Informations légales vendeur (3K-Negoce) — facture client. */
export const CUSTOMER_INVOICE_SELLER = {
  name: "3K-Negoce",
  addressLine1: "47 Rue Vivienne",
  postalCode: "75002",
  city: "Paris",
  country: "France",
  siret: "102 662 483 00019",
  vatNumber: "FR45102662483",
} as const;

export const CUSTOMER_INVOICE_LEGAL_LINES = [
  "Paiement : réglé par carte bancaire à la commande.",
  "TVA française au taux de 20 % applicable conformément à la réglementation en vigueur.",
  "Escompte pour paiement anticipé : néant.",
  "En cas de retard de paiement, pénalités au taux BCE majoré de 10 points (art. L441-10 C. com.)",
  "et indemnité forfaitaire de recouvrement de 40 € (art. D441-5 C. com.).",
] as const;
