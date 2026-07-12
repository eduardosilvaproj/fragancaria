-- =====================================================
-- SHIPPING SETTINGS: Configuracoes de frete
-- =====================================================
-- Armazena configuracoes de frete, transportadoras e
-- dados do remetente para emissao de etiquetas.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shipping_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice para busca rapida
CREATE INDEX IF NOT EXISTS idx_shipping_settings_key ON public.shipping_settings(key);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS shipping_settings_updated_at ON public.shipping_settings;
CREATE TRIGGER shipping_settings_updated_at
  BEFORE UPDATE ON public.shipping_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- RLS: Somente admin pode gerenciar
-- =====================================================

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

-- Admin pode ver e editar
CREATE POLICY "Admin manage shipping settings"
  ON public.shipping_settings FOR ALL
  USING (auth.role() = 'authenticated');

-- =====================================================
-- SEED: Configuracoes padrao
-- =====================================================

INSERT INTO public.shipping_settings (key, value, description) VALUES
  (
    'free_shipping_threshold',
    '{"value": 199, "enabled": true}',
    'Valor minimo para frete gratis em centavos (R$ 199,00)'
  ),
  (
    'default_handling_days',
    '{"min": 1, "max": 3}',
    'Dias uteis para preparacao do pedido antes do envio'
  ),
  (
    'sender_info',
    '{
      "name": "Fragranciaria",
      "document": "",
      "phone": "",
      "email": "contato@fragranciaria.com",
      "address": {
        "street": "",
        "number": "",
        "complement": "",
        "neighborhood": "",
        "city": "",
        "state": "",
        "postal_code": "01310100"
      }
    }',
    'Dados do remetente para emissao de etiquetas'
  ),
  (
    'api_config',
    '{
      "enviofacil_api_key": "",
      "enviofacil_enabled": false,
      "use_fallback": true
    }',
    'Configuracoes da API de fretes (Envio Facil)'
  ),
  (
    'sigep_credentials',
    '{
      "usuario": "",
      "senha": "",
      "codAdministrativo": "",
      "numeroCartao": "",
      "cepOrigem": ""
    }',
    'Credenciais do SIGEP Web para emissao de etiquetas Correios'
  ),
  (
    'carriers',
    '[
      {"id": "correios", "name": "Correios", "code": "correios", "enabled": true, "services": ["PAC", "SEDEX", "SEDEX10"]},
      {"id": "jadlog", "name": "Jadlog", "code": "jadlog", "enabled": false, "services": ["Expresso", "Economico"]},
      {"id": "azul", "name": "Azul Cargo", "code": "azul", "enabled": false, "services": ["Azul"]},
      {"id": "loggi", "name": "Loggi", "code": "loggi", "enabled": false, "services": ["Economico"]}
    ]',
    'Transportadoras ativas e servicos disponiveis'
  )
ON CONFLICT (key) DO NOTHING;