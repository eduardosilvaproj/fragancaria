import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MP_API = "https://api.mercadopago.com/v1/payments";

const payerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  identification: z.object({ type: z.string(), number: z.string().min(1) }),
  address: z
    .object({
      zipCode: z.string(),
      streetName: z.string(),
      streetNumber: z.string(),
      neighborhood: z.string(),
      city: z.string(),
      state: z.string(),
      complement: z.string().optional(),
    })
    .optional(),
});

const cartItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  image: z.string().optional(),
});

const inputSchema = z.object({
  method: z.enum(["pix", "boleto", "credit_card"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  payer: payerSchema,
  token: z.string().optional(),
  installments: z.number().int().min(1).max(12).optional(),
  // Dados extras para salvar no pedido
  items: z.array(cartItemSchema).optional(),
  subtotal: z.number().optional(),
  discount: z.number().optional(),
  shippingPrice: z.number().optional(),
  shippingMethod: z.string().optional(),
});

export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
      return { success: false as const, error: "MP_ACCESS_TOKEN não configurado" };
    }

    const basePayer = {
      email: data.payer.email,
      first_name: data.payer.firstName,
      last_name: data.payer.lastName,
      identification: data.payer.identification,
    };

    let body: Record<string, unknown>;

    if (data.method === "pix") {
      body = {
        transaction_amount: data.amount,
        description: data.description,
        payment_method_id: "pix",
        payer: basePayer,
      };
    } else if (data.method === "boleto") {
      body = {
        transaction_amount: data.amount,
        description: data.description,
        payment_method_id: "bolbradesco",
        payer: {
          ...basePayer,
          address: data.payer.address
            ? {
                zip_code: data.payer.address.zipCode,
                street_name: data.payer.address.streetName,
                street_number: data.payer.address.streetNumber,
                neighborhood: data.payer.address.neighborhood,
                city: data.payer.address.city,
                federal_unit: data.payer.address.state,
              }
            : undefined,
        },
      };
    } else {
      if (!data.token) {
        return { success: false as const, error: "Token do cartão ausente" };
      }
      body = {
        transaction_amount: data.amount,
        description: data.description,
        token: data.token,
        installments: data.installments ?? 1,
        payer: {
          email: data.payer.email,
          identification: data.payer.identification,
        },
      };
    }

    const idempotencyKey =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const res = await fetch(MP_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const json: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("MP error", res.status, json);

      // Tratar erros específicos com mensagens amigáveis
      let errorMessage = json?.message || `Erro Mercado Pago (${res.status})`;

      // Erro de PIX não habilitado na conta
      if (errorMessage.includes("Collector user without key enabled for QR render")) {
        errorMessage = "PIX não está habilitado nesta conta do Mercado Pago. Por favor, habilite o PIX na sua conta ou use outro método de pagamento (cartão ou boleto).";
      }

      // Erro de boleto não habilitado
      if (errorMessage.includes("payment_method_id") && data.method === "boleto") {
        errorMessage = "Boleto não está habilitado nesta conta do Mercado Pago. Por favor, use outro método de pagamento.";
      }

      return {
        success: false as const,
        error: errorMessage,
      };
    }

    // Salvar pedido no Supabase
    let orderId: string | undefined;
    let dbError: string | undefined;

    console.log("=== SALVANDO PEDIDO NO SUPABASE ===");
    console.log("Payment ID do MP:", json.id);
    console.log("Status do MP:", json.status);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      console.log("Supabase Admin client carregado com sucesso");

      const orderData = {
        payment_id: String(json.id),
        status: json.status as string,
        payment_status: json.status as string,
        amount: json.transaction_amount,
        total: data.amount,
        subtotal: data.subtotal ?? data.amount,
        discount: data.discount ?? 0,
        shipping_price: data.shippingPrice ?? 0,
        shipping_method: data.shippingMethod ?? null,
        payment_method: data.method,
        customer_name: `${data.payer.firstName} ${data.payer.lastName}`,
        customer_email: data.payer.email,
        payer_email: data.payer.email,
        items: data.items ?? [],
        shipping_address: data.payer.address ? {
          street: data.payer.address.streetName,
          number: data.payer.address.streetNumber,
          complement: data.payer.address.complement || "",
          neighborhood: data.payer.address.neighborhood,
          city: data.payer.address.city,
          state: data.payer.address.state,
          zipCode: data.payer.address.zipCode,
        } : null,
        raw: json,
        metadata: {},
        status_history: [{ status: json.status, date: new Date().toISOString() }],
      };

      console.log("Dados do pedido a inserir:", JSON.stringify(orderData, null, 2));

      const { data: insertedOrder, error: insertError } = await supabaseAdmin
        .from("orders")
        .insert(orderData)
        .select("id")
        .single();

      if (insertError) {
        console.error("=== ERRO AO SALVAR PEDIDO ===");
        console.error("Código:", insertError.code);
        console.error("Mensagem:", insertError.message);
        console.error("Detalhes:", insertError.details);
        console.error("Hint:", insertError.hint);
        dbError = insertError.message;
      } else {
        orderId = insertedOrder?.id;
        console.log("=== PEDIDO SALVO COM SUCESSO ===");
        console.log("Order ID:", orderId);
      }
    } catch (err: any) {
      console.error("=== ERRO AO CONECTAR SUPABASE ===");
      console.error("Erro:", err?.message || err);
      dbError = err?.message || "Erro desconhecido ao conectar Supabase";
    }

    return {
      success: true as const,
      data: {
        id: String(json.id),
        orderId,
        status: json.status as string,
        statusDetail: json.status_detail as string | undefined,
        pixQrCode: json.point_of_interaction?.transaction_data?.qr_code as string | undefined,
        pixQrCodeBase64: json.point_of_interaction?.transaction_data?.qr_code_base64 as
          | string
          | undefined,
        boletoUrl: json.transaction_details?.external_resource_url as string | undefined,
        boletoBarcode: json.barcode?.content as string | undefined,
        dbError, // Incluir erro do banco se houver (para debug)
      },
    };
  });
