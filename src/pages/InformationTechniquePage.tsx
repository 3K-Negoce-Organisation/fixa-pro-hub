import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { TECHNICAL_SHEETS } from "@/lib/technicalSheets";
import { absoluteUrl } from "@/lib/seo";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const SEO_TITLE = "Fiches techniques vis à bois VBF, VBHT, QS, VBL — Vis-à-Bois";
const SEO_DESCRIPTION =
  "Téléchargez les fiches techniques PDF de nos gammes de vis à bois professionnelles : VBF, VBHT tirefond, QS terrasse et VBL charpente.";

export default function InformationTechniquePage() {
  const handleDownload = (file: string, title: string) => {
    const link = document.createElement("a");
    link.href = file;
    link.download = `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageBackground>
      <PageSeo
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonical={absoluteUrl("/information-technique")}
      />
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Informations Techniques
            </h1>
            <p className="text-muted-foreground">
              Retrouvez toutes les fiches techniques de nos vis à bois pour vous aider dans vos choix.
            </p>
          </div>

          <div className="space-y-3">
            {TECHNICAL_SHEETS.map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc.file, doc.title)}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </PageBackground>
  );
}
