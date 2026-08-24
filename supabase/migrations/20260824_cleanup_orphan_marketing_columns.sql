-- Limpeza de colunas órfãs e desnecessárias
ALTER TABLE customers
DROP COLUMN IF EXISTS last_reorder_reminder_at;
