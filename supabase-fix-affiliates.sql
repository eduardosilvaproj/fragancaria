-- =====================================================
-- FIX: Adicionar colunas de endereço na tabela affiliates
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Adicionar colunas de endereço
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS address_state VARCHAR(2);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS address_zip VARCHAR(10);

-- Adicionar data de nascimento
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Verificar se as colunas foram criadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'affiliates'
ORDER BY ordinal_position;
