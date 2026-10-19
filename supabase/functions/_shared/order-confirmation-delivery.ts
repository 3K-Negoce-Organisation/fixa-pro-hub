import { resolveResendFrom } from "./resolve-resend-from.ts";

/** Au-delà, un envoi resté « en cours » peut être repris (plantage après l’appel). */
export const CONFIRMATION_SENDING_STALE_MS = 2 * 60 * 1000;

export type ConfirmationStatus = "sending" | "accepted" | "failed";

export type ConfirmationSnapshot = {
  status: ConfirmationStatus | null;
  resendId: string | null;
  error: string | null;
  pdfError: string | null;
  at: string | null;
  /** Jeton posé pendant status=sending. */
  claimToken: string | null;
};

export type ConfirmationClaim = "claimed" | "accepted" | "busy";

export type SendConfirmationInput = {
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  idempotencyKey?: string;
};

export type SendConfirmationResult = {
  sent: boolean;
  id?: string | null;
  error?: string | null;
};

export interface ConfirmationEmailPort {
  read(orderId: string): Promise<ConfirmationSnapshot | null>;
  claim(orderId: string, token: string, nowIso: string): Promise<ConfirmationClaim>;
  reclaimIfStale(
    orderId: string,
    token: string,
    nowIso: string,
    olderThanIso: string,
    previousToken: string,
  ): Promise<boolean>;
  save(
    orderId: string,
    token: string,
    patch: { status: "accepted" | "failed"; resendId: string | null; error: string | null },
  ): Promise<void>;
  savePdfError(orderId: string, message: string): Promise<void>;
}

export type ConfirmationEmailContent = {
  orderId: string;
  orderNumber: string;
  siteSlug: string | null;
  customerEmail: string | null;
  settings?: {
    name?: string | null;
    customer_service_email?: string | null;
    email?: string | null;
  } | null;
  send: (input: SendConfirmationInput) => Promise<SendConfirmationResult>;
};

export type ConfirmationDeliveryResult = {
  outcome: "accepted" | "failed" | "skipped";
  /** Le webhook Stripe doit rester en 200. */
  webhookOk: true;
  resendId: string | null;
  error: string | null;
};

export function redactEmails(value: string): string {
  return value.replace(/[^\s<>]+@[^\s<>]+/g, "[email]").slice(0, 500);
}

function logFailure(orderNumber: string, orderId: string, error: string): void {
  console.error("[order-confirmation] Resend a refusé ou l’envoi a échoué", {
    orderNumber,
    orderId,
    error: redactEmails(error),
  });
}

/**
 * Envoie la confirmation client et enregistre le résultat sur la commande.
 * Ne propage pas l’erreur : le paiement reste accepté.
 * Un second passage ne renvoie pas si Resend a déjà accepté.
 */
