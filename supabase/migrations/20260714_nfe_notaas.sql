-- 20260714_nfe_notaas.sql
-- Rodar no SQL Editor do Supabase (project gzxlupgdmrtkprwhiutp).
-- Consolida as migrations 20260718_nfe_orders_columns.sql e
-- 20260718_nfe_settings.sql (que nunca foram aplicadas em prod).
-- Adiciona colunas NF-e em orders + tabela nfe_settings.
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ============================================================
-- 1. Colunas NF-e em orders
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS nfe_key text,
  ADD COLUMN IF NOT EXISTS nfe_number integer,
  ADD COLUMN IF NOT EXISTS nfe_series integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nfe_status text,
  ADD COLUMN IF NOT EXISTS nfe_xml text,
  ADD COLUMN IF NOT EXISTS nfe_danfe_url text,
  ADD COLUMN IF NOT EXISTS nfe_emitted_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_nfe_key_idx ON public.orders(nfe_key) WHERE nfe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_nfe_number_idx ON public.orders(nfe_series, nfe_number) WHERE nfe_number IS NOT NULL;

-- ============================================================
-- 2. Tabela nfe_settings (emitente)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nfe_settings (
  id text PRIMARY KEY DEFAULT 'main',
  cnpj text NOT NULL,
  inscricao_estadual text NOT NULL,
  inscricao_municipal text,
  razao_social text NOT NULL,
  nome_fantasia text,
  endereco jsonb NOT NULL DEFAULT '{}',
  ambiente_sefaz text NOT NULL DEFAULT 'homologacao'
    CHECK (ambiente_sefaz IN ('homologacao', 'producao')),
  estado_uf text NOT NULL,
  certificado_path text,
  webservice_url text,
  nfe_last_number integer DEFAULT 0,
  nfe_serie integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfe_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nfe_settings_admin_all ON public.nfe_settings;
CREATE POLICY nfe_settings_admin_all ON public.nfe_settings
  FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS nfe_settings_updated_at ON public.nfe_settings;
CREATE TRIGGER nfe_settings_updated_at
  BEFORE UPDATE ON public.nfe_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.nfe_settings (id, cnpj, inscricao_estadual, razao_social, estado_uf, endereco)
VALUES ('main', '', '', '', '', '{}')
ON CONFLICT (id) DO NOTHING;