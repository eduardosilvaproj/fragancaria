-- Migration para claim atômico de marketing (recompra e aniversário) com FOR UPDATE
CREATE OR REPLACE FUNCTION claim_marketing_send(p_type TEXT, p_target_id UUID, p_year INT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_type = 'reorder' THEN
    -- p_target_id é o ID do pedido
    UPDATE orders
    SET whatsapp_sent_recompra = NOW()
    WHERE id = p_target_id
      AND whatsapp_sent_recompra IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;

  ELSIF p_type = 'birthday' THEN
    -- p_target_id é o ID do cliente (customers) e p_year é o ano atual
    UPDATE customers
    SET last_birthday_coupon_year = p_year,
        last_birthday_coupon_at = NOW()
    WHERE id = p_target_id
      AND (last_birthday_coupon_year IS NULL OR last_birthday_coupon_year < p_year);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adiciona a coluna de controle na tabela orders para recompra
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS whatsapp_sent_recompra TIMESTAMPTZ NULL;

-- Adiciona coluna de timestamp de cupom de aniversário em customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS last_birthday_coupon_at TIMESTAMPTZ NULL;
