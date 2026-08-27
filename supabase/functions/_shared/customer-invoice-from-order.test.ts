import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  formatCustomerInvoiceSellerLines,
} from "./customer-invoice-seller.ts";
import {
  generateCustomerInvoicePDF,
} from "./generate-customer-invoice-pdf.ts";
import {
  resolveOrderDeliveryDateIso,
  resolveOrderPaymentDateIso,
} from "./customer-invoice-from-order.ts";

Deno.test("formatCustomerInvoiceSellerLines — capital et RCS", () => {
  const lines = formatCustomerInvoiceSellerLines();
  assertStringIncludes(lines.join("\n"), "SAS au capital de 90 €");
  assertStringIncludes(lines.join("\n"), "RCS Paris 102 662 483");
  assertStringIncludes(lines.join("\n"), "SIRET : 102 662 483 00019");
  assertStringIncludes(lines.join("\n"), "TVA intracom. : FR45102662483");
});

Deno.test("resolveOrderDeliveryDateIso — priorité delivered puis FACTURE", () => {
  const order = {
    documents: [{ type: "FACTURE", uploaded_at: "2026-03-10T10:00:00.000Z" }],
  };
  const events = [
    { status: "shipped", event_kind: "auto_n8n", created_at: "2026-03-08T10:00:00.000Z" },
    { status: "delivered", event_kind: "auto_n8n", created_at: "2026-03-12T14:00:00.000Z" },
  ];
  assertEquals(
    resolveOrderDeliveryDateIso(order, events),
    "2026-03-12T14:00:00.000Z",
  );

  assertEquals(
    resolveOrderDeliveryDateIso({ documents: order.documents }, []),
    "2026-03-10T10:00:00.000Z",
  );

  assertEquals(resolveOrderDeliveryDateIso({}, []), null);
});

Deno.test("resolveOrderPaymentDateIso — événement Stripe puis created_at", () => {
  const order = {
    status: "paid",
    created_at: "2026-03-01T09:00:00.000Z",
  };
  const events = [
    { status: "paid", event_kind: "auto_stripe", created_at: "2026-03-01T09:05:00.000Z" },
  ];
  assertEquals(
    resolveOrderPaymentDateIso(order, events),
    "2026-03-01T09:05:00.000Z",
  );

  assertEquals(
    resolveOrderPaymentDateIso(order, []),
    "2026-03-01T09:00:00.000Z",
  );

  assertEquals(
    resolveOrderPaymentDateIso({ status: "pending", created_at: "2026-03-01T09:00:00.000Z" }, []),
    null,
  );
});

Deno.test("generateCustomerInvoicePDF — mentions conformité dans le PDF", () => {
  const pdfBase64 = generateCustomerInvoicePDF({
    invoiceNumber: "FC-2026-TEST-001",
    invoiceDate: "15/03/2026",
    deliveryDate: "18/03/2026",
    paidDate: "01/03/2026",
    orderNumber: "VIS-202603-TEST",
    customerName: "Client Test",
    shippingAddress: "1 rue de Test",
    shippingCityLine: "75001 Paris",
    items: [{
      product_title: "Vis inox",
      variant_title: "M6 x 20",
      quantity: 2,
      unit_price_ht: 10,
      box_quantity: 100,
    }],
    totalHT: 24,
    totalTTC: 28.8,
  });

  const binary = atob(pdfBase64);
  assertStringIncludes(binary, "SAS au capital de 90");
  assertStringIncludes(binary, "RCS Paris 102 662 483");
  assertStringIncludes(binary, "Date de livraison");
  assertStringIncludes(binary, "18/03/2026");
  assertStringIncludes(binary, "Facture acquitt");
  assertStringIncludes(binary, "01/03/2026");
  assertStringIncludes(binary, "Paiement : r");
});
