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
    })
    .optional(),
});

const inputSchema = z.object({
  method: z.enum(["pix", "boleto", "credit_card"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  payer: payerSchema,
  token: z.string().optional(),
  installments: z.number().int().min(1).max(12).optional(),
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
      return {
        success: false as const,
        error: json?.message || `Erro Mercado Pago (${res.status})`,
      };
    }

    return {
      success: true as const,
      data: {
        id: String(json.id),
        status: json.status as string,
        statusDetail: json.status_detail as string | undefined,
        pixQrCode: json.point_of_interaction?.transaction_data?.qr_code as string | undefined,
        pixQrCodeBase64: json.point_of_interaction?.transaction_data?.qr_code_base64 as
          | string
          | undefined,
        boletoUrl: json.transaction_details?.external_resource_url as string | undefined,
        boletoBarcode: json.barcode?.content as string | undefined,
      },
    };
  });