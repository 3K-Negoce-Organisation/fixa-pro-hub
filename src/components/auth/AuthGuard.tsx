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

      // Ensure we stop showing the spinner exactly once (prevents race conditions)
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }

      if (!sessionUser) {
        navigate("/auth");
      }
    };

    // Safety net: if auth never resolves (blocked storage/network), stop spinner
    const timeoutId = window.setTimeout(() => {
      if (!initializedRef.current) {
        console.warn("[AuthGuard] Session init timeout; redirecting to /auth");
        finalize(null);
      }
    }, 4000);

    // 1) Listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      finalize(session?.user ?? null);
    });

    // 2) THEN initial session check
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        finalize(session?.user ?? null);
      })
      .catch((err) => {
        console.error("[AuthGuard] getSession error", err);
        finalize(null);
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
