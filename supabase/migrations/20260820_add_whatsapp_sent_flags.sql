-- Migration para adicionar colunas de controle de envio de WhatsApp na tabela orders (v2: timestamptz para trava atômica)
ALTER TABLE orders DROP COLUMN IF EXISTS whatsapp_sent_approved;
ALTER TABLE orders DROP COLUMN IF EXISTS whatsapp_sent_shipped;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_sent_approved TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_sent_shipped TIMESTAMPTZ;
