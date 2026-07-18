import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { X, Cookie } from "lucide-react";
import {
  applyCookiePreferencesToGa,
  COOKIE_CONSENT_KEY,
  COOKIE_PREFERENCES_KEY,
  type CookiePreferences,
} from "@/lib/ga";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Delay display for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    applyCookiePreferencesToGa(prefs);
    setIsVisible(false);
  };

  const acceptAll = () => {
    const allAccepted = { necessary: true, analytics: true, marketing: true };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const acceptSelected = () => {
    saveConsent(preferences);
  };

  const rejectAll = () => {
    const onlyNecessary = { necessary: true, analytics: false, marketing: false };
    setPreferences(onlyNecessary);
    saveConsent(onlyNecessary);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="container max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-4">
            <Cookie className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                🍪 Nous utilisons des cookies
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ce site utilise des cookies pour améliorer votre expérience. Certains sont essentiels au fonctionnement du site, d'autres nous aident à l'améliorer.{" "}
                <Link to="/cookies" className="text-primary hover:underline">
                  En savoir plus
                </Link>
              </p>

              {showDetails && (
                <div className="space-y-3 mb-4 p-4 bg-muted/50 rounded-md">
                  <label className="flex items-center gap-3 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={preferences.necessary}
                      disabled
                      className="h-4 w-4 rounded border-border"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Cookies nécessaires
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (obligatoires)
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Essentiels au fonctionnement du site (authentification, panier).
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Cookies analytiques
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Nous aident à comprendre comment vous utilisez le site.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) =>
                        setPreferences({ ...preferences, marketing: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Cookies marketing
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Permettent de vous proposer des publicités pertinentes.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={acceptAll} className="flex-1 sm:flex-none">
                  Tout accepter
                </Button>
                <Button
                  onClick={rejectAll}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  Tout refuser
                </Button>
                {showDetails ? (
                  <Button
                    onClick={acceptSelected}
                    variant="secondary"
                    className="flex-1 sm:flex-none"
                  >
                    Enregistrer mes choix
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowDetails(true)}
                    variant="ghost"
                    className="flex-1 sm:flex-none"
                  >
                    Personnaliser
                  </Button>
                )}
              </div>
            </div>
            <button
              onClick={rejectAll}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
