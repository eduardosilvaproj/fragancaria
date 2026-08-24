import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendZernioWhatsAppTemplate } from "@/lib/zernio-whatsapp.functions";

/**
 * Automação 1: Recompra de 30 dias (Atômica via RPC claim_marketing_send)
 */
export async function runReorderReminders(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const now = new Date();
    const targetDateStart = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const targetDateEnd = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders, error: ordersError } = await (supabaseAdmin
      .from("orders") as any)
      .select("id, auth_user_id, customer_email, customer_name, customer_phone, created_at, items, whatsapp_sent_recompra")
      .in("status", ["shipped", "delivered"])
      .is("whatsapp_sent_recompra", null)
      .gte("created_at", targetDateStart)
      .lte("created_at", targetDateEnd);

    if (ordersError || !orders) {
      console.error("[MarketingAutomation] Erro ao buscar pedidos para recompra:", ordersError?.message);
      return { processed: 0, errors: 1 };
    }

    for (const order of orders as any[]) {
      if (!order.customer_phone) continue;

      const customerQuery = (supabaseAdmin.from("customers") as any).select("whatsapp_opt_in");
      const customerResult = order.auth_user_id
        ? await customerQuery.eq("auth_user_id", order.auth_user_id).maybeSingle()
        : order.customer_email
          ? await customerQuery.eq("email", order.customer_email).maybeSingle()
          : { data: null };

      const customer = customerResult?.data;
      if (customer && customer.whatsapp_opt_in === false) continue;

      // Tenta o claim atômico da recompra para este pedido
      const { data: claimed, error: claimErr } = await (supabaseAdmin.rpc as any)("claim_marketing_send", {
        p_type: "reorder",
        p_target_id: order.id,
      });

      if (claimErr || claimed === false) {
        // Pedido já foi reivindicado concorrentemente ou falhou na trava
        continue;
      }

      let productName = "seu perfume favorito";
      try {
        const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
        if (Array.isArray(items) && items.length > 0 && items[0]?.name) {
          productName = items[0].name;
        }
      } catch {}

      const phone = order.customer_phone.replace(/\D/g, "");
      const res = await sendZernioWhatsAppTemplate({
        phone,
        templateName: "recompra_sugestao",
        templateParams: [order.customer_name || "Cliente", productName],
        category: "marketing",
      });

      if (res.success) {
        processed++;
      } else {
        errors++;
        console.error(`[MarketingAutomation] Erro ao enviar recompra para ${order.id}:`, res.error);
      }
    }
  } catch (err: any) {
    console.error("[MarketingAutomation] Exceção em runReorderReminders:", err?.message || err);
    errors++;
  }

  return { processed, errors };
}

/**
 * Automação 2: Cupom de Aniversário (Atômica via RPC claim_marketing_send)
 */
export async function runBirthdayCoupons(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const monthDay = `${month}-${day}`;

    const { data: customers, error: custError } = await (supabaseAdmin
      .from("customers") as any)
      .select("id, name, phone, birth_date, last_birthday_coupon_year, whatsapp_opt_in")
      .eq("whatsapp_opt_in", true)
      .not("birth_date", "is", null);

    if (custError || !customers) {
      console.error("[MarketingAutomation] Erro ao buscar aniversariantes:", custError?.message);
      return { processed: 0, errors: 1 };
    }

    for (const cust of customers as any[]) {
      if (!cust.birth_date || !cust.phone) continue;
      const parts = cust.birth_date.split("-");
      if (parts.length !== 3) continue;
      const custMonthDay = `${parts[1]}-${parts[2]}`;

      if (custMonthDay !== monthDay) continue;

      // Tenta o claim atômico do aniversário para este cliente no ano corrente
      const { data: claimed, error: claimErr } = await (supabaseAdmin.rpc as any)("claim_marketing_send", {
        p_type: "birthday",
        p_target_id: cust.id,
        p_year: currentYear,
      });

      if (claimErr || claimed === false) {
        // Já recebeu cupom neste ano ou claim concorrente pegou
        continue;
      }

      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const couponCode = `ANIV-${currentYear}-${randomSuffix}`;
      const expiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();

      const { error: couponError } = await (supabaseAdmin.from("coupons") as any).insert({
        code: couponCode,
        discount_percent: 10,
        active: true,
        max_uses: 1,
        times_used: 0,
        expires_at: expiresAt,
      });

      if (couponError) {
        console.error(`[MarketingAutomation] Erro ao criar cupom para ${cust.id}:`, couponError.message);
        errors++;
        continue;
      }

      const phone = cust.phone.replace(/\D/g, "");
      const res = await sendZernioWhatsAppTemplate({
        phone,
        templateName: "aniversario_cupom",
        templateParams: [cust.name || "Cliente", couponCode, "15 dias"],
        category: "marketing",
      });

      if (res.success) {
        processed++;
      } else {
        errors++;
        console.error(`[MarketingAutomation] Erro ao enviar WhatsApp de aniversário para ${cust.id}:`, res.error);
      }
    }
  } catch (err: any) {
    console.error("[MarketingAutomation] Exceção em runBirthdayCoupons:", err?.message || err);
    errors++;
  }

  return { processed, errors };
}