export async function deliverOrderConfirmation(
  port: ConfirmationEmailPort,
  content: ConfirmationEmailContent,
  opts?: { now?: () => Date; pdfError?: string | null },
): Promise<ConfirmationDeliveryResult> {
  const now = opts?.now ?? (() => new Date());
  const nowIso = now().toISOString();
  const orderId = content.orderId;
  const orderNumber = content.orderNumber;

  if (opts?.pdfError) {
    try {
      await port.savePdfError(orderId, redactEmails(opts.pdfError));
    } catch (error) {
      console.error("[order-confirmation] impossible d’enregistrer l’erreur PDF", {
        orderNumber,
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const current = await port.read(orderId);
    if (current?.status === "accepted") {
      console.log("[order-confirmation] déjà accepté, pas de second envoi", {
        orderNumber,
        orderId,
        resendId: current.resendId,
      });
      return { outcome: "skipped", webhookOk: true, resendId: current.resendId, error: null };
    }

    const token = crypto.randomUUID();
    let claim = await port.claim(orderId, token, nowIso);
    let idempotencyKey: string | undefined;

    if (claim === "busy") {
      const previousToken = current?.claimToken || "";
      const olderThan = new Date(now().getTime() - CONFIRMATION_SENDING_STALE_MS).toISOString();
      const reclaimed = previousToken
        ? await port.reclaimIfStale(orderId, token, nowIso, olderThan, previousToken)
        : false;
      if (!reclaimed) {
        console.error("[order-confirmation] envoi déjà en cours, pas de second appel", {
          orderNumber,
          orderId,
        });
        return { outcome: "skipped", webhookOk: true, resendId: null, error: null };
      }
      claim = "claimed";
      idempotencyKey = `order-confirmation-${orderId}`;
    }

    if (claim === "accepted") {
      const again = await port.read(orderId);
      return {
        outcome: "skipped",
        webhookOk: true,
        resendId: again?.resendId ?? null,
        error: null,
      };
    }

    const customerEmail = (content.customerEmail || "").trim();
    if (!customerEmail) {
      const error = "aucun email client";
      logFailure(orderNumber, orderId, error);
      await port.save(orderId, token, { status: "failed", resendId: null, error });
      return { outcome: "failed", webhookOk: true, resendId: null, error };
    }

    const from = resolveResendFrom(content.settings ?? undefined, { siteSlug: content.siteSlug });
    let result: SendConfirmationResult;
    try {
      result = await content.send({
        fromEmail: from.fromEmail,
        fromName: from.fromName,
        replyTo: from.replyTo,
        idempotencyKey,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logFailure(orderNumber, orderId, message);
      await port.save(orderId, token, { status: "failed", resendId: null, error: redactEmails(message) });
      return { outcome: "failed", webhookOk: true, resendId: null, error: message };
    }

    if (result.sent) {
      const resendId = (result.id || "").trim() || null;
      await port.save(orderId, token, { status: "accepted", resendId, error: null });
      console.log("[order-confirmation] Resend a accepté", { orderNumber, orderId, resendId });
      return { outcome: "accepted", webhookOk: true, resendId, error: null };
    }

    const error = redactEmails(result.error || "Resend a refusé l’envoi");
    logFailure(orderNumber, orderId, error);
    await port.save(orderId, token, { status: "failed", resendId: null, error });
    return { outcome: "failed", webhookOk: true, resendId: null, error };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[order-confirmation] échec d’enregistrement, webhook conservé", {
      orderNumber,
      orderId,
      error: redactEmails(message),
    });
    return { outcome: "failed", webhookOk: true, resendId: null, error: message };
  }
}

type QueryError = { message?: string; code?: string } | null;
type QueryResult = { data: Record<string, unknown> | Record<string, unknown>[] | null; error: QueryError };

// Le client Supabase est chaîné ; on ne type que ce que le verrou utilise.
// deno-lint-ignore no-explicit-any
type LooseAdmin = { from: (table: string) => any };

function isMissingColumn(error: QueryError): boolean {
  const message = error?.message || "";
  return error?.code === "42703" || message.includes("confirmation_email_");
}

function snapshotFromRow(row: Record<string, unknown> | null): ConfirmationSnapshot | null {
  if (!row) return null;
  const status = (row.confirmation_email_status as ConfirmationStatus | null) ?? null;
  const id = (row.confirmation_email_id as string | null) ?? null;
  return {
    status,
    resendId: status === "accepted" ? id : null,
    error: (row.confirmation_email_error as string | null) ?? null,
    pdfError: (row.confirmation_email_pdf_error as string | null) ?? null,
    at: (row.confirmation_email_at as string | null) ?? null,
    claimToken: status === "sending" ? id : null,
  };
}

export function createSupabaseConfirmationPort(admin: LooseAdmin): ConfirmationEmailPort {
  const table = () => admin.from("orders");

  return {
    async read(orderId) {
      const { data, error } = await table()
        .select("confirmation_email_status, confirmation_email_id, confirmation_email_error, confirmation_email_pdf_error, confirmation_email_at")
        .eq("id", orderId)
        .maybeSingle() as QueryResult;
      if (error) {
        if (isMissingColumn(error)) {
          console.error("[order-confirmation] colonnes absentes, lecture ignorée", { orderId });
          return null;
        }
        throw new Error(error.message || "lecture confirmation impossible");
      }
      return snapshotFromRow((data as Record<string, unknown> | null) ?? null);
    },

    async claim(orderId, token, nowIso) {
      const { data, error } = await table()
        .update({
          confirmation_email_status: "sending",
          confirmation_email_id: token,
          confirmation_email_error: null,
          confirmation_email_at: nowIso,
        })
        .eq("id", orderId)
        .or("confirmation_email_status.is.null,confirmation_email_status.eq.failed")
        .select("id") as QueryResult;
      if (error) {
        if (isMissingColumn(error)) {
          console.error("[order-confirmation] colonnes absentes, envoi sans verrou durable", { orderId });
          return "claimed";
        }
        console.error("[order-confirmation] verrou impossible", { orderId, error: error.message });
        return "busy";
      }
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      if (rows.length > 0) return "claimed";
      const current = await this.read(orderId);
      if (current?.status === "accepted") return "accepted";
      return "busy";
    },

    async reclaimIfStale(orderId, token, nowIso, olderThanIso, previousToken) {
      const { data, error } = await table()
        .update({
          confirmation_email_status: "sending",
          confirmation_email_id: token,
          confirmation_email_error: null,
          confirmation_email_at: nowIso,
        })
        .eq("id", orderId)
        .eq("confirmation_email_status", "sending")
        .eq("confirmation_email_id", previousToken)
        .lt("confirmation_email_at", olderThanIso)
        .select("id") as QueryResult;
      if (error) {
        console.error("[order-confirmation] reprise du verrou impossible", { orderId, error: error.message });
        return false;
      }
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      return rows.length > 0;
    },

    async save(orderId, token, patch) {
      const { error } = await table()
        .update({
          confirmation_email_status: patch.status,
          confirmation_email_id: patch.status === "accepted" ? patch.resendId : null,
          confirmation_email_error: patch.status === "failed" ? patch.error : null,
          confirmation_email_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("confirmation_email_status", "sending")
        .eq("confirmation_email_id", token) as QueryResult;
      if (error) {
        console.error("[order-confirmation] résultat non enregistré", {
          orderId,
          status: patch.status,
          error: error.message,
        });
      }
    },

    async savePdfError(orderId, message) {
      const { error } = await table()
        .update({ confirmation_email_pdf_error: message.slice(0, 500) })
        .eq("id", orderId) as QueryResult;
      if (error) {
        console.error("[order-confirmation] erreur PDF non enregistrée", { orderId, error: error.message });
      }
    },
  };
}
