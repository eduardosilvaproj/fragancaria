-- Tabela de configurações de notificações
CREATE TABLE notification_settings (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  audience TEXT NOT NULL, -- 'customer' | 'internal'
  channel TEXT NOT NULL, -- 'email' | 'whatsapp' | 'telegram'
  destination TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  template_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Sem acesso anon/authenticated
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
