-- Migration para adicionar coluna zernio_message_id em orders para vincular eventos de webhook de status da Zernio
--
ALTER TABLE orders
ADD COLUMN zernio_message_id_approved TEXT NULL,
ADD COLUMN zernio_message_id_shipped TEXT NULL;

-- Adiciona índice para acelerar buscas por message_id
CREATE INDEX idx_orders_zernio_message_id_approved ON orders(zernio_message_id_approved);
CREATE INDEX idx_orders_zernio_message_id_shipped ON orders(zernio_message_id_shipped);

-- Adiciona coluna para registrar falhas de entrega (opcional, mas útil para auditoria)
ALTER TABLE orders
ADD COLUMN zernio_delivery_failure_reason TEXT NULL;