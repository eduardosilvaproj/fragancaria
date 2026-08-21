-- Migration para adicionar coluna whatsapp_notifications_enabled na tabela store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN NOT NULL DEFAULT true;
