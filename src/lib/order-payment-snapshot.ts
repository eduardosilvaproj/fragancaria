export type PaymentSnapshotOrder = {
  shipping_address?: unknown;
  customer_phone?: string | null;
  customer_cpf?: string | null;
  payment_id?: string | null;
};

const ADDRESS_FIELDS = ["street", "number", "neighborhood", "city", "state"] as const;

export function getMissingPaymentSnapshotFields(order: PaymentSnapshotOrder): string[] {
  const missing: string[] = [];
  const address =
    order.shipping_address && typeof order.shipping_address === "object"
      ? (order.shipping_address as Record<string, unknown>)
      : null;

  if (!address) {
    missing.push("shipping_address");
  } else {
    const missingAddressField = ADDRESS_FIELDS.some((field) => !String(address[field] ?? "").trim());
    const postalCode = String(address.zipCode ?? address.cep ?? "").replace(/\D/g, "");
    if (missingAddressField || postalCode.length !== 8) missing.push("shipping_address");
  }

  if (!String(order.customer_phone ?? "").replace(/\D/g, "").trim()) {
    missing.push("customer_phone");
  }

  if (String(order.customer_cpf ?? "").replace(/\D/g, "").length !== 11) {
    missing.push("customer_cpf");
  }

  if (!String(order.payment_id ?? "").trim()) {
    missing.push("payment_id");
  }

  return missing;
}
