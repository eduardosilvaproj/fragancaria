import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/start-server-core/request-response";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import {
  calculateDiscount,
  calculateShipping,
  calculateOrderTotal,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/commerce-config";
import { getPublicShippingConfig } from "@/lib/shipping-settings.functions";
import { cotar, type MelhorEnvioProduto, type MelhorEnvioOpcao } from "@/lib/melhor-envio-client.server";
const MP_API = "https://api.mercadopago.com/v1/payments";

// A3: token alphabet (31 glyphs: A-Z minus I/L/O plus 2-9) matches the
// regex enforced by getOrderByTrackingToken. randomBytes(32) gives ~256 bits
// of entropy from /dev/urandom; modulo-31 with rejection sampling means we
// draw uniform over the 31 glyphs. 16 chars * log2(31) = ~77.5 bits output.
const TRACKING_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateTrackingToken(): string {
  const buf = randomBytes(32);
  const len = TRACKING_ALPHABET.length;
  let out = "";
  for (let i = 0; out.length < 16 && i < buf.length; i++) {
    const b = buf[i]!;
    if (b < 256 - (256 % len)) out += TRACKING_ALPHABET[b % len];
  }
  return out.length === 16 ? out : generateTrackingToken();
}
function formatToken(t: string): string {
  return `${t.slice(0, 4)}-${t.slice(4, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}`;
}
const cpfSchema = z.string().min(11).max(14).transform((v) => v.replace(/\D/g, "")).refine((d) => d.length === 11, "CPF deve ter 11 digitos");
const payerSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
  identification: z.object({ type: z.literal("CPF"), number: cpfSchema }),
  address: z.object({ zipCode: z.string().min(8).max(9), streetName: z.string().min(1), streetNumber: z.string().min(1), neighborhood: z.string().min(1), city: z.string().min(1), state: z.string().length(2), complement: z.string().optional() }),
});
const cartItemSchema = z.object({ id: z.string(), title: z.string(), quantity: z.number().int().positive(), price: z.number().positive(), image: z.string().optional(), variationName: z.string().optional() });
const inputSchema = z.object({
  method: z.enum(["pix", "boleto", "credit_card"]),
  amount: z.number().positive().max(1_000_000),
  description: z.string().min(1).max(256),
  payer: payerSchema,
  token: z.string().optional(),
  installments: z.number().int().min(1).max(12).optional(),
  paymentMethodId: z.string().optional(),
  issuerId: z.string().optional(),
  items: z.array(cartItemSchema).min(1).optional(),
  subtotal: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  couponCode: z.string().max(64).optional(),
  shippingPrice: z.number().nonnegative().optional(),
  shippingMethod: z.string().optional(),
  userId: z.string().uuid().optional(),
  externalReference: z.string().uuid().optional(),
});
function translateMpError(msg: string, method: string): string {
  const lower = (msg || "").toLowerCase();
  if (lower.includes('collector user without key enabled for qr render')) return 'PIX nao habilitado. Use cartao.';
  if (lower.includes('invalid card_token') || lower.includes('invalid token')) return 'Dados do cartao invalidos.';
  if (lower.includes('invalid installments')) return 'Parcelas invalidas.';
  if (lower.includes('invalid access token')) return 'Token MP invalido.';
  return msg;
}
function mpWebhookUrl(req: Request | undefined, fallback: string): string {
  try {
    const host = req?.headers?.get('host') || req?.headers?.get('x-forwarded-host');
    const proto = req?.headers?.get('x-forwarded-proto') || 'https';
    if (!host) return fallback;
    return `${proto}://${host}/api/public/mp-webhook`;
  } catch { return fallback; }
}
function itemsForMp(items: Array<{ id: string; title: string; quantity: number; price: number }> | undefined) {
  if (!items || items.length === 0) return undefined;
  return items.map((i) => ({ id: i.id, title: i.title, quantity: i.quantity, unit_price: Number(i.price.toFixed(2)) }));
}
type CreatePaymentInput = z.infer<typeof inputSchema>;

