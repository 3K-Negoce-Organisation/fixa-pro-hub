import { Headphones, RotateCcw, Shield, Truck, type LucideIcon } from "lucide-react";

const ITEMS: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: Shield, title: "Paiement sécurisé", sub: "SSL / 3D Secure" },
  { icon: Truck, title: "Livraison rapide", sub: "24/48h" },
  { icon: RotateCcw, title: "Retours faciles", sub: "Sous 14 jours" },
  { icon: Headphones, title: "Service client", sub: "À votre écoute" },
];

export function MarketplaceTrustStrip() {
  return (
    <section className="border-t border-[#000d4f]/10">
      <div className="container grid grid-cols-2 gap-6 py-10 md:grid-cols-4 md:gap-8 md:py-12">
        {ITEMS.map(({ icon: Icon, title, sub }) => (
          <div
            key={title}
            className="theme-frame flex items-start gap-3 bg-[rgba(0,13,79,0.04)] p-3"
          >
            <Icon className="mt-0.5 h-6 w-6 shrink-0 stroke-[1.5] text-[var(--brand-orange)]" />
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-0.5 text-xs text-[#000d4f]/55">{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
