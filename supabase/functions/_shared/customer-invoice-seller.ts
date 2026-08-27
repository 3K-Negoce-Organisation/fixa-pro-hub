/** Informations légales vendeur (3K-Négoce) — facture client. */
export const CUSTOMER_INVOICE_SELLER = {
  name: "3K-Negoce",
  legalForm: "SAS",
  shareCapitalEur: 90,
  shareCapitalLabel: "SAS au capital de 90 €",
  addressLine1: "47 Rue Vivienne",
  postalCode: "75002",
  city: "Paris",
  country: "France",
  siren: "102 662 483",
  rcs: "RCS Paris 102 662 483",
  siret: "102 662 483 00019",
  vatNumber: "FR45102662483",
} as const;

export function formatCustomerInvoiceSellerLines(): string[] {
  return [
    CUSTOMER_INVOICE_SELLER.name,
    CUSTOMER_INVOICE_SELLER.addressLine1,
    `${CUSTOMER_INVOICE_SELLER.postalCode} ${CUSTOMER_INVOICE_SELLER.city}`,
    CUSTOMER_INVOICE_SELLER.country,
    CUSTOMER_INVOICE_SELLER.shareCapitalLabel,
    CUSTOMER_INVOICE_SELLER.rcs,
    `SIRET : ${CUSTOMER_INVOICE_SELLER.siret}`,
    `TVA intracom. : ${CUSTOMER_INVOICE_SELLER.vatNumber}`,
  ];
}

export const CUSTOMER_INVOICE_LEGAL_LINES = [
  "Paiement : réglé par carte bancaire à la commande.",
  "TVA française au taux de 20 % applicable conformément à la réglementation en vigueur.",
  "Escompte pour paiement anticipé : néant.",
  "En cas de retard de paiement, pénalités au taux BCE majoré de 10 points (art. L441-10 C. com.)",
  "et indemnité forfaitaire de recouvrement de 40 € (art. D441-5 C. com.).",
] as const;