async function syncCheckoutCustomer(
  admin: any,
  payer: CreatePaymentInput["payer"],
  authUserId: string | undefined,
) {
  const { data, error } = await admin
    .from("customers")
    .select("id, auth_user_id, email, name, phone, cpf, created_at")
    .ilike("email", payer.email.replace(/[\\%_]/g, "\\$&"))
    .order("created_at", { ascending: true });
  if (error) throw error;

  const customers = (data ?? []) as Array<{
    id: string;
    auth_user_id: string | null;
    email: string | null;
    name: string | null;
    phone: string | null;
    cpf: string | null;
    created_at: string;
  }>;
  const matchingAccount = authUserId
    ? customers.find((row) => row.auth_user_id === authUserId)
    : undefined;
  const guestCustomer = customers.find((row) => row.auth_user_id === null);
  const accountCustomer = customers.find((row) => row.auth_user_id !== null);
  const customer = matchingAccount ?? guestCustomer;
  const name = `${payer.firstName} ${payer.lastName}`.trim();

  // Nunca altera nem cria um perfil concorrente para outra conta autenticada.
  if (!customer && accountCustomer) return;

  if (!customer) {
    const { error: insertError } = await admin.from("customers").insert({
      email: payer.email,
      name,
      phone: payer.phone || null,
      cpf: payer.identification.number,
      auth_user_id: authUserId ?? null,
    });
    if (insertError) throw insertError;
    return;
  }

  const update: Record<string, string> = {};
  if (authUserId && !customer.auth_user_id) update.auth_user_id = authUserId;
  if (!customer.email) update.email = payer.email;
  if (!customer.name && name) update.name = name;
  if (!customer.phone && payer.phone) update.phone = payer.phone;
  if (!customer.cpf && payer.identification.number) update.cpf = payer.identification.number;
  if (Object.keys(update).length === 0) return;

  const { error: updateError } = await admin
    .from("customers")
    .update(update)
    .eq("id", customer.id);
  if (updateError) throw updateError;
}

