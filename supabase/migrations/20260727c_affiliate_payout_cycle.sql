-- =============================================
-- CICLO DE REPASSE DO PROGRAMA DE AFILIADOS — SCHEMA
-- 2026-07-27
--
-- APLICADA EM PRODUCAO em 2026-07-27 pelo Edu, via SQL Editor.
-- Commitada depois da aplicacao (regra do CLAUDE.md: migration
-- aplicada manualmente tambem vive no repo, senao quebra auditoria).
--
-- Idempotente. Seguro para rodar mais de uma vez.
--
-- Contexto: as duas migrations historicas (001_affiliate_system.sql e
-- supabase-affiliate-tables.sql) discordam sobre a forma de
-- affiliate_sales e affiliate_payouts, e o types.ts gerado esta
-- defasado. Por isso esta migration NAO assume nome de constraint
-- nem existencia de FK: ela descobre em pg_constraint.
-- =============================================

-- ---------------------------------------------
-- 1. affiliate_settings: prazo de liberacao
--
-- Dias corridos APOS a aprovacao do pagamento (confirmed_at) para a
-- comissao ficar disponivel para repasse. NAO confundir com
-- payout_day, que e dia do mes e permanece inerte.
-- ---------------------------------------------
ALTER TABLE public.affiliate_settings
  ADD COLUMN IF NOT EXISTS release_delay_days INTEGER NOT NULL DEFAULT 15;

COMMENT ON COLUMN public.affiliate_settings.release_delay_days IS
  'Dias corridos apos affiliate_sales.confirmed_at para a comissao ficar disponivel para repasse. Default 15.';

COMMENT ON COLUMN public.affiliate_settings.min_payout_amount IS
  'Valor minimo acumulado em comissoes disponiveis para gerar um repasse.';

-- ---------------------------------------------
-- 2. min_payout_amount: 100.00 -> 50.00
--
-- R$100 a 8% exige R$1.250 em vendas antes do primeiro repasse.
-- Editavel no admin; sobe depois se precisar.
-- ---------------------------------------------
DO $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE public.affiliate_settings
     SET min_payout_amount = 50.00,
         updated_at = NOW();
  GET DIAGNOSTICS n = ROW_COUNT;

  IF n = 0 THEN
    RAISE WARNING 'affiliate_settings esta VAZIA: nenhum registro atualizado. O seed da migration 001 nao rodou neste banco. As server fns de settings vao precisar criar o registro.';
  ELSIF n > 1 THEN
    RAISE WARNING 'affiliate_settings tem % registros (esperado 1). A leitura por .limit(1) fica nao-deterministica.', n;
  ELSE
    RAISE NOTICE 'min_payout_amount = 50.00 aplicado no registro unico.';
  END IF;
END $$;

-- ---------------------------------------------
-- 3. CHECK de status: adicionar 'refunded'
--
-- Descobre o nome real da constraint em vez de assumir
-- 'affiliate_sales_status_check'.
-- ---------------------------------------------
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname, pg_get_constraintdef(con.oid) AS def
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'affiliate_sales'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%cancelled%'
  LOOP
    RAISE NOTICE 'Removendo CHECK % -> %', c.conname, c.def;
    EXECUTE format('ALTER TABLE public.affiliate_sales DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.affiliate_sales
  ADD CONSTRAINT affiliate_sales_status_check
  CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'refunded'));

-- ---------------------------------------------
-- 4. FK real: affiliate_sales.payout_id -> affiliate_payouts(id)
--
-- Nas duas migrations historicas payout_id e UUID solto, sem
-- REFERENCES. Aborta se houver payout_id apontando para payout
-- inexistente, em vez de apagar o dado silenciosamente.
-- ---------------------------------------------
DO $$
DECLARE
  orfaos INTEGER;
  ja_existe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel  ON rel.oid  = con.conrelid
      JOIN pg_class fref ON fref.oid = con.confrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname  = 'affiliate_sales'
       AND fref.relname = 'affiliate_payouts'
       AND con.contype  = 'f'
       AND (SELECT attnum FROM pg_attribute
             WHERE attrelid = rel.oid AND attname = 'payout_id') = ANY (con.conkey)
  ) INTO ja_existe;

  IF ja_existe THEN
    RAISE NOTICE 'FK payout_id -> affiliate_payouts JA EXISTE. Nada a fazer.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO orfaos
    FROM public.affiliate_sales s
   WHERE s.payout_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.affiliate_payouts p WHERE p.id = s.payout_id);

  IF orfaos > 0 THEN
    RAISE EXCEPTION 'ABORTADO: % linhas em affiliate_sales tem payout_id apontando para affiliate_payouts inexistente. Investigue antes. Nao vou apagar o dado sozinha.', orfaos;
  END IF;

  ALTER TABLE public.affiliate_sales
    ADD CONSTRAINT affiliate_sales_payout_id_fkey
    FOREIGN KEY (payout_id) REFERENCES public.affiliate_payouts(id) ON DELETE SET NULL;

  RAISE NOTICE 'FK payout_id -> affiliate_payouts(id) ON DELETE SET NULL criada.';
END $$;

-- ---------------------------------------------
-- 5. Indices para a consulta de disponibilidade
--
-- A regra do Passo 4 e: status = 'confirmed' AND payout_id IS NULL
--   AND confirmed_at + release_delay_days <= now()
-- ---------------------------------------------
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status_confirmed_at
  ON public.affiliate_sales (status, confirmed_at);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_payout
  ON public.affiliate_sales (payout_id)
  WHERE payout_id IS NOT NULL;
