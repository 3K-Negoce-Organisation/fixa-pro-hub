import { AlertTriangle } from "lucide-react";

/**
 * Bandeau visible lorsque `sites.stripe_mode === 'test'` sur tout parcours où Stripe est affiché ou lancé.
 */
export function StripeTestModeBanner() {
  return (
    <div
      role="status"
      className="rounded-lg border-2 border-amber-500 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 mb-4"
    >
      <p className="font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Environnement Stripe TEST
      </p>
      <p className="mt-1 text-xs opacity-90">
        Aucun prélèvement réel : cartes de test uniquement. Ce bandeau disparaît lorsque le site est repassé en mode
        production (live) depuis l&apos;administration.
      </p>
    </div>
  );
}
