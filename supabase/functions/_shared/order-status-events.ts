export type OrderEventKind =
  | "auto_n8n"
  | "auto_stripe"
  | "manual_status"
  | "manual_document"
  | "manual_cmd"
  | "refund"
  | "payment_link_sent"
  | "payment_received";

export interface OrderStatusEventDocument {
  name: string;
  path: string;
  type: string;
  url?: string;
}

export interface InsertOrderStatusEventParams {
  order_id: string;
  status: string;
  event_kind: OrderEventKind;
  is_manual: boolean;
  note?: string | null;
  document?: OrderStatusEventDocument | null;
  amount_ttc?: number | null;
  stripe_checkout_session_id?: string | null;
  stripe_refund_id?: string | null;
  created_by?: string | null;
}

type SupabaseAdmin = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
  };
};

export async function insertOrderStatusEvent(
  supabaseAdmin: SupabaseAdmin,
  params: InsertOrderStatusEventParams,
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("order_status_events")
    .insert({
      order_id: params.order_id,
      status: params.status,
      event_kind: params.event_kind,
      is_manual: params.is_manual,
      note: params.note ?? null,
      document: params.document ?? null,
      amount_ttc: params.amount_ttc ?? null,
      stripe_checkout_session_id: params.stripe_checkout_session_id ?? null,
      stripe_refund_id: params.stripe_refund_id ?? null,
      created_by: params.created_by ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[order-status-events] insert failed:", error.message);
    return null;
  }
  return data;
}

export async function checkoutSessionEventExists(
  supabaseAdmin: SupabaseAdmin,
  sessionId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("order_status_events")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return !!data?.id;
}
