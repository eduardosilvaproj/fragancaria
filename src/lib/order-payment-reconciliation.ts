import { canTransition } from "@/lib/order-state";
import {
  getMissingPaymentSnapshotFields,
  type PaymentSnapshotOrder,
} from "@/lib/order-payment-snapshot";
import { validateCpf, validatePhone, validateCep } from "@/lib/customer-validation";

export type PaymentSnapshotPatch = {
  customerPhone?: string;
  customerCpf?: string;
  shippingAddress?: Record<string, unknown>;
};

export type ReconciliationOrder = PaymentSnapshotOrder & {
  status: string;
  payment_status: string | null;
  status_history: unknown;
};

export type ReconciliationResult =
  | { success: false; error: string; missingFields: string[] }
  | {
      success: true;
      patch: {
        status: "paid";
        customer_phone: string | null;
        customer_cpf: string | null;
        shipping_address: Record<string, unknown> | null;
        status_history: Array<Record<string, unknown>>;
        updated_at: string;
      };
      completedFields: string[];
    };

export function reconcileApprovedOrderSnapshot(
  order: ReconciliationOrder,
  input: PaymentSnapshotPatch,
  now: string,
): ReconciliationResult {
  if (order.status !== "pending" || order.payment_status !== "approved") {
    return {
      success: false,
      error: "Só é possível reconciliar pedido pendente com pagamento aprovado.",
      missingFields: [],
    };
  }

  const missingBeforePatch = getMissingPaymentSnapshotFields(order);
  const customerPhone = input.customerPhone ?? order.customer_phone ?? null;
  const customerCpf = input.customerCpf ?? order.customer_cpf ?? null;
  const shippingAddress = input.shippingAddress ?? order.shipping_address ?? null;
  const validationErrors: string[] = [];

  if (input.customerPhone !== undefined && !validatePhone(input.customerPhone)) {
    validationErrors.push("customer_phone");
  }
  if (input.customerCpf !== undefined && !validateCpf(input.customerCpf)) {
    validationErrors.push("customer_cpf");
  }
  if (
    input.shippingAddress !== undefined &&
    !validateCep(String(input.shippingAddress.cep ?? input.shippingAddress.zipCode ?? ""))
  ) {
    validationErrors.push("shipping_address.cep");
  }
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: `Dados inválidos: ${validationErrors.join(", ")}.`,
      missingFields: validationErrors,
    };
  }

  const snapshot = {
    ...order,
    customer_phone: customerPhone,
    customer_cpf: customerCpf,
    shipping_address: shippingAddress,
  };
  const missingFields = getMissingPaymentSnapshotFields(snapshot);

  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Ainda faltam dados: ${missingFields.join(", ")}.`,
      missingFields,
    };
  }

  if (!canTransition(order.status, "paid")) {
    return {
      success: false,
      error: `Transição inválida: ${order.status} → paid.`,
      missingFields: [],
    };
  }

  const completedFields = missingBeforePatch;
  const history = Array.isArray(order.status_history) ? [...order.status_history] : [];
  history.push({
    status: "snapshot_completed",
    detail: `completed: ${completedFields.join(", ") || "existing snapshot"}`,
    at: now,
  });

  return {
    success: true,
    completedFields,
    patch: {
      status: "paid",
      customer_phone: customerPhone,
      customer_cpf: customerCpf,
      shipping_address: shippingAddress as Record<string, unknown> | null,
      status_history: history.slice(-20),
      updated_at: now,
    },
  };
}
