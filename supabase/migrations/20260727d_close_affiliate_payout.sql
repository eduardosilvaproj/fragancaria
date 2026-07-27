-- =============================================
-- FECHAMENTO DE REPASSE — FUNCAO TRANSACIONAL
-- 2026-07-27
--
-- Depende de 20260727c_affiliate_payout_cycle.sql (FK payout_id + CHECK).
-- Idempotente (CREATE OR REPLACE).
--
-- APLICADA EM PRODUCAO em 2026-07-27 pelo Edu, via SQL Editor.
-- Teste a seco na mesma sessao (banco vazio): out_payout_id NULL,
-- out_skipped_reason 'sem comissoes disponiveis', zero linhas criadas
-- em affiliate_payouts. Ou seja, a funcao recusa em vez de fechar lote
-- vazio.
--
-- POR QUE UMA FUNCAO SQL E NAO CODIGO TS:
-- O client Supabase fala PostgREST, que executa uma instrucao por
-- request. Nao existe BEGIN/COMMIT abrangendo duas chamadas. Fazer
-- "insert payout" e depois "update comissoes" em dois requests
-- permite exatamente o estado que nao pode existir: payout criado
-- sem as comissoes marcadas (ou o inverso). O corpo de uma funcao
-- plpgsql roda numa transacao implicita unica: qualquer excecao
-- desfaz TUDO, inclusive o INSERT.
--
-- POR QUE FOR UPDATE (sem SKIP LOCKED):
-- O lote e remontado DENTRO da transacao, nunca a partir de uma lista
-- calculada antes. Se dois fechamentos correrem em paralelo (aba
-- dupla, duplo clique), T2 bloqueia no FOR UPDATE; quando T1 comita,
-- o Postgres reavalia o WHERE contra a nova versao da linha (EvalPlanQual,
-- READ COMMITTED). As linhas agora tem status='paid' e payout_id
-- preenchido, deixam de casar, e T2 encontra 0 comissoes e devolve
-- "sem comissoes disponiveis". Nenhuma comissao entra em dois lotes.
-- SKIP LOCKED tambem evitaria a dupla oferta, mas silenciosamente
-- fecharia um lote parcial; bloquear e devolver resultado correto e
-- melhor para uma acao manual de admin sobre poucas linhas.
--
-- Os parametros OUT usam prefixo out_ de proposito: nomes como
-- amount/period_start/payout_id colidiriam com colunas das tabelas
-- envolvidas e podem virar "column reference is ambiguous" em
-- plpgsql. Prefixar remove a classe de erro inteira.
-- =============================================

