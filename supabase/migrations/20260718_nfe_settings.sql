-- Migration: nfe_settings table for emitente (company) data
-- Stores company credentials and certificate info for NF-e emission
-- Certificate (.pfx file) should be stored on the server filesystem,
-- not in this table. Only the file path is stored here.

CREATE TABLE IF NOT EXISTS public.nfe_settings (
  id text PRIMARY KEY DEFAULT 'main',
  -- Company identity
  cnpj text NOT NULL,
  inscricao_estadual text NOT NULL,
  inscricao_municipal text,
  razao_social text NOT NULL,
  nome_fantasia text,
  -- Address
  endereco jsonb NOT NULL DEFAULT '{}',
  -- SEFAZ configuration
  ambiente_sefaz text NOT NULL DEFAULT 'homologacao'
    CHECK (ambiente_sefaz IN ('homologacao', 'producao')),
  estado_uf text NOT NULL,
  -- Certificate (path to .pfx file on server, NOT the blob)
  certificado_path text,
  certificado_senha text,
  -- SEFAZ credentials (varies by state)
  webservice_url text,
  -- NF-e sequence tracking
  nfe_last_number integer DEFAULT 0,
  nfe_serie integer DEFAULT 1,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one active configuration
ALTER TABLE public.nfe_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage nfe_settings" ON public.nfe_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nfe_settings_updated_at ON public.nfe_settings;
CREATE TRIGGER nfe_settings_updated_at
  BEFORE UPDATE ON public.nfe_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default empty record for initial setup
INSERT INTO public.nfe_settings (id, cnpj, inscricao_estadual, razao_social, estado_uf, endereco)
VALUES ('main', '', '', '', '', '{}')
ON CONFLICT (id) DO NOTHING;