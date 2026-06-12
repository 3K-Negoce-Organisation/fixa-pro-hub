/**
 * Statut affiché côté client : l'intervention manuelle admin est interne.
 * Pendant une intervention, le client conserve le dernier statut logistique (ex. livré).
 */
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