CREATE OR REPLACE FUNCTION public.close_affiliate_payout(
  p_affiliate_id UUID,
  p_cutoff TIMESTAMPTZ,
  p_min_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  out_payout_id UUID,
  out_sales_count INTEGER,
  out_amount NUMERIC,
  out_period_start DATE,
  out_period_end DATE,
  out_skipped_reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_ids UUID[];
  v_amount NUMERIC := 0;
  v_count INTEGER := 0;
  v_start DATE;
  v_end DATE;
  v_payout_id UUID;
  v_pix_key TEXT;
  v_pix_key_type TEXT;
  v_updated INTEGER;
BEGIN
  IF p_affiliate_id IS NULL OR p_cutoff IS NULL OR p_min_amount IS NULL THEN
    RAISE EXCEPTION 'close_affiliate_payout: p_affiliate_id, p_cutoff e p_min_amount sao obrigatorios';
  END IF;

  -- ------------------------------------------------
  -- 1. Trava e remonta o lote AQUI DENTRO.
  --
  -- A lista de comissoes nunca vem de fora: quem chama passa apenas
  -- o corte de data (p_cutoff) e o minimo. Os criterios sao os mesmos
  -- de bucketOf() em src/lib/affiliate-payout.ts:
  --   status='confirmed' AND payout_id IS NULL
  --   AND confirmed_at IS NOT NULL AND confirmed_at <= cutoff
  -- confirmed_at NULL fica fora de proposito: sem data de referencia
  -- nao ha prazo a cumprir.
  -- ------------------------------------------------
  SELECT array_agg(locked.id ORDER BY locked.confirmed_at),
         COALESCE(sum(locked.commission_amount), 0),
         count(*)::INTEGER,
         min(locked.confirmed_at)::DATE,
         max(locked.confirmed_at)::DATE
    INTO v_ids, v_amount, v_count, v_start, v_end
    FROM (
      SELECT s.id, s.commission_amount, s.confirmed_at
        FROM public.affiliate_sales s
       WHERE s.affiliate_id = p_affiliate_id
         AND s.status = 'confirmed'
         AND s.payout_id IS NULL
         AND s.confirmed_at IS NOT NULL
         AND s.confirmed_at <= p_cutoff
       ORDER BY s.confirmed_at
         FOR UPDATE
    ) locked;

  IF v_ids IS NULL OR v_count = 0 THEN
    RETURN QUERY SELECT NULL::UUID, 0, 0::NUMERIC, NULL::DATE, NULL::DATE,
                        'sem comissoes disponiveis'::TEXT;
    RETURN;
  END IF;

  -- ------------------------------------------------
  -- 2. Minimo: devolve motivo em vez de excecao.
  --
  -- O fechamento em massa chama esta funcao uma vez por afiliado.
  -- Levantar excecao aqui faria um afiliado abaixo do minimo abortar
  -- o lote dos outros. Devolver o motivo deixa o chamador relatar
  -- por afiliado.
  -- ------------------------------------------------
  IF v_amount < p_min_amount THEN
    RETURN QUERY SELECT NULL::UUID, v_count, v_amount, v_start, v_end,
                        format('abaixo do minimo (%s < %s)', v_amount, p_min_amount)::TEXT;
    RETURN;
  END IF;

  -- Snapshot da chave PIX no momento do fechamento: se o afiliado
  -- trocar a chave depois, o comprovante deste lote continua fiel.
  SELECT a.pix_key, a.pix_key_type
    INTO v_pix_key, v_pix_key_type
    FROM public.affiliates a
   WHERE a.id = p_affiliate_id;

  -- ------------------------------------------------
  -- 3. Cria o payout.
  --
  -- status='pending' = lote fechado, dinheiro AINDA NAO enviado.
  -- O admin marca 'paid' depois de fazer o PIX. As comissoes ja vao
  -- para 'paid' agora (regra aprovada): do lado da comissao, 'paid'
  -- significa "fechada num lote", e o status real do dinheiro vive
  -- no payout.
  --
  -- period_start/period_end = menor e maior confirmed_at do lote.
  -- Descreve o que esta DENTRO do repasse. Janela de calendario fixa
  -- nao serve: o fechamento e manual e sob demanda, entao o periodo
  -- do calendario nao corresponderia as comissoes incluidas.
  -- ------------------------------------------------
  INSERT INTO public.affiliate_payouts (
    affiliate_id, amount, period_start, period_end, status,
    pix_key, pix_key_type, notes
  ) VALUES (
    p_affiliate_id, v_amount, v_start, v_end, 'pending',
    v_pix_key, v_pix_key_type, p_notes
  )
  RETURNING id INTO v_payout_id;

  -- ------------------------------------------------
  -- 4. Marca as comissoes do lote.
  --
  -- O WHERE repete status/payout_id (alem do id) como ultima defesa:
  -- se alguma linha escapou entre a trava e aqui, o UPDATE nao a pega.
  -- ------------------------------------------------
  UPDATE public.affiliate_sales s
     SET status = 'paid',
         payout_id = v_payout_id,
         paid_at = NOW()
   WHERE s.id = ANY(v_ids)
     AND s.status = 'confirmed'
     AND s.payout_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Trava final de atomicidade: se o numero de comissoes atualizadas
  -- nao bate com o lote medido, a excecao desfaz o INSERT tambem.
  -- Nunca sobra payout sem comissoes.
  IF v_updated <> v_count THEN
    RAISE EXCEPTION
      'ABORTADO: esperava marcar % comissoes, marcou %. Nada foi gravado (rollback do payout).',
      v_count, v_updated;
  END IF;

  RETURN QUERY SELECT v_payout_id, v_count, v_amount, v_start, v_end, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.close_affiliate_payout(UUID, TIMESTAMPTZ, NUMERIC, TEXT) IS
  'Fecha UM repasse para UM afiliado, em transacao unica: trava as comissoes disponiveis (confirmed, sem payout, prazo cumprido), confere o minimo, cria o affiliate_payout e marca as comissoes como paid com payout_id. Devolve out_skipped_reason quando nao ha o que fechar.';

-- ---------------------------------------------
-- Permissoes: so o service role executa.
--
-- Postgres concede EXECUTE a PUBLIC por padrao. As policies de RLS
-- ja barrariam a escrita para anon/authenticated, mas fechar o
-- EXECUTE remove a superficie em vez de depender disso.
-- ---------------------------------------------
REVOKE ALL ON FUNCTION public.close_affiliate_payout(UUID, TIMESTAMPTZ, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_affiliate_payout(UUID, TIMESTAMPTZ, NUMERIC, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.close_affiliate_payout(UUID, TIMESTAMPTZ, NUMERIC, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.close_affiliate_payout(UUID, TIMESTAMPTZ, NUMERIC, TEXT) TO service_role;