export const createPayment = createServerFn({ method: 'POST' })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const request = getRequest();
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return { success: false, error: 'MP_ACCESS_TOKEN nao configurado' };
    const { supabaseAdmin: admin } = await import(
      '@/integrations/supabase/client.server'
    );
    let orderId: string | undefined;
    try {
      // P0-Segurança: recalcula o valor autoritativo NO SERVIDOR. O browser
      // não decide quanto cobra — preço de cada item vem do Supabase, frete da
      // tabela fixa, e o desconto é limitado por um teto para bloquear o ataque
      // "pagar R$0,01". Se o total recalculado divergir do enviado, rejeita e
      // pede refresh (carrinho velho ou tentativa de manipulação).
      if (!data.items || data.items.length === 0) {
        return { success: false, error: 'Carrinho vazio.' };
      }
      const productIds = [...new Set(data.items.map((i) => i.id.split('::')[0]))];
      const { data: prodRows, error: prodErr } = await admin
        .from('products')
        .select('id, price, is_active')
        .in('id', productIds);
      if (prodErr) return { success: false, error: 'Falha ao validar preços dos produtos.' };
      const priceById = new Map(
        (prodRows ?? []).map((p: any) => [p.id, { price: Number(p.price), active: p.is_active }]),
      );
      let serverSubtotal = 0;
      for (const item of data.items) {
        const pid = item.id.split('::')[0];
        const p = priceById.get(pid);
        if (!p || !p.active) {
          return { success: false, error: 'Um produto do carrinho não está mais disponível. Atualize a página.' };
        }
        serverSubtotal += p.price * item.quantity;
      }
      // Frete/desconto/total autoritativos vêm das mesmas funções puras que o
      // carrinho e o checkout usam (src/lib/commerce-config.ts) — uma única
      // fonte de verdade, não uma tabela duplicada aqui. O limiar de frete
      // grátis, porém, é lido do banco (shipping_settings), que é a fonte
      // de verdade correta aqui; cai no hardcoded só se a leitura falhar.
      // O client ainda usa FREE_SHIPPING_THRESHOLD hardcoded (ver nota em
      // CLAUDE.md) — mudar o valor no banco sem mudar o código deixa
      // client e server temporariamente divergentes.
      const shippingConfig = await getPublicShippingConfig();
      const freeShippingThreshold = shippingConfig.success
        ? shippingConfig.data.freeShippingThreshold
        : FREE_SHIPPING_THRESHOLD;
      const serverShipping = calculateShipping(serverSubtotal, data.shippingMethod, freeShippingThreshold);
      if (serverShipping === null) {
        return {
          success: false,
          error: "Método de frete inválido. Volte à etapa de entrega e escolha uma opção.",
        };
      }
      const effectiveDiscount = calculateDiscount(serverSubtotal, {
        couponCode: data.couponCode,
        paymentMethod: data.method,
      });
      const serverAmount = calculateOrderTotal({
        subtotal: serverSubtotal,
        shipping: serverShipping,
        discount: effectiveDiscount,
      });
      // Autoridade é o server: o valor cobrado no MP é sempre serverAmount,
      // nunca o que o client mandou. Toda divergência é logada; só bloqueia
      // com erro legível quando o server cobraria MAIS do que o client
      // mostrou ao cliente (nunca trava por divergência a favor do cliente).
      if (Math.abs(serverAmount - data.amount) > 0.01) {
        console.warn('[createPayment] divergência de valor', {
          serverAmount,
          clientAmount: data.amount,
          orderContext: { subtotal: serverSubtotal, shipping: serverShipping, discount: effectiveDiscount },
        });
        if (serverAmount > data.amount) {
          return {
            success: false,
            error: 'O valor do seu carrinho foi atualizado. Revise o resumo do pedido antes de continuar.',
          };
        }
      }

      // 1) cria pedido "pending" antes de chamar MP. external_reference = order.id.
      //    se o cliente reenviar, o id do pedido continua igual (idempotente).
      orderId = data.externalReference;
      if (!orderId) {
        const { data: inserted, error: orderErr } = await admin
          .from('orders')
          .insert({
            status: 'pending',
            payment_status: 'pending',
            payment_method: data.method,
            total: serverAmount,
            subtotal: serverSubtotal,
            discount: effectiveDiscount,
            shipping_price: serverShipping,
            shipping_method: data.shippingMethod ?? null,
            items: data.items ?? [],
            auth_user_id: data.userId ?? null,
            customer_email: data.payer.email,
            customer_name: `${data.payer.firstName} ${data.payer.lastName}`.trim(),
            customer_phone: data.payer.phone ?? null,
            customer_cpf: data.payer.identification.number,
            shipping_address: {
              street: data.payer.address.streetName,
              number: data.payer.address.streetNumber,
              complement: data.payer.address.complement ?? '',
              neighborhood: data.payer.address.neighborhood,
              city: data.payer.address.city,
              state: data.payer.address.state,
              cep: data.payer.address.zipCode,
              zipCode: data.payer.address.zipCode,
            },
            tracking_token: generateTrackingToken(),
          })
          .select('id')
          .single();
        if (orderErr || !inserted) {
          return { success: false, error: orderErr?.message || 'Falha ao criar pedido' };
        }
        orderId = inserted.id;
      }
      // 2) monta body do pagamento conforme spec /v1/payments (sdk mercadopago v2.x).
      //    - payer.address: snake_case (zip_code, street_name, street_number, federal_unit)
      //    - 'state' (BR) -> 'federal_unit'; 'complement' NAO EXISTE no AddressRequest -> omitir.
      //    - items vao em additional_info.items (nao na raiz).
      const itemsForAdditionalInfo = data.items ? itemsForMp(data.items) : undefined;
      const payerAddress = data.payer.address
        ? {
            zip_code: data.payer.address.zipCode,
            street_name: data.payer.address.streetName,
            street_number: data.payer.address.streetNumber,
            neighborhood: data.payer.address.neighborhood,
            city: data.payer.address.city,
            federal_unit: data.payer.address.state,
          }
        : undefined;
      const body: any = {
        transaction_amount: serverAmount,
        description: data.description,
        payment_method_id: data.method === 'pix' ? 'pix' : data.method === 'boleto' ? 'bolbradesco' : (data.paymentMethodId || ''),
        external_reference: orderId,
        notification_url: mpWebhookUrl(request, `${process.env.PUBLIC_URL || 'https://www.fragranciaria.com'}/api/public/mp-webhook`),
        payer: {
          email: data.payer.email,
          first_name: data.payer.firstName,
          last_name: data.payer.lastName,
          identification: data.payer.identification,
          ...(payerAddress && { address: payerAddress }),
        },
      };
      if (itemsForAdditionalInfo && itemsForAdditionalInfo.length > 0) {
        body.additional_info = { items: itemsForAdditionalInfo };
      }
      if (data.method === 'credit_card') {
        body.token = data.token;
        body.installments = data.installments || 1;
        if (data.issuerId) body.issuer_id = data.issuerId;
      }
      const resp = await fetch(MP_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': orderId },
        body: JSON.stringify(body),
      });
      const json: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const mpMsg = json?.message || json?.error || `HTTP ${resp.status}`;
        // apaga o pedido "pending" para nao ficar orfao.
        await admin.from('orders').delete().eq('id', orderId).is('payment_id', null);
        return { success: false, error: translateMpError(mpMsg, data.method) };
      }
      // 3) vincula payment_id ao pedido e guarda a primeira versao do status.
      const paymentId = json?.id;
      // guarda contra MP retornar 200 sem id (resposta degenerada): trata como falha e apaga orfao.
      if (!paymentId) {
        await admin.from('orders').delete().eq('id', orderId).is('payment_id', null);
        return { success: false, error: 'Resposta MP sem payment_id (rejeitada sem detalhe).' };
      }
      const status = json?.status || 'pending';
      const statusDetail = json?.status_detail || null;
      if (paymentId) {
        await admin.from('orders').update({
          payment_id: String(paymentId),
          payment_status: status,
          // @ts-expect-error payment_method_id added in prior migration; generated types stale. See agente-fase1.md.
          payment_method_id: json?.payment_method_id || null,
          // @ts-expect-error transaction_amount added in prior migration; generated types stale. See agente-fase1.md.
          transaction_amount: json?.transaction_amount ?? null,
          payer_email: data.payer.email,
          raw: json,
        }).eq('id', orderId);
      }

      // Cria/atualiza o cliente interno em `customers`. Toda compra passa a ter
      // um cadastro real (mesmo guest), e quando o checkout é autenticado o
      // perfil recebe o auth_user_id. Não pode quebrar a cobrança: se falhar,
      // apenas registra o erro no log do servidor.
      try {
        await syncCheckoutCustomer(admin, data.payer, data.userId);
      } catch (customerErr) {
        console.error('[createPayment] Falha ao sincronizar cliente interno', {
          orderId,
          customerErr,
        });
      }

      // Dispara e-mail de confirmação com token de rastreio (se Resend estiver configurado).
      // Não quebra o fluxo se o envio falhar — o token continua no frontend.
      if (orderId && data.payer?.email) {
        try {
          const { sendOrderConfirmationEmail } = await import("@/lib/email.functions");
          const orderRes = await admin
            .from("orders")
            .select("tracking_token, total, items")
            .eq("id", orderId)
            .maybeSingle();
          const order = orderRes.data as unknown as {
            tracking_token?: string | null;
            total?: number | null;
            items?: unknown;
          } | null;
          if (order?.tracking_token) {
            await sendOrderConfirmationEmail({
              orderId,
              customerName: `${data.payer.firstName} ${data.payer.lastName}`.trim(),
              customerEmail: data.payer.email,
              total: Number(order.total ?? serverAmount),
              trackingTokenFormatted: formatToken(order.tracking_token),
              items: Array.isArray(order.items) ? (order.items as any[]) : data.items ?? [],
            }).catch((err) => {
              console.warn("[email] Falha ao enviar (não quebra checkout)", { err });
            });
          }
        } catch (emailErr) {
          console.warn("[email] Erro ao preparar envio", { emailErr });
        }
      }

      const result: any = { id: paymentId, orderId, status };
