-- =====================================================
-- orders.coupon_code + increment_coupon_usage()
-- =====================================================
-- ESCOPO (C14 — ligar cupom do admin ao checkout)
-- 1. Adiciona `coupon_code` em orders. Sem ela, o pedido guarda o VALOR do
--    desconto (orders.discount) mas nao QUAL cupom o gerou — e o webhook, na
--    aprovacao, nao teria como saber qual coupons.usage_count incrementar.
-- 2. Cria increment_coupon_usage(p_code): incremento ATOMICO de usage_count.
--    O webhook chama via rpc. Atomico porque dois pedidos diferentes com o
--    mesmo cupom podem aprovar em paralelo; um read-modify-write no app
--    perderia contagem (lost update). SQL puro com UPDATE ... SET x = x + 1
--    resolve no proprio banco.
--
-- POR QUE SEPARADO DO SEED (20260801d)
-- Duas migrations porque sao dois tipos de mudanca: schema (esta) e dado
-- (seed do BEMVINDO10). Aplicar em qualquer ordem funciona; nenhuma depende
-- da outra.
--
-- SEGURANCA
-- A coluna nao muda RLS de orders (herda o que ja existe). A funcao e
-- SECURITY DEFINER para poder escrever em coupons (que e fechada a
-- anon/authenticated), mas so incrementa o contador de UM code — nao le nem
-- expoe nada. Idempotencia do incremento e responsabilidade do CHAMADOR: o
-- webhook so chama na transicao para aprovado (guarda acabouDeSerAprovado),
-- entao reentrega nao conta de novo.
-- =====================================================

-- 1. Coluna coupon_code em orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

COMMENT ON COLUMN public.orders.coupon_code IS
  'Codigo do cupom aplicado, ja validado pelo servidor em createPayment. '
  'Usado pelo webhook para incrementar coupons.usage_count na aprovacao. '
  'NULL quando nao houve cupom ou ele foi recusado na validacao.';

-- 2. Incremento atomico de usage_count
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupons
     SET usage_count = usage_count + 1,
         updated_at  = now()
   WHERE code = upper(trim(p_code));
$$;

-- A funcao roda como owner (SECURITY DEFINER). Nao conceder EXECUTE a anon:
-- so o service role (webhook) chama. REVOKE explicito para nao herdar o
-- EXECUTE que o PUBLIC recebe por padrao em funcoes novas.
REVOKE ALL ON FUNCTION public.increment_coupon_usage(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_coupon_usage(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.increment_coupon_usage(TEXT) FROM authenticated;

-- =====================================================
-- VERIFICACAO (rode junto)
-- =====================================================
-- Esperado: coluna existe, funcao existe, e anon/authenticated NAO tem EXECUTE.
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'orders'
       AND column_name = 'coupon_code') AS tem_coluna,          -- esperado 1
  (SELECT count(*) FROM pg_proc
     WHERE proname = 'increment_coupon_usage') AS tem_funcao,   -- esperado 1
  has_function_privilege('anon',
    'public.increment_coupon_usage(text)', 'EXECUTE') AS anon_pode,          -- esperado false
  has_function_privilege('authenticated',
    'public.increment_coupon_usage(text)', 'EXECUTE') AS authenticated_pode; -- esperado false
