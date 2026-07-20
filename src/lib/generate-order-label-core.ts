// Núcleo compartilhado de geração de etiqueta a partir do pedido.
// NÃO importa @tanstack/react-start nem client.server — assim roda tanto no
// server function (produção) quanto num script Node de smoke, com o MESMO
// caminho de idempotência + compra + gravação. A ÚNICA coisa que o wrapper
// generateOrderLabel adiciona é o requireAdmin(); todo o resto vive aqui.
import {
  comprarEtiqueta,
  type MelhorEnvioCartProduct,
  type MelhorEnvioCompraInput,
  type MelhorEnvioCompraResult,
  type MelhorEnvioContato,
  type MelhorEnvioVolume,
} from "./melhor-envio-client.server";
import { validateCep, validateCpf } from "./customer-validation";

export type ExistingShipmentGuard = {
  shipment_id_external?: string | null;
  label_url?: string | null;
  tracking_code?: string | null;
};

export type GenerateOrderLabelOrder = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_cpf: string | null;
  shipping_address: Record<string, string> | null;
  items: Array<Record<string, unknown>> | null;
  total: number | null;
  tracking_code: string | null;
  shipping_service_id: number | null;
  shipping_service_name: string | null;
  shipping_quoted_cents: number | null;
  shipping_charged_cents: number | null;
};

export type SenderInfo = {
  name?: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
};

export type ProductRow = {
  id: string;
  name: string | null;
  price: number | null;
  weight_grams: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  is_active: boolean | null;
};

export function hasExistingPurchasedLabel(
  orderTrackingCode: string | null | undefined,
  existingShipment: ExistingShipmentGuard | null | undefined,
): boolean {
  return Boolean(
    orderTrackingCode ||
      existingShipment?.shipment_id_external ||
      existingShipment?.label_url ||
      existingShipment?.tracking_code,
  );
}

export function buildMelhorEnvioVolumeFromProducts(
  products: ProductRow[],
  items: Array<{ id: string; quantity: number }>,
): MelhorEnvioVolume {
  let totalWeightKg = 0;
  let maxWidth = 0;
  let maxLength = 0;
  let totalHeight = 0;

  const productById = new Map(products.map((product) => [product.id, product]));
  for (const item of items) {
    const product = productById.get(item.id);
    if (!product) continue;
    totalWeightKg += (Number(product.weight_grams ?? 0) / 1000) * item.quantity;
    maxWidth = Math.max(maxWidth, Number(product.width_cm ?? 0));
    maxLength = Math.max(maxLength, Number(product.length_cm ?? 0));
    totalHeight += Number(product.height_cm ?? 0) * item.quantity;
  }

  return {
    weight: totalWeightKg,
    width: maxWidth,
    length: maxLength,
    height: totalHeight,
  };
}

export function normalizeOrderItems(items: Array<Record<string, unknown>> | null | undefined) {
  return (items ?? []).map((item) => ({
    id: String(item.id ?? "").split("::")[0]!,
    name: String(item.title ?? item.name ?? "Produto"),
    quantity: Number(item.quantity ?? 0),
    unitary_value: Number(item.price ?? 0),
  }));
}

function isValidVolume(volume: MelhorEnvioVolume): boolean {
  return volume.weight > 0 && volume.width > 0 && volume.height > 0 && volume.length > 0;
}

function buildContatoFromSender(sender: SenderInfo): MelhorEnvioContato | null {
  const address = sender.address;
  const senderDigits = String(sender.document ?? "").replace(/\D/g, "");
  // Melhor Envio separa PF de PJ: CPF (11 díg.) vai em `document`, CNPJ (14
  // díg.) em `company_document` — mandar CNPJ em `document` retorna 422.
  const isCnpj = senderDigits.length === 14;
  if (
    !sender.name ||
    (senderDigits.length !== 11 && senderDigits.length !== 14) ||
    !sender.phone ||
    !sender.email ||
    !address?.street ||
    !address.number ||
    !address.neighborhood ||
    !address.city ||
    !address.state ||
    !address.postal_code
  ) {
    return null;
  }

  return {
    name: sender.name,
    phone: sender.phone,
    email: sender.email,
    document: isCnpj ? undefined : senderDigits,
    company_document: isCnpj ? senderDigits : undefined,
    address: address.street,
    number: address.number,
    complement: address.complement || undefined,
    district: address.neighborhood,
    city: address.city,
    state_abbr: address.state,
    postal_code: address.postal_code,
  };
}

function buildContatoFromOrder(order: GenerateOrderLabelOrder): MelhorEnvioContato | null {
  const addr = order.shipping_address;
  const document = String(order.customer_cpf ?? "").replace(/\D/g, "");
  const postalCode = String(addr?.zipCode || addr?.cep || "").replace(/\D/g, "");
  if (
    !order.customer_name ||
    !order.customer_phone ||
    !order.customer_email ||
    !validateCpf(document) ||
    !addr?.street ||
    !addr.number ||
    !addr.neighborhood ||
    !addr.city ||
    !addr.state ||
    !validateCep(postalCode)
  ) {
    return null;
  }

  return {
    name: order.customer_name,
    phone: order.customer_phone,
    email: order.customer_email,
    document,
    address: addr.street,
    number: addr.number,
    complement: addr.complement || undefined,
    district: addr.neighborhood,
    city: addr.city,
    state_abbr: addr.state,
    postal_code: postalCode,
  };
}