// devolve o token (raw + formatado) para a UI do checkout exibir o banner.
      const { data: freshOrder } = await admin.from('orders').select('tracking_token').eq('id', orderId).maybeSingle();
      const trackingToken = (freshOrder as unknown as { tracking_token?: string | null } | null)?.tracking_token;
      if (trackingToken) {
        result.trackingToken = trackingToken;
        result.trackingTokenFormatted = formatToken(trackingToken);
      }
      if (data.method === 'pix') {
        const tx = json?.point_of_interaction?.transaction_data || {};
        result.pixQrCode = tx.qr_code_base64 || null;
        result.pixCode = tx.qr_code || null;
        result.pixTicketUrl = tx.ticket_url || null;
        result.expiresAt = tx.expiration_date || json?.date_of_expiration || null;
      }
      if (data.method === 'boleto') {
        result.boletoUrl = json?.transaction_details?.external_resource_url || json?.point_of_interaction?.transaction_data?.ticket_url || null;
        result.boletoBarcode = json?.barcode?.content || null;
        result.expiresAt = json?.date_of_expiration || null;
      }
      result.installments = json?.installments || null;
      result.statusDetail = statusDetail;
      return { success: true, data: result };
    } catch (e: any) {
      // se o INSERT passou antes do erro (ex.: fetch do MP estourou), apaga o orfao.
      if (orderId) {
        try { await admin.from('orders').delete().eq('id', orderId).is('payment_id', null); }
        catch { /* ignore secondary error */ }
      }
      return { success: false, error: e?.message || 'erro' };
    }
  });

