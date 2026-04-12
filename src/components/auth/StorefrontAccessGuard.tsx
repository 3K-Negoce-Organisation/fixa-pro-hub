import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useStorefrontPublic } from "@/hooks/useStorefrontPublic";

interface StorefrontAccessGuardProps {
  children: React.ReactNode;
}

/**
 * Allows access if the user is logged in OR the site is open to the public (`sites.storefront_public`).
 */
const StorefrontAccessGuard = ({ children }: StorefrontAccessGuardProps) => {
  const navigate = useNavigate();
  const { data: storefrontPublic, isLoading: flagLoading, isFetching } = useStorefrontPublic();
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    const finalize = (sessionUser: User | null) => {
      setUser(sessionUser);
      if (!initializedRef.current) {
        initializedRef.current = true;
        setSessionReady(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      finalize(session?.user ?? null);
    });

    const timeoutId = window.setTimeout(() => {
      if (!initializedRef.current) {
        supabase.auth
          .getUser()
          .then(({ data, error }) => {
            if (error) finalize(null);
            else finalize(data.user ?? null);
          })
          .catch(() => finalize(null));
      }
    }, 1200);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        window.clearTimeout(timeoutId);
        finalize(session?.user ?? null);
      })
      .catch(() => {
        window.clearTimeout(timeoutId);
        supabase.auth
          .getUser()
          .then(({ data, error }) => {
            if (error) finalize(null);
            else finalize(data.user ?? null);
          })
          .catch(() => finalize(null));
      });

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || flagLoading) return;
    const open = storefrontPublic === true;
    if (!user && !open) {
      navigate("/auth?reason=private");
    }
  }, [user, storefrontPublic, sessionReady, flagLoading, navigate]);

  if (!sessionReady || flagLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        {isFetching ? (
          <p className="text-xs text-muted-foreground">Vérification de l&apos;accès…</p>
        ) : null}
      </div>
    );
  }

  if (!user && !storefrontPublic) {
    return null;
  }

  return <>{children}</>;
};

export default StorefrontAccessGuard;
