/** Statut logistique visible client (masque intervention manuelle admin). */
export function getCustomerVisibleStatus(order: {
  status?: string | null;
  status_before_intervention?: string | null;
}): string {
  const status = String(order.status ?? "");
  const previous = String(order.status_before_intervention ?? "").trim();

  if (status === "manual_intervention") {
    if (previous && previous !== "manual_intervention") {
      return previous;
    }
    return "processing";
  }

  if (
    (status === "paid" || status === "awaiting_payment")
    && previous
    && previous !== "manual_intervention"
  ) {
    return previous;
  }

  return status;
}
