import React, { createContext, useContext, ReactNode } from "react";
import { useAdminErrorHandler, TechnicalError } from "@/hooks/useAdminErrorHandler";
import { AdminErrorDialog } from "@/components/admin/AdminErrorDialog";

interface AdminErrorContextType {
  isAdmin: boolean;
  logError: (error: unknown, context?: string) => TechnicalError;
  errors: TechnicalError[];
  clearAllErrors: () => void;
}

const AdminErrorContext = createContext<AdminErrorContextType | undefined>(undefined);

export const useAdminError = () => {
  const context = useContext(AdminErrorContext);
  if (!context) {
    throw new Error("useAdminError must be used within AdminErrorProvider");
  }
  return context;
};

interface AdminErrorProviderProps {
  children: ReactNode;
}

export const AdminErrorProvider = ({ children }: AdminErrorProviderProps) => {
  const {
    isAdmin,
    errors,
    currentError,
    showErrorDialog,
    logError,
    dismissError,
    clearAllErrors,
  } = useAdminErrorHandler();

  return (
    <AdminErrorContext.Provider
      value={{
        isAdmin,
        logError,
        errors,
        clearAllErrors,
      }}
    >
      {children}
      <AdminErrorDialog
        open={showErrorDialog}
        onOpenChange={(open) => !open && dismissError()}
        error={currentError}
        allErrors={errors}
        onClearAll={clearAllErrors}
      />
    </AdminErrorContext.Provider>
  );
};
