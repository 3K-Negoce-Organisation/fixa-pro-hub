/** Statut logistique visible client (masque manual_intervention admin). */
export function getCustomerVisibleStatus(order: {
  status?: string | null;
  status_before_intervention?: string | null;
}): string {
  const status = String(order.status ?? "");
  if (status === "manual_intervention") {
    const previous = String(order.status_before_intervention ?? "").trim();
    if (previous && previous !== "manual_intervention") {
      return previous;
    }
    return "processing";
  }
  return status;
}