function resolveShipmentDisplay(
  shippingServiceName: string | null,
  shippingServiceId: number,
): { carrier: string; service: string } {
  const raw = String(shippingServiceName ?? "").trim();
  if (raw.includes("•")) {
    const [carrier, service] = raw.split("•").map((part) => part.trim());
    if (carrier && service) {
      return { carrier, service };
    }
  }

  if (raw) {
    return { carrier: "Melhor Envio", service: raw };
  }

  return { carrier: "Melhor Envio", service: `Serviço ${shippingServiceId}` };
}

type PreparedGenerateOrderLabel =
  | {
      ok: true;
      shipmentDisplay: { carrier: string; service: string };
      recipientPostalCode: string;
      recipientAddress: Record<string, string>;
      products: MelhorEnvioCartProduct[];
      volume: MelhorEnvioVolume;
      quotedPrice: number;
      chargedPrice: number;
      melhorEnvioInput: MelhorEnvioCompraInput;
    }
  | { ok: false; error: string };

export function prepareGenerateOrderLabelPurchase(params: {
  order: GenerateOrderLabelOrder;
  existingShipments: ExistingShipmentGuard[];
  senderInfo: SenderInfo;
  products: ProductRow[];
}): PreparedGenerateOrderLabel {
  const { order, existingShipments, senderInfo, products } = params;

  if (
    hasExistingPurchasedLabel(
      order.tracking_code,
      existingShipments.find((shipment) =>
        Boolean(shipment.shipment_id_external || shipment.label_url || shipment.tracking_code),
      ),
    )
  ) {
    return { ok: false, error: "Este pedido já possui etiqueta de frete comprada." };
  }

  if (order.shipping_service_id == null) {
    return {
      ok: false,
      error: "Pedido sem serviço de frete vinculado — não é possível gerar etiqueta automática.",
    };
  }

  const sender = buildContatoFromSender(senderInfo);
  if (!sender) {
    return {
      ok: false,
      error: "Remetente não configurado em shipping_settings.sender_info para gerar etiqueta automática.",
    };
  }

  const recipient = buildContatoFromOrder(order);
  if (!recipient) {
    const cpf = String(order.customer_cpf ?? "").replace(/\D/g, "");
    if (!validateCpf(cpf)) {
      return { ok: false, error: "Pedido sem CPF válido — não é possível gerar etiqueta automática." };
    }

    return { ok: false, error: "Pedido sem endereço/dados válidos de entrega para gerar etiqueta automática." };
  }

  const normalizedItems = normalizeOrderItems(order.items).filter(
    (item) => item.id && item.quantity > 0 && item.unitary_value >= 0,
  );
  if (normalizedItems.length === 0) {
    return { ok: false, error: "Pedido sem itens válidos para gerar etiqueta automática." };
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  for (const item of normalizedItems) {
    const product = productById.get(item.id);
    if (!product || !product.is_active) {
      return { ok: false, error: `Produto ${item.id} não encontrado para gerar etiqueta.` };
    }
    if (
      Number(product.weight_grams ?? 0) <= 0 ||
      Number(product.height_cm ?? 0) <= 0 ||
      Number(product.width_cm ?? 0) <= 0 ||
      Number(product.length_cm ?? 0) <= 0
    ) {
      return {
        ok: false,
        error: `Produto ${item.id} sem peso/dimensões válidos para gerar etiqueta automática.`,
      };
    }
  }

  const volume = buildMelhorEnvioVolumeFromProducts(
    products,
    normalizedItems.map((item) => ({ id: item.id, quantity: item.quantity })),
  );
  if (!isValidVolume(volume)) {
    return { ok: false, error: "Volume calculado inválido para gerar etiqueta automática." };
  }

  const cartProducts = normalizedItems.map((item) => {
    const product = productById.get(item.id)!;
    return {
      id: product.id,
      name: product.name || item.name,
      quantity: item.quantity,
      unitary_value: Number(product.price ?? item.unitary_value),
    };
  });

  const shipmentDisplay = resolveShipmentDisplay(order.shipping_service_name, order.shipping_service_id);
  const recipientPostalCode = recipient.postal_code;
  const recipientAddress = (order.shipping_address ?? {}) as Record<string, string>;
  const quotedPrice = Number(order.shipping_quoted_cents ?? order.shipping_charged_cents ?? 0) / 100;
  const chargedPrice = Number(order.shipping_charged_cents ?? order.shipping_quoted_cents ?? 0) / 100;

  return {
    ok: true,
    shipmentDisplay,
    recipientPostalCode,
    recipientAddress,
    products: cartProducts,
    volume,
    quotedPrice,
    chargedPrice,
    melhorEnvioInput: {
      serviceId: order.shipping_service_id,
      from: sender,
      to: recipient,
      products: cartProducts,
      volumes: [volume],
    },
  };
}

export type ComprarEtiquetaFn = (
  input: MelhorEnvioCompraInput,
) => Promise<MelhorEnvioCompraResult>;

export type GenerateOrderLabelResult =
  | {
      success: true;
      data: {
        id: string;
        tracking_code: string | null;
        label_url: string;
        shipment_id_external: string;
        status: "paid";
        service: string;
        carrier: string;
      };
    }
  | { success: false; error: string };

const ORDER_COLUMNS =
  "id, customer_name, customer_email, customer_phone, customer_cpf, shipping_address, items, total, tracking_code, shipping_service_id, shipping_service_name, shipping_quoted_cents, shipping_charged_cents";

// Fluxo completo: leituras → idempotência+validação (prepare) → compra sandbox
// → gravação. A idempotência (prepare) roda ANTES de comprarEtiqueta(), que é o
// primeiro passo a debitar saldo. `db` é o supabase service-role client, passado
// de fora (produção usa supabaseAdmin; smoke usa seu próprio client).
export async function runGenerateOrderLabelCore(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  orderId: string,
  comprar: ComprarEtiquetaFn = comprarEtiqueta,
): Promise<GenerateOrderLabelResult> {
  const { data: orderRow, error: orderError } = await db
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    return { success: false, error: "Pedido não encontrado" };
  }

  const { data: existingShipments, error: shipmentGuardError } = await db
    .from("shipping_quotes")
    .select("id, shipment_id_external, label_url, tracking_code")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (shipmentGuardError) {
    return { success: false, error: shipmentGuardError.message };
  }

  const { data: senderRow, error: senderError } = await db
    .from("shipping_settings")
    .select("value")
    .eq("key", "sender_info")
    .maybeSingle();
  if (senderError) {
    return { success: false, error: senderError.message };
  }

  const normalizedItems = normalizeOrderItems(
    orderRow.items as Array<Record<string, unknown>> | null,
  ).filter((item) => item.id && item.quantity > 0);
  if (normalizedItems.length === 0) {
    return { success: false, error: "Pedido sem itens válidos para gerar etiqueta automática." };
  }

  const productIds = [...new Set(normalizedItems.map((item) => item.id))];
  const { data: productRows, error: productError } = await db
    .from("products")
    .select("id, name, price, weight_grams, height_cm, width_cm, length_cm, is_active")
    .in("id", productIds);
  if (productError) {
    return { success: false, error: productError.message };
  }

  const prepared = prepareGenerateOrderLabelPurchase({
    order: orderRow as GenerateOrderLabelOrder,
    existingShipments: (existingShipments ?? []) as ExistingShipmentGuard[],
    senderInfo: (senderRow?.value ?? {}) as SenderInfo,
    products: (productRows ?? []) as ProductRow[],
  });
  if (!prepared.ok) {
    return { success: false, error: prepared.error };
  }

  const compraResult = await comprar(prepared.melhorEnvioInput);
  if (!compraResult.ok) {
    return { success: false, error: compraResult.erro };
  }

  const { data: shipment, error: insertError } = await db
    .from("shipping_quotes")
    .insert({
      order_id: orderRow.id,
      carrier: prepared.shipmentDisplay.carrier,
      service: prepared.shipmentDisplay.service,
      service_code: String(orderRow.shipping_service_id),
      price: prepared.quotedPrice,
      final_price: prepared.chargedPrice,
      estimated_days: null,
      weight_grams: Math.round(prepared.volume.weight * 1000),
      height_cm: prepared.volume.height,
      width_cm: prepared.volume.width,
      length_cm: prepared.volume.length,
      recipient_name: orderRow.customer_name || "Cliente",
      recipient_email: orderRow.customer_email || "",
      recipient_phone: orderRow.customer_phone || null,
      recipient_postal_code: prepared.recipientPostalCode,
      recipient_address: prepared.recipientAddress,
      status: "paid",
      tracking_code: compraResult.trackingCode,
      label_url: compraResult.labelUrl,
      shipment_id_external: compraResult.shipmentIdExternal,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: "Erro ao salvar etiqueta: " + insertError.message };
  }

  const orderPatch: Record<string, string | null> = {
    shipping_carrier: prepared.shipmentDisplay.carrier,
    shipping_method:
      orderRow.shipping_service_name ||
      `${prepared.shipmentDisplay.carrier} • ${prepared.shipmentDisplay.service}`,
  };
  if (compraResult.trackingCode) {
    orderPatch.tracking_code = compraResult.trackingCode;
  }

  const { error: updateOrderError } = await db.from("orders").update(orderPatch).eq("id", orderRow.id);
  if (updateOrderError) {
    return { success: false, error: updateOrderError.message };
  }

  return {
    success: true,
    data: {
      id: shipment.id,
      tracking_code: compraResult.trackingCode,
      label_url: compraResult.labelUrl,
      shipment_id_external: compraResult.shipmentIdExternal,
      status: "paid",
      service: prepared.shipmentDisplay.service,
      carrier: prepared.shipmentDisplay.carrier,
    },
  };
}
