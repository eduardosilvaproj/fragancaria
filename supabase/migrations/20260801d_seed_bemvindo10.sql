-- =====================================================
-- SEED: cupom BEMVINDO10 em public.coupons
-- =====================================================
-- POR QUE (C14)
-- Ate agora o checkout lia um mapa HARDCODED em commerce-config.ts com um
-- unico cupom, BEMVINDO10 (10%). O C14 troca a fonte para a tabela coupons.
-- Sem este seed, trocar a fonte APAGA o unico cupom que hoje funciona: o
-- cliente que digita BEMVINDO10 passaria a receber "cupom nao encontrado".
--
-- IDEMPOTENTE
-- ON CONFLICT (code) DO NOTHING: rodar 2x nao duplica nem sobrescreve. Se o
-- Edu ja tiver criado BEMVINDO10 pela tela do admin, este seed respeita o que
-- existe (nao mexe em usage_count nem em datas). Requer UNIQUE em code — que
-- a tabela tem (a coluna e a chave de busca do resolveCoupon).
--
-- VALORES
-- Espelham o mapa antigo: percentage, 10%. Sem valor minimo, sem validade,
-- sem limite de uso — igual ao comportamento atual. Ajustes finos (validade,
-- limite) ficam pra tela do admin, que agora funciona.
-- =====================================================

INSERT INTO public.coupons (code, description, discount_type, discount_value, is_active)
VALUES ('BEMVINDO10', 'Cupom de boas-vindas — 10% de desconto', 'percentage', 10, true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- VERIFICACAO (rode junto)
-- =====================================================
-- Esperado: 1 linha, BEMVINDO10 / percentage / 10 / ativo.
SELECT code, discount_type, discount_value, is_active
FROM public.coupons
WHERE code = 'BEMVINDO10';
