-- Migration para claim atômico de WhatsApp com travamento de linha (FOR UPDATE)
CREATE OR REPLACE FUNCTION claim_whatsapp_send(p_order_id UUID, p_field TEXT)
RETURNS SETOF orders AS $$
DECLARE
  v_row orders%ROWTYPE;
BEGIN
  IF p_field = 'whatsapp_sent_approved' THEN
    SELECT * INTO v_row FROM orders WHERE id = p_order_id AND whatsapp_sent_approved IS NULL FOR UPDATE;
    IF FOUND THEN
      UPDATE orders SET whatsapp_sent_approved = NOW() WHERE id = p_order_id;
      SELECT * INTO v_row FROM orders WHERE id = p_order_id;
      RETURN NEXT v_row;
    END IF;
  ELSIF p_field = 'whatsapp_sent_shipped' THEN
    SELECT * INTO v_row FROM orders WHERE id = p_order_id AND whatsapp_sent_shipped IS NULL FOR UPDATE;
    IF FOUND THEN
      UPDATE orders SET whatsapp_sent_shipped = NOW() WHERE id = p_order_id;
      SELECT * INTO v_row FROM orders WHERE id = p_order_id;
      RETURN NEXT v_row;
    END IF;
  END IF;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
