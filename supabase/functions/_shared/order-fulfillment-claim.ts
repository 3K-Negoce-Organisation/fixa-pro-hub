/**
 * Claim pour éviter un double envoi BC fournisseur (Stripe + sync marketplace).
 * Colonne optionnelle `orders.supplier_fulfillment_started_at`.
 * @returns true si on peut envoyer, false si déjà claimé.
 */
export async function tryClaimSupplierFulfillment(
  supabaseAdmin: {
    from: (table: string) => Record<string, unknown>;
  },
  orderId: string,
): Promise<boolean> {
  try {
    const existingQuery = await (supabaseAdmin.from("orders") as {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: { supplier_fulfillment_started_at?: string | null } | null }>;
        };
      };
    })
      .select("supplier_fulfillment_started_at")
      .eq("id", orderId)
      .maybeSingle();

    if (existingQuery.data?.supplier_fulfillment_started_at) {
      return false;
    }

    const updateQuery = await (supabaseAdmin.from("orders") as {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => {
          is: (c: string, v: null) => Promise<{ error: { message: string } | null }>;
        };
      };
    })
      .update({ supplier_fulfillment_started_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("supplier_fulfillment_started_at", null);

    if (updateQuery.error) {
      console.warn("[order-fulfillment-claim]", updateQuery.error.message);
      return true;
    }

    return true;
  } catch (e) {
    console.warn("[order-fulfillment-claim]", e);
    return true;
  }
}
