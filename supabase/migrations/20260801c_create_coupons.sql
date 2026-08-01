-- =====================================================
-- CRIA public.coupons (recurso vivo, tabela nunca aplicada em prod)
-- =====================================================
-- CONTEXTO
-- O admin de cupons (src/routes/admin/cupons.tsx + src/lib/coupons.functions.ts)
-- foi construido esperando a tabela `public.coupons`, que NUNCA foi criada em
-- producao. Sonda com service role (2026-08-01, projeto gzxlupgdmrtkprwhiutp):
--   SELECT coupons -> "Could not find the table 'public.coupons' in the schema cache"
-- Por isso criar/listar cupom no admin quebra com esse erro.
--
-- A tabela EXISTE nos arquivos historicos 002_ecommerce_schema.sql /
-- 002_ecommerce_tables.sql (marcados "-- HISTORICO" no CLAUDE.md, escritos
-- contra um schema antigo e nao aplicados). Esta migration NAO aplica o 002
-- inteiro — recria SO `coupons`, com as colunas que o codigo de fato usa
-- (coupons.functions.ts: createCoupon/updateCoupon/listCoupons), no padrao de
-- seguranca atual do projeto.
--
-- ATENCAO — desconexao conhecida, NAO resolvida por esta migration
-- O checkout NAO le esta tabela. `applyCoupon` em CheckoutSummary.tsx e
-- carrinho.tsx chama getCoupon() de commerce-config.ts, que consulta um mapa
-- HARDCODED (COUPONS = { BEMVINDO10 }). O modelo tambem diverge: o checkout
-- usa `discountPercent` (so percentual), a tabela usa discount_type +
-- discount_value (percentage | fixed_amount | free_shipping).
-- Logo, DEPOIS desta migration: o admin cria/edita/lista cupom sem erro, mas
-- um cupom novo criado no admin ainda NAO vale no checkout. Ligar os dois e
-- trabalho separado (registrado como C14 no backlog). Esta migration so
-- destrava a tela do admin, que e o que esta bloqueando agora.
--
-- SEGURANCA (padrao das tabelas de config, ver 20260730b_lockdown_nfe_settings)
--   RLS ligado, ZERO policies, GRANT revogado de anon e authenticated.
--   Todo acesso e por coupons.functions.ts com supabaseAdmin (service role,
--   bypassa RLS) atras de requireAdmin(). Nenhum componente do browser le a
--   tabela direto (o checkout usa o mapa hardcoded, nao ela).
--
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS + DROP POLICY em loop + REVOKE.
--   Rodar 2x nao altera o resultado.
-- =====================================================

-- pgcrypto para gen_random_uuid() (evita depender da extensao uuid-ossp do 002)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. Tabela
-- =====================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,

  -- percentage | fixed_amount | free_shipping (validado por zod no server)
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,

  minimum_order_value DECIMAL(10,2),
  maximum_discount DECIMAL(10,2),

  usage_limit INTEGER,                       -- NULL = ilimitado
  usage_count INTEGER NOT NULL DEFAULT 0,
  usage_limit_per_customer INTEGER NOT NULL DEFAULT 1,

  applies_to_products UUID[],                -- NULL = todos
  applies_to_categories UUID[],
  applies_to_brands UUID[],
  excluded_products UUID[],
  customer_ids UUID[],                       -- NULL = todos

  first_purchase_only BOOLEAN NOT NULL DEFAULT false,

  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- listCoupons ordena por created_at desc e filtra por is_active;
-- createCoupon depende do UNIQUE(code) para o erro 23505 ("Código já existe").
CREATE INDEX IF NOT EXISTS idx_coupons_active
  ON public.coupons(is_active, expires_at);

-- =====================================================
-- 2. Remove qualquer policy pre-existente (idempotencia; padrao 20260730b)
-- =====================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coupons'
  LOOP
    RAISE NOTICE 'Removendo policy "%" de public.coupons', r.policyname;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.coupons', r.policyname);
  END LOOP;
END $$;

-- =====================================================
-- 3. RLS ligado, sem policy = nega tudo (service role bypassa)
-- =====================================================
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- Sem FORCE, mesmo motivo do 20260730b: FORCE tiraria a isencao do owner
-- (o SQL Editor roda como owner) e um UPDATE manual afetaria 0 linhas sem erro.

-- =====================================================
-- 4. Revoga GRANT de tabela dos dois papeis do browser
-- =====================================================
REVOKE ALL ON public.coupons FROM anon, authenticated;

-- =====================================================
-- 5. VERIFICACAO (rode junto e confira a saida)
-- =====================================================
-- Esperado:
--   rls_habilitado = true, rls_forcado = false, policies = 0,
--   privilegios_anon = 0, privilegios_authenticated = 0
SELECT
  c.relname                                             AS tabela,
  c.relrowsecurity                                      AS rls_habilitado,
  c.relforcerowsecurity                                 AS rls_forcado,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies,
  (SELECT count(*) FROM information_schema.role_table_grants g
     WHERE g.table_schema = 'public' AND g.table_name = c.relname
       AND g.grantee = 'anon')                          AS privilegios_anon,
  (SELECT count(*) FROM information_schema.role_table_grants g
     WHERE g.table_schema = 'public' AND g.table_name = c.relname
       AND g.grantee = 'authenticated')                 AS privilegios_authenticated
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'coupons';

-- Deve retornar 1 linha (a tabela vazia, pronta para o admin usar):
SELECT count(*) AS total_cupons FROM public.coupons;
