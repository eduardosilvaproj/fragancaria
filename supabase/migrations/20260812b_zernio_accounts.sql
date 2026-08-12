CREATE TABLE IF NOT EXISTS zernio_accounts (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'whatsapp', 'facebook', 'telegram')),
  account_id TEXT NOT NULL,
  label TEXT NOT NULL,
  phone_number TEXT,
  mode TEXT CHECK (mode IN ('cloud_api_only', 'coexistence')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT zernio_accounts_platform_account_id_key UNIQUE (platform, account_id)
);

ALTER TABLE zernio_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE zernio_accounts FROM anon, authenticated;
GRANT ALL ON TABLE zernio_accounts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE zernio_accounts_id_seq TO service_role;

COMMENT ON TABLE zernio_accounts IS 'Contas Zernio (Instagram/WhatsApp) configuráveis para integrações.';
