import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";
import { buildFaqCategories, buildFaqPageJsonLd } from "@/lib/faqContent";
import { buildOrganizationJsonLd } from "@/lib/organizationJsonLd";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useShippingConfig } from "@/hooks/useShippingConfig";

const FAQPage = () => {
  const { config: shippingConfig } = useShippingConfig();
  const faqCategories = buildFaqCategories(shippingConfig);

  return (
    <PageBackground>
      <PageSeo
        title={STATIC_PAGE_SEO.faq.title}
        description={STATIC_PAGE_SEO.faq.description}
        canonical={staticPageCanonical(STATIC_PAGE_SEO.faq.path)}
        jsonLd={[buildFaqPageJsonLd(shippingConfig), buildOrganizationJsonLd()]}
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
