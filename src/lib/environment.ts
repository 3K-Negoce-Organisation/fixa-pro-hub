/**
 * Environment configuration based on VITE_SITE_ENVIRONMENT_NAME
 * Values: "PRODUCTION" | "STAGING" | "DEVELOP"
 * Default (if absent/empty): "DEVELOP"
 */

export type Environment = "PRODUCTION" | "STAGING" | "DEVELOP";

const rawEnv = import.meta.env.VITE_SITE_ENVIRONMENT_NAME?.trim() || "";

export const ENVIRONMENT: Environment = 
  rawEnv === "PRODUCTION" ? "PRODUCTION" :
  rawEnv === "STAGING" ? "STAGING" : 
  "DEVELOP";

export const isDevelopment = ENVIRONMENT === "DEVELOP";
export const isStaging = ENVIRONMENT === "STAGING";
export const isProduction = ENVIRONMENT === "PRODUCTION";

// Helper to get environment display name
export const getEnvironmentLabel = (): string => {
  switch (ENVIRONMENT) {
    case "PRODUCTION": return "Production";
    case "STAGING": return "Staging";
    case "DEVELOP": return "Développement";
  }
};

// Helper to get environment color for UI indicators
export const getEnvironmentColor = (): string => {
  switch (ENVIRONMENT) {
    case "PRODUCTION": return "text-green-600";
    case "STAGING": return "text-amber-600";
    case "DEVELOP": return "text-blue-600";
  }
};

// Debug info (only in non-production)
if (!isProduction) {
  console.log(`[Environment] Mode: ${ENVIRONMENT}`);
  console.log(`[Environment] Supabase URL: ${import.meta.env.VITE_SUPABASE_URL}`);
}
