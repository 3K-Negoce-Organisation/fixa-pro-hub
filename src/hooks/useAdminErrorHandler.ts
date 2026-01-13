import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TechnicalError {
  id: string;
  timestamp: Date;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  context?: string;
  stack?: string;
}

export const useAdminErrorHandler = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [errors, setErrors] = useState<TechnicalError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [currentError, setCurrentError] = useState<TechnicalError | null>(null);

  useEffect(() => {
    const checkAdminStatus = async (userId: string) => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setTimeout(() => checkAdminStatus(session.user.id), 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logError = useCallback((
    error: unknown,
    context?: string
  ) => {
    const technicalError: TechnicalError = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      message: error instanceof Error ? error.message : String(error),
      context,
      stack: error instanceof Error ? error.stack : undefined,
    };

    // Si c'est une erreur Supabase avec plus de détails
    if (error && typeof error === 'object') {
      const supaError = error as Record<string, unknown>;
      if (supaError.code) technicalError.code = String(supaError.code);
      if (supaError.details) technicalError.details = String(supaError.details);
      if (supaError.hint) technicalError.hint = String(supaError.hint);
      if (supaError.message) technicalError.message = String(supaError.message);
    }

    console.error("[Admin Error Log]", technicalError);

    setErrors(prev => [technicalError, ...prev].slice(0, 50)); // Garder les 50 dernières erreurs
    
    if (isAdmin) {
      setCurrentError(technicalError);
      setShowErrorDialog(true);
    }

    return technicalError;
  }, [isAdmin]);

  const dismissError = useCallback(() => {
    setShowErrorDialog(false);
    setCurrentError(null);
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    isAdmin,
    errors,
    currentError,
    showErrorDialog,
    logError,
    dismissError,
    clearAllErrors,
    setShowErrorDialog,
  };
};
