-- Migration: Desativa o Produto Teste (FRAG-f7584446-fbc) em produção
-- Não deleta a linha para preservar a integridade referencial dos 8 pedidos existentes (FK).
UPDATE products
SET is_active = false,
    in_stock = false,
    quantity = 0,
    updated_at = NOW()
WHERE id = 'FRAG-f7584446-fbc';
