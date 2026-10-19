import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  deliverOrderConfirmation,
  type ConfirmationEmailPort,
  type ConfirmationSnapshot,
  type SendConfirmationResult,
} from "./order-confirmation-delivery.ts";

const ENV_KEYS = ["RESEND_FROM_EMAIL", "RESEND_FROM_EMAIL_3K", "RESEND_FROM_EMAIL_VAB"];

function withEnv(values: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) {
    previous.set(key, Deno.env.get(key));
    Deno.env.delete(key);
  }
  for (const [key, value] of Object.entries(values)) {
    if (value != null) Deno.env.set(key, value);
  }
  return fn().finally(() => {
    for (const [key, value] of previous) {
      if (value == null) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  });
}

class MemoryPort implements ConfirmationEmailPort {
  row: ConfirmationSnapshot = {
    status: null,
    resendId: null,
    error: null,
    pdfError: null,
    at: null,
    claimToken: null,
  };

  read(): Promise<ConfirmationSnapshot | null> {
    return Promise.resolve({ ...this.row });
  }

  claim(_orderId: string, token: string, nowIso: string): Promise<"claimed" | "accepted" | "busy"> {
    if (this.row.status === "accepted") return Promise.resolve("accepted");
    if (this.row.status === "sending") return Promise.resolve("busy");
    this.row = { ...this.row, status: "sending", claimToken: token, at: nowIso, error: null, resendId: null };
    return Promise.resolve("claimed");
  }

  reclaimIfStale(
    _orderId: string,
    token: string,
    nowIso: string,
    olderThanIso: string,
    previousToken: string,
  ): Promise<boolean> {
    if (this.row.status !== "sending" || this.row.claimToken !== previousToken) return Promise.resolve(false);
    if (this.row.at && this.row.at >= olderThanIso) return Promise.resolve(false);
    this.row = { ...this.row, status: "sending", claimToken: token, at: nowIso };
    return Promise.resolve(true);
  }

  save(
    _orderId: string,
    token: string,
    patch: { status: "accepted" | "failed"; resendId: string | null; error: string | null },
  ): Promise<void> {
    if (this.row.status === "sending" && this.row.claimToken !== token) return Promise.resolve();
    this.row = {
      ...this.row,
      status: patch.status,
      resendId: patch.resendId,
      error: patch.error,
      claimToken: null,
      at: new Date().toISOString(),
    };
    return Promise.resolve();
  }

  savePdfError(_orderId: string, message: string): Promise<void> {
    this.row = { ...this.row, pdfError: message };
    return Promise.resolve();
  }
}

const ORDER = { orderId: "order-1", orderNumber: "VIS-TEST" };

Deno.test("PDF en erreur → e-mail parti, erreur PDF enregistrée", async () => {
  const port = new MemoryPort();
  let calls = 0;
  const result = await deliverOrderConfirmation(port, {
    ...ORDER,
    siteSlug: "vis-a-bois",
    customerEmail: "client@example.com",
    settings: { customer_service_email: "sav@example.com" },
    send: () => {
      calls += 1;
      return Promise.resolve({ sent: true, id: "re_pdf" });
    },
  }, { pdfError: "generateOrderPDF a planté" });

  assertEquals(result.webhookOk, true);
  assertEquals(result.outcome, "accepted");
  assertEquals(calls, 1);
  assertEquals(port.row.pdfError, "generateOrderPDF a planté");
  assertEquals(port.row.status, "accepted");
  assertEquals(port.row.resendId, "re_pdf");
});

Deno.test("Resend refuse → échec enregistré, webhook ok, rejeu possible", async () => {
  const port = new MemoryPort();
  const responses: SendConfirmationResult[] = [
    { sent: false, error: "Resend 422: domaine refusé" },
    { sent: true, id: "re_retry" },
  ];
  let calls = 0;
  const send = () => {
    const next = responses[calls] ?? { sent: false, error: "inattendu" };
    calls += 1;
    return Promise.resolve(next);
  };
  const content = {
    ...ORDER,
    siteSlug: "vis-a-bois",
    customerEmail: "client@example.com",
    settings: { customer_service_email: "sav@example.com" },
    send,
  };

  const first = await deliverOrderConfirmation(port, content);
  assertEquals(first.webhookOk, true);
  assertEquals(first.outcome, "failed");
  assertEquals(port.row.status, "failed");
  assertEquals(port.row.error, "Resend 422: domaine refusé");

  const second = await deliverOrderConfirmation(port, content);
  assertEquals(second.outcome, "accepted");
  assertEquals(second.resendId, "re_retry");
  assertEquals(calls, 2);
  assertEquals(port.row.status, "accepted");
});

Deno.test("Resend accepte → pas de second envoi au rejeu", async () => {
  const port = new MemoryPort();
  let calls = 0;
  const content = {
    ...ORDER,
    siteSlug: "vis-a-bois",
    customerEmail: "client@example.com",
    settings: null,
    send: () => {
      calls += 1;
      return Promise.resolve({ sent: true, id: "re_once" });
    },
  };
  const first = await deliverOrderConfirmation(port, content);
  const second = await deliverOrderConfirmation(port, content);
  assertEquals(first.outcome, "accepted");
  assertEquals(second.outcome, "skipped");
  assertEquals(second.resendId, "re_once");
  assertEquals(calls, 1);
  assertEquals(second.webhookOk, true);
});

Deno.test("slug 3K → expéditeur 3K", async () => {
  await withEnv(
    { RESEND_FROM_EMAIL_3K: "3K-Négoce <noreply@mail.3k-negoce.com>" },
    async () => {
      const port = new MemoryPort();
      let fromEmail = "";
      let fromName = "";
      await deliverOrderConfirmation(port, {
        ...ORDER,
        siteSlug: "3k-negoce",
        customerEmail: "client@example.com",
        settings: { customer_service_email: "sav@example.com", email: "contact@example.com" },
        send: (input) => {
          fromEmail = input.fromEmail;
          fromName = input.fromName;
          return Promise.resolve({ sent: true, id: "re_3k" });
        },
      });
      assertEquals(fromName, "3K-Négoce");
      assertEquals(fromEmail, "noreply@mail.3k-negoce.com");
    },
  );
});

Deno.test("exception Resend → échec enregistré, pas d’exception vers le webhook", async () => {
  const port = new MemoryPort();
  const result = await deliverOrderConfirmation(port, {
    ...ORDER,
    siteSlug: "3k-negoce",
    customerEmail: "client@example.com",
    settings: null,
    send: () => Promise.reject(new Error("réseau coupé")),
  });
  assertEquals(result.webhookOk, true);
  assertEquals(result.outcome, "failed");
  assertEquals(port.row.status, "failed");
});
