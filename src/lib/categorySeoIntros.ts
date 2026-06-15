/** Textes d'introduction SEO (150–300 mots) par slug de catégorie. */
const CATEGORY_INTROS: Record<string, string> = {
  terrasse: `Vis-à-Bois propose une gamme complète de vis à bois pour terrasse en inox A2, inox A4 et acier zingué. Nos vis terrasse professionnelles (gamme QS Quadra Speed et références Torx) sont conçues pour la fixation de lames bois, dalles composite et structures extérieures. Tête fraisée ou plate, empreinte Torx anti-dérapage, filetage adapté au bois dur et au bois exotique : chaque référence est pensée pour un vissage rapide et une tenue durable en extérieur. Que vous installiez une terrasse particulière ou un chantier B2B, commandez vos vis à bois terrasse au meilleur rapport qualité-prix avec livraison 24/48h.`,

  "vis-terrasse": `Vis-à-Bois propose une gamme complète de vis à bois pour terrasse en inox A2, inox A4 et acier zingué. Nos vis terrasse professionnelles (gamme QS Quadra Speed et références Torx) sont conçues pour la fixation de lames bois, dalles composite et structures extérieures. Tête fraisée ou plate, empreinte Torx anti-dérapage, filetage adapté au bois dur et au bois exotique : chaque référence est pensée pour un vissage rapide et une tenue durable en extérieur. Que vous installiez une terrasse particulière ou un chantier B2B, commandez vos vis à bois terrasse au meilleur rapport qualité-prix avec livraison 24/48h.`,

  charpente: `Retrouvez chez Vis-à-Bois toutes les vis à bois charpente pour ossature, chevrons, solives et assemblages structurels. La gamme VBF (vis à bois tête fraisée galvanisée) couvre les diamètres 3 à 10 mm et les longueurs jusqu'à 300 mm, avec empreintes Torx pour un serrage précis. Nos vis à bois charpente répondent aux exigences des menuisiers, charpentiers et entreprises du bâtiment : acier galvanisé bleu, haute résistance mécanique, filetage partiel ou total selon les modèles. Commandez en ligne vos vis à bois pour charpente avec prix HT et livraison 24/48h.`,

  "vis-charpente": `Retrouvez chez Vis-à-Bois toutes les vis à bois charpente pour ossature, chevrons, solives et assemblages structurels. La gamme VBF (vis à bois tête fraisée galvanisée) couvre les diamètres 3 à 10 mm et les longueurs jusqu'à 300 mm, avec empreintes Torx pour un serrage précis. Nos vis à bois charpente répondent aux exigences des menuisiers, charpentiers et entreprises du bâtiment : acier galvanisé bleu, haute résistance mécanique, filetage partiel ou total selon les modèles. Commandez en ligne vos vis à bois pour charpente avec prix HT et livraison 24/48h.`,

  agglo: `Les vis à bois agglo et panneaux dérivés du bois nécessitent un filetage adapté et une tête qui ne fissure pas le support. Vis-à-Bois sélectionne des vis à bois VBF et références spécialisées pour l'aggloméré, le MDF et les panneaux OSB. Diamètres fins, longueurs courtes à moyennes, finition galvanisée : idéal pour l'ameublement, la menuiserie intérieure et les second œuvres. Parcourez notre catalogue de vis à bois agglo, filtrez par dimensions et matériau, et bénéficiez de la livraison express pour vos chantiers professionnels.`,

  "vis-agglo": `Les vis à bois agglo et panneaux dérivés du bois nécessitent un filetage adapté et une tête qui ne fissure pas le support. Vis-à-Bois sélectionne des vis à bois VBF et références spécialisées pour l'aggloméré, le MDF et les panneaux OSB. Diamètres fins, longueurs courtes à moyennes, finition galvanisée : idéal pour l'ameublement, la menuiserie intérieure et les second œuvres. Parcourez notre catalogue de vis à bois agglo, filtrez par dimensions et matériau, et bénéficiez de la livraison express pour vos chantiers professionnels.`,

  tirefond: `Pour les assemblages structurels exigeants, Vis-à-Bois distribue des vis à bois tirefond VBHT à tête hexagonale. Ces vis à bois haute résistance conviennent aux charpentes, ponts bois et constructions lourdes. Acier zingué, filetage agressif, tête hex pour serrage à clé : la gamme tirefond complète nos vis à bois classiques VBF. Téléchargez la fiche technique VBHT et commandez vos vis à bois tirefond en ligne avec tarifs professionnels HT.`,

  boulonnerie: `En complément de nos vis à bois, Vis-à-Bois propose une sélection de boulonnerie pour la construction bois et métal. Boulons, écrous et fixations associées pour vos assemblages structurels. Idéal pour les professionnels qui cherchent un fournisseur unique en fixation bois. Livraison 24/48h sur l'ensemble du catalogue.`,
};

const DEFAULT_INTRO = `Vis-à-Bois est le spécialiste des vis à bois pour particuliers et bricoleurs. Terrasse, charpente, agglo, tirefond : plus de 5000 références en stock, livraison 24/48h. Filtrez par diamètre, longueur et matériau pour trouver la vis à bois adaptée à votre projet.`;

export function getCategorySeoIntro(slug: string | null | undefined, categoryName?: string | null): string {
  if (!slug) return DEFAULT_INTRO;
  const normalized = slug.toLowerCase();
  if (CATEGORY_INTROS[normalized]) return CATEGORY_INTROS[normalized];

  const nameKey = categoryName?.toLowerCase().replace(/\s+/g, "-") ?? "";
  if (nameKey && CATEGORY_INTROS[nameKey]) return CATEGORY_INTROS[nameKey];

  if (categoryName) {
    return `Découvrez notre sélection de vis à bois ${categoryName.toLowerCase()} pour particuliers. ${DEFAULT_INTRO}`;
  }

  return DEFAULT_INTRO;
}
