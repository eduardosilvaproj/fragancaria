-- Congela a base de cálculo da comissão em affiliate_sales.
-- Contexto: order_total guarda orders.total (COM frete), mas a comissão
-- é round((subtotal - discount) * rate, 2). A view somava order_total e o
-- afiliado via venda != base da comissão. commission_base guarda a base real.
--
-- NULLABLE de propósito: linhas antigas não podem quebrar e o webhook só passa
-- a preencher a partir do deploy. order_total NÃO é alterado.

ALTER TABLE affiliate_sales
  ADD COLUMN IF NOT EXISTS commission_base NUMERIC(10,2);

-- Backfill: preenche a base das linhas existentes a partir do pedido.
-- Mesma semântica do webhook: GREATEST(0, subtotal - discount), COALESCE p/ NULL.
-- Linhas com order_id NULL (sem pedido vinculado) ficam com commission_base NULL.
UPDATE affiliate_sales s
SET commission_base = GREATEST(0, COALESCE(o.subtotal, 0) - COALESCE(o.discount, 0))
FROM orders o
WHERE s.order_id = o.id
  AND s.commission_base IS NULL;

-- View: total_sales_amount e current_month_sales passam a somar a base da
-- comissão (COALESCE(commission_base, order_total) — linhas legadas sem base
-- caem no order_total). Todo o resto idêntico à definição de prod.
CREATE OR REPLACE VIEW affiliate_dashboard_summary AS
 SELECT a.id,
    a.user_id,
    a.full_name,
    a.email,
    a.affiliate_code,
    a.status,
    t.name AS tier_name,
    t.icon AS tier_icon,
    t.color AS tier_color,
    COALESCE(a.custom_commission_rate, t.commission_rate, 0.08) AS current_commission_rate,
    COALESCE(( SELECT sum(affiliate_links.clicks) AS sum
           FROM affiliate_links
          WHERE affiliate_links.affiliate_id = a.id), 0::bigint) AS total_clicks,
    COALESCE(( SELECT count(*) AS count
           FROM affiliate_sales
          WHERE affiliate_sales.affiliate_id = a.id), 0::bigint) AS total_sales_count,
    COALESCE(( SELECT sum(COALESCE(affiliate_sales.commission_base, affiliate_sales.order_total)) AS sum
           FROM affiliate_sales
          WHERE affiliate_sales.affiliate_id = a.id), 0::numeric) AS total_sales_amount,
    COALESCE(( SELECT sum(affiliate_sales.commission_amount) AS sum
           FROM affiliate_sales
          WHERE affiliate_sales.affiliate_id = a.id), 0::numeric) AS total_commission_earned,
    COALESCE(( SELECT sum(affiliate_sales.commission_amount) AS sum
           FROM affiliate_sales
          WHERE affiliate_sales.affiliate_id = a.id AND affiliate_sales.status::text = 'paid'::text), 0::numeric) AS total_commission_paid,
    COALESCE(( SELECT sum(affiliate_sales.commission_amount) AS sum
           FROM affiliate_sales
          WHERE affiliate_sales.affiliate_id = a.id AND (affiliate_sales.status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying]::text[]))), 0::numeric) AS pending_commission,
    COALESCE(( SELECT sum(COALESCE(affiliate_sales.commission_base, affiliate_sales.order_total)) AS sum
           FROM affiliate_sales
          WHERE affiliate_sales.affiliate_id = a.id AND date_trunc('month'::text, affiliate_sales.created_at) = date_trunc('month'::text, now())), 0::numeric) AS current_month_sales,
    COALESCE(( SELECT count(*) AS count
           FROM affiliate_links
          WHERE affiliate_links.affiliate_id = a.id AND affiliate_links.is_active = true), 0::bigint) AS active_links_count,
    COALESCE(( SELECT count(*) AS count
           FROM affiliate_sales
          WHERE affiliate_sales.affiliate_id = a.id AND affiliate_sales.status::text = 'pending'::text), 0::bigint) AS pending_sales_count
   FROM affiliates a
     LEFT JOIN affiliate_tiers t ON a.current_tier_id = t.id;
