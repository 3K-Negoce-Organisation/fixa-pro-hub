import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const finalize = (sessionUser: User | null) => {
      setUser(sessionUser);

      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }

      if (!sessionUser) {
        navigate("/auth");
      }
    };

    // 1) Listener FIRST (sync-only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      finalize(session?.user ?? null);
    });

    // 2) Resolve auth state.
    // In some environments getSession can hang; getUser performs a network call and is a reliable fallback.
    const timeoutId = window.setTimeout(() => {
      if (!initializedRef.current) {
        console.warn("[AuthGuard] getSession seems stuck; falling back to getUser()");
        supabase.auth
          .getUser()
          .then(({ data, error }) => {
            if (error) {
              console.error("[AuthGuard] getUser error", error);
              finalize(null);
              return;
            }
            finalize(data.user ?? null);
          })
          .catch((err) => {
            console.error("[AuthGuard] getUser unexpected error", err);
            finalize(null);
          });
      }
    }, 1200);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        window.clearTimeout(timeoutId);
        finalize(session?.user ?? null);
      })
      .catch((err) => {
        window.clearTimeout(timeoutId);
        console.error("[AuthGuard] getSession error", err);
        // fallback
        supabase.auth
          .getUser()
          .then(({ data, error }) => {
            if (error) {
              console.error("[AuthGuard] getUser error", error);
              finalize(null);
              return;
            }
            finalize(data.user ?? null);
          })
          .catch(() => finalize(null));
      });

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
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
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