// =============================================================================
// COTACAO DE FRETE (checkout): cota via Melhor Envio a partir de ids+quantity,
// nunca de peso/dimensao/preco vindos do client.
// =============================================================================

const cotarFreteInputSchema = z.object({
  cepDestino: z.string(),
  items: z.array(z.object({ id: z.string(), quantity: z.number().int().positive() })).min(1),
});

export type CotarFreteOpcao = MelhorEnvioOpcao & { precoExibidoCentavos: number };

export type CotarFreteResult =
  | { ok: true; cotacaoId: string; opcoes: CotarFreteOpcao[] }
  | { ok: false; erro: "cep_invalido" | "sem_cobertura" | "api_indisponivel" };

function aplicarFreteGratis(opcoes: MelhorEnvioOpcao[]): CotarFreteOpcao[] {
  const maisBarato = Math.min(...opcoes.map((o) => o.precoCentavos));
  return opcoes.map((o) => ({
    ...o,
    precoExibidoCentavos: o.precoCentavos === maisBarato ? 0 : o.precoCentavos - maisBarato,
  }));
}

export const cotarFrete = createServerFn({ method: "POST" })
  .validator((d: unknown) => cotarFreteInputSchema.parse(d))
  .handler(async ({ data }): Promise<CotarFreteResult> => {
    const cepDestino = data.cepDestino.replace(/\D/g, "");
    if (cepDestino.length !== 8) {
      return { ok: false, erro: "cep_invalido" };
    }

    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    const productIds = [...new Set(data.items.map((i) => i.id.split("::")[0]))];
    const { data: prodRows, error: prodErr } = await admin
      .from("products")
      .select("id, price, weight_grams, height_cm, width_cm, length_cm, is_active")
      .in("id", productIds);
    if (prodErr) return { ok: false, erro: "api_indisponivel" };

    const productById = new Map((prodRows ?? []).map((p: any) => [p.id, p]));

    const produtos: MelhorEnvioProduto[] = [];
    for (const item of data.items) {
      const pid = item.id.split("::")[0];
      const p = productById.get(pid);
      if (!p || !p.is_active) {
        return { ok: false, erro: "sem_cobertura" };
      }
      produtos.push({
        id: pid,
        weight: Number(p.weight_grams ?? 0) / 1000,
        width: Number(p.width_cm ?? 0),
        height: Number(p.height_cm ?? 0),
        length: Number(p.length_cm ?? 0),
        insurance_value: Number(p.price),
        quantity: item.quantity,
      });
    }

    const cotacao = await cotar(cepDestino, produtos);
    if (!cotacao.ok) return cotacao;

    const shippingConfig = await getPublicShippingConfig();
    const threshold = shippingConfig.success ? shippingConfig.data.freeShippingThreshold : FREE_SHIPPING_THRESHOLD;
    const freeShippingEnabled = shippingConfig.success ? shippingConfig.data.freeShippingEnabled : false;

    const subtotal = produtos.reduce((sum, p, i) => sum + p.insurance_value * data.items[i]!.quantity, 0);
    const aplicaFreteGratis = freeShippingEnabled && subtotal >= threshold;

    const opcoes: CotarFreteOpcao[] = aplicaFreteGratis
      ? aplicarFreteGratis(cotacao.opcoes)
      : cotacao.opcoes.map((o) => ({ ...o, precoExibidoCentavos: o.precoCentavos }));

    const fromCep = (process.env.MELHOR_ENVIO_FROM_CEP ?? "").replace(/\D/g, "");
    const itemsOrdenados = [...data.items].sort((a, b) => a.id.localeCompare(b.id));
    const cacheKey = createHash("sha256")
      .update(JSON.stringify({ fromCep, cepDestino, items: itemsOrdenados }))
      .digest("hex");

    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    // shipping_rate_quotes ainda nao existe em database.types.ts: migration
    // 20260722_shipping_rate_quotes.sql commitada mas nao aplicada em prod.
    // Cast temporario; remover quando os tipos forem regenerados pos-aplicacao.
    const { data: inserted, error: insertErr } = await (admin as any)
      .from("shipping_rate_quotes")
      .insert({
        cache_key: cacheKey,
        from_cep: fromCep,
        to_cep: cepDestino,
        items: data.items,
        options: opcoes,
        source: "melhor_envio",
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      return { ok: false, erro: "api_indisponivel" };
    }

    return { ok: true, cotacaoId: inserted.id, opcoes };
  });

// =============================================================================
// ADMIN: listagem de transacoes + configuracoes de pagamento
// =============================================================================

export type PaymentTransaction = {
  id: string;
  order_id: string;
  gateway: string;
  gateway_transaction_id: string | null;
  gateway_status: string | null;
  amount: number;
  currency: string;
  transaction_type: string;
  payment_method: string | null;
  installments: number;
  card_brand: string | null;
  card_last_four: string | null;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  boleto_url: string | null;
  boleto_barcode: string | null;
  status: "pending" | "processing" | "approved" | "rejected" | "refunded";
  gateway_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  order_number?: number;
  customer_name?: string;
  customer_email?: string;
};

export type PaymentSettings = {
  id: number;
  mp_public_key: string | null;
  mp_access_token: string | null;
  mp_sandbox: boolean;
  min_installments: number;
  max_installments: number;
  free_installments: number;
  enabled_methods: string[];
  updated_at: string;
};

export const listPaymentTransactions = createServerFn({ method: "GET" })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .validator((d: unknown) => (d ?? {}) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-expect-error TanStack Start ServerFn type mismatch
  .handler(async ({ data }: any) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const limit = data.limit ?? 50;
      const offset = data.offset ?? 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = db.from("payment_transactions").select(`
        *,
        order:orders(
          order_number,
          customer_name,
          customer_email
        )
      `).order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (data.status) query = query.eq("status", data.status);
      if (data.orderId) query = query.eq("order_id", data.orderId);

      const { data: rows, error } = await query;

      if (error) return { success: false as const, error: error.message };

      const transactions: PaymentTransaction[] = (rows || []).map((r: any) => ({
        ...r,
        order_number: r.order?.order_number,
        customer_name: r.order?.customer_name,
        customer_email: r.order?.customer_email,
      }));

      return { success: true as const, data: transactions };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

export const getPaymentStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await db.from("payment_transactions").select("status, amount, payment_method");

      if (error) return { success: false as const, error: error.message };

      const byStatus: Record<string, number> = {};
      let totalTx = 0;
      let pixCount = 0;
      for (const t of data || []) {
        const s = String((t as any).status);
        byStatus[s] = (byStatus[s] || 0) + Number((t as any).amount);
        totalTx++;
        if ((t as any).payment_method === "pix") pixCount++;
      }

      const approved = byStatus.approved || 0;

      return {
        success: true as const,
        data: {
          totalApproved: approved,
          totalPending: byStatus.pending || 0,
          totalRejected: byStatus.rejected || 0,
          approvalRate: totalTx > 0 ? Math.round((approved / totalTx) * 100) : 0,
          pixRate: totalTx > 0 ? Math.round((pixCount / totalTx) * 100) : 0,
        }
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

export const getPaymentSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await db.from("payment_settings").select("*").eq("id", 1).single();

      if (error) return { success: false as const, error: error.message };
      return { success: true as const, data: data as unknown as PaymentSettings };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

export const savePaymentSettings = createServerFn({ method: "POST" })
  .validator((d: unknown) => (d as {
    mpPublicKey?: string;
    mpAccessToken?: string;
    mpSandbox?: boolean;
    minInstallments?: number;
    maxInstallments?: number;
    freeInstallments?: number;
    enabledMethods?: string[];
  }))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.mpPublicKey !== undefined) patch.mp_public_key = data.mpPublicKey || null;
      if (data.mpAccessToken !== undefined) patch.mp_access_token = data.mpAccessToken || null;
      if (data.mpSandbox !== undefined) patch.mp_sandbox = data.mpSandbox;
      if (data.minInstallments !== undefined) patch.min_installments = data.minInstallments;
      if (data.maxInstallments !== undefined) patch.max_installments = data.maxInstallments;
      if (data.freeInstallments !== undefined) patch.free_installments = data.freeInstallments;
      if (data.enabledMethods !== undefined) patch.enabled_methods = data.enabledMethods;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error } = await db.from("payment_settings").update(patch).eq("id", 1).select().single();

      if (error) return { success: false as const, error: error.message };
      return { success: true as const, data: updated as unknown as PaymentSettings };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });
