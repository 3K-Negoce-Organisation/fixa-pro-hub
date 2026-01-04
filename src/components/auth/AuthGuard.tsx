import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Guard against an infinite spinner if auth storage/callbacks misbehave.
    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, 3000);

    // Listener first (prevents missing events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      // IMPORTANT: don't redirect on INITIAL_SESSION; wait for getSession() below.
      if (event === "SIGNED_OUT") {
        setTimeout(() => navigate("/auth"), 0);
      }
    });

    // Then fetch current session (authoritative for initial state)
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);

        if (!initialSession?.user) {
          navigate("/auth");
        }
      })
      .catch((err) => {
        console.error("[AuthGuard] getSession failed", err);
        setTimedOut(true);
        setLoading(false);
      });

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    if (!timedOut) return null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 bg-card border border-border rounded-lg p-6 text-center space-y-3">
          <h1 className="text-lg font-semibold">Session non chargée</h1>
          <p className="text-sm text-muted-foreground">
            La session n’a pas pu être récupérée. Cela arrive si le stockage du navigateur est bloqué
            ou si l’auth ne se réhydrate pas correctement.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => navigate("/auth")}
            >
              Retour à la connexion
            </button>
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => window.location.reload()}
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
