import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const MentionsLegalesPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Mentions légales</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Éditeur du site</h2>
            <p className="text-muted-foreground">
              Le site vis-a-bois.fr est édité par :<br />
              <strong>Vis à Bois</strong><br />
              Société par actions simplifiée (SAS)<br />
              Capital social : [À compléter]<br />
              RCS : [À compléter]<br />
              SIRET : [À compléter]<br />
              Siège social : [Adresse à compléter]<br />
              Téléphone : 03 88 XX XX XX<br />
              Email : contact@vis-a-bois.fr
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Directeur de la publication</h2>
            <p className="text-muted-foreground">
              Le directeur de la publication est [Nom du directeur à compléter], en qualité de [fonction].
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Hébergeur</h2>
            <p className="text-muted-foreground">
              Le site est hébergé par :<br />
              <strong>Lovable</strong><br />
              Adresse : [Adresse de l'hébergeur]<br />
              Site web : lovable.dev
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Propriété intellectuelle</h2>
            <p className="text-muted-foreground">
              L'ensemble du contenu de ce site (textes, images, vidéos, logos, icônes, sons, logiciels, etc.) est la propriété exclusive de Vis à Bois ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
            </p>
            <p className="text-muted-foreground mt-2">
              Toute reproduction, représentation, modification, publication, transmission, dénaturation, totale ou partielle du site ou de son contenu, par quelque procédé que ce soit, et sur quelque support que ce soit est interdite sans l'autorisation écrite préalable de Vis à Bois.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Limitation de responsabilité</h2>
            <p className="text-muted-foreground">
              Vis à Bois s'efforce d'assurer au mieux de ses possibilités l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, Vis à Bois ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur ce site.
            </p>
            <p className="text-muted-foreground mt-2">
              Vis à Bois décline toute responsabilité pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur ce site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Droit applicable</h2>
            <p className="text-muted-foreground">
              Le présent site et les mentions légales qui y figurent sont soumis au droit français. En cas de litige, les tribunaux français seront seuls compétents.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MentionsLegalesPage;
