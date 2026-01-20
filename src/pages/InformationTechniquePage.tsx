import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const documents = [
  {
    id: "vbl",
    title: "VBL - Vis Bois Longue",
    description: "Fiche technique des vis bois longues pour charpente et ossature bois",
    file: "/docs/FT-VBL.pdf",
  },
  {
    id: "vbf",
    title: "VBF - Vis Bois à Filetage partiel",
    description: "Fiche technique des vis bois à filetage partiel",
    file: "/docs/FT-VBF.pdf",
  },
  {
    id: "vbht",
    title: "VBHT - Vis Bois Haute Ténacité",
    description: "Fiche technique des vis bois haute ténacité pour applications exigeantes",
    file: "/docs/FT-VBHT.pdf",
  },
  {
    id: "vrac-qs",
    title: "VRAC QS - Vis en Vrac Quick Start",
    description: "Fiche technique des vis en vrac avec démarrage rapide",
    file: "/docs/FT-VRAC-QS.pdf",
  },
];

export default function InformationTechniquePage() {
  const handleView = (file: string) => {
    window.open(file, "_blank");
  };

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
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Informations Techniques
            </h1>
            <p className="text-muted-foreground">
              Retrouvez toutes les fiches techniques de nos produits pour vous aider dans vos choix.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {doc.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleView(doc.file)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Consulter
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(doc.file, doc.title)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </PageBackground>
  );
}
