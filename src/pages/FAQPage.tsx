import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useShippingConfig } from "@/hooks/useShippingConfig";

const FAQPage = () => {
  const { config: shippingConfig } = useShippingConfig();
  const faqCategories = [
    {
      title: "Commandes et Paiement",
      questions: [
        {
          question: "Comment passer une commande ?",
          answer: "Parcourez notre catalogue, ajoutez les articles à votre panier, puis validez depuis la page panier. Vous pouvez vous connecter, créer un compte, ou commander en tant qu'invité en indiquant votre email au moment du paiement."
        },
        {
          question: "Quels moyens de paiement acceptez-vous ?",
          answer: "Nous acceptons les paiements par carte bancaire (Visa, Mastercard) via notre plateforme sécurisée Stripe. Tous les paiements sont cryptés et sécurisés."
        },
        {
          question: "Puis-je modifier ou annuler ma commande ?",
          answer: "Vous pouvez modifier ou annuler votre commande tant qu'elle n'a pas été expédiée. Contactez-nous rapidement par téléphone au 06 17 91 20 29 ou par email pour toute modification."
        },
        {
          question: "Comment obtenir une facture ?",
          answer: "Une facture est automatiquement générée et envoyée par email après chaque commande. Vous pouvez également la retrouver dans votre espace client, section 'Mes commandes'."
        }
      ]
    },
    {
      title: "Livraison",
      questions: [
        {
          question: "Quels sont les délais de livraison ?",
          answer: "Les délais de livraison varient généralement entre 3 et 7 jours ouvrés selon votre localisation et la disponibilité des produits. Les commandes sont préparées sous 24 à 48h."
        },
        {
          question: "Quels sont les frais de livraison ?",
          answer: `La livraison est gratuite lorsque le montant de vos produits (hors frais de port) atteint ${shippingConfig.freeShippingThresholdTtc} € TTC. En dessous de ce seuil, des frais forfaitaires de ${shippingConfig.defaultShippingFeeTtc} € TTC s'affichent dans le récapitulatif du panier avant le paiement.`
        },
        {
          question: "Comment suivre ma commande ?",
          answer: "Une fois votre commande expédiée, vous recevrez un SMS avec un numéro de suivi. Vous pouvez également suivre l'état de votre commande depuis votre espace client dans la section 'Suivi de commandes'."
        },
        {
          question: "Livrez-vous à l'international ?",
          answer: "Actuellement, nous livrons uniquement en France métropolitaine. Pour toute demande spécifique, n'hésitez pas à nous contacter."
        }
      ]
    },
    {
      title: "Produits",
      questions: [
        {
          question: "Comment choisir la bonne vis pour mon projet ?",
          answer: "Le choix de la vis dépend de plusieurs facteurs : le matériau à fixer (bois, métal, etc.), l'usage (intérieur/extérieur), et les contraintes mécaniques. Consultez nos fiches produits détaillées ou contactez-nous pour des conseils personnalisés."
        },
        {
          question: "Quelle est la différence entre les vis inox A2 et A4 ?",
          answer: "L'inox A2 convient pour un usage intérieur ou extérieur protégé. L'inox A4, plus résistant à la corrosion, est recommandé pour les environnements agressifs (bord de mer, piscine, milieux chimiques)."
        },
        {
          question: "Que signifie le conditionnement par boîte ?",
          answer: "Nos vis sont vendues par boîtes contenant un nombre défini d'unités. Le nombre de vis par boîte est indiqué sur chaque fiche produit. Cela permet d'optimiser les coûts et de disposer du stock nécessaire pour vos projets."
        },
        {
          question: "Les produits sont-ils garantis ?",
          answer: "Tous nos produits sont garantis conformes aux normes en vigueur. En cas de défaut de fabrication, nous procédons à un échange ou un remboursement selon les conditions de notre politique de retour."
        }
      ]
    },
    {
      title: "Compte et Données",
      questions: [
        {
          question: "Comment créer un compte ?",
          answer: "Rendez-vous sur la page Connexion / Inscription, onglet « Inscription », et créez votre compte avec votre adresse email. Vous recevrez un email de confirmation : cliquez sur le lien pour activer votre compte. La boutique est ouverte à tous ; un compte vous permet de retrouver vos commandes et de gagner du temps lors de vos prochains achats."
        },
        {
          question: "Comment modifier mes informations personnelles ?",
          answer: "Connectez-vous à votre compte et accédez à la section 'Mon compte' pour modifier vos informations personnelles, adresses de facturation et de livraison."
        },
        {
          question: "Comment exercer mes droits RGPD ?",
          answer: "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Rendez-vous dans votre espace client, section 'Paramètres RGPD', ou contactez-nous directement."
        },
        {
          question: "Mon mot de passe est oublié, que faire ?",
          answer: "Sur la page de connexion, cliquez sur 'Mot de passe oublié'. Vous recevrez un email avec les instructions pour réinitialiser votre mot de passe."
        }
      ]
    },
    {
      title: "Retours et Réclamations",
      questions: [
        {
          question: "Comment effectuer un retour ?",
          answer: "Pour effectuer un retour, contactez notre service client dans les 14 jours suivant la réception. Les produits doivent être retournés dans leur emballage d'origine, non utilisés et en parfait état."
        },
        {
          question: "Que faire si ma commande est endommagée ?",
          answer: "En cas de colis endommagé, refusez la livraison ou émettez des réserves auprès du transporteur. Contactez-nous immédiatement avec des photos du dommage pour que nous puissions traiter votre réclamation."
        },
        {
          question: "Quel est le délai de remboursement ?",
          answer: "Une fois le retour réceptionné et validé, le remboursement est effectué sous 14 jours ouvrés sur le moyen de paiement utilisé lors de la commande."
        }
      ]
    }
  ];

  return (
    <PageBackground>
      <PageSeo
        title={STATIC_PAGE_SEO.faq.title}
        description={STATIC_PAGE_SEO.faq.description}
        canonical={staticPageCanonical(STATIC_PAGE_SEO.faq.path)}
      />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Foire Aux Questions</h1>
        <p className="text-muted-foreground mb-8">
          Retrouvez les réponses aux questions les plus fréquentes. Si vous ne trouvez pas la réponse à votre question, n'hésitez pas à nous contacter.
        </p>

        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => (
            <section key={categoryIndex}>
              <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
                {category.title}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((faq, faqIndex) => (
                  <AccordionItem key={faqIndex} value={`${categoryIndex}-${faqIndex}`}>
                    <AccordionTrigger className="text-left hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        <section className="mt-12 p-6 bg-muted/50 rounded-lg">
          <h2 className="text-xl font-semibold text-foreground mb-2">Vous n'avez pas trouvé votre réponse ?</h2>
          <p className="text-muted-foreground mb-4">
            Notre équipe est à votre disposition pour répondre à toutes vos questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <div>
              <span className="font-medium text-foreground">Téléphone :</span>{" "}
              <a href="tel:0617912029" className="text-primary hover:underline">06 17 91 20 29</a>
            </div>
            <div>
              <span className="font-medium text-foreground">Email :</span>{" "}
              <a href="mailto:contact@vis-a-bois.com" className="text-primary hover:underline">contact@vis-a-bois.com</a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </PageBackground>
  );
};

export default FAQPage;
