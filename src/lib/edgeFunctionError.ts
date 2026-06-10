import { FunctionsHttpError } from "@supabase/supabase-js";

/** Extrait le message JSON d'une edge function Supabase (ex. 403 avec { error }). */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  fallback = "Une erreur est survenue.",
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string; message?: string };
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      /* ignore parse errors */
    }
  }

  if (error instanceof Error && error.message && !error.message.includes("non-2xx")) {
    return error.message;
  }

  return fallback;
}
