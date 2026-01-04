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
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId: number | undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);

        if (!nextSession?.user) {
          // Defer navigation to avoid potential auth state deadlocks
          setTimeout(() => navigate("/auth"), 0);
        }
      }
    );

    // Safety timeout: never block the app forever on the spinner
    timeoutId = window.setTimeout(() => {
      setLoading(false);
      // If auth didn't resolve in time, force user back to login.
      navigate("/auth");
    }, 4000);

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      if (!initialSession?.user) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
