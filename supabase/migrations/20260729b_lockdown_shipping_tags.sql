-- =====================================================
-- LOCKDOWN RLS: shipping_tags (+ view shipping_tags_stats)
-- =====================================================
-- ULTIMO caso do padrao "policy chamada Admin com predicado permissivo".
-- Estado real de producao, lido em 2026-07-29 via pg_policies:
--
--   tablename     | policyname                 | cmd | roles    | qual
--   shipping_tags | Admin manage shipping tags | ALL | {public} | auth.role() = 'authenticated'
--
-- O nome diz "Admin", o predicado nao: `authenticated` e qualquer usuario
-- logado, inclusive cliente comum da loja. Pior, roles = {public} aplica a
-- policy a TODOS os papeis. Como a anon key vai no bundle do browser, uma
-- sessao de cliente teria ALL (select/insert/update/delete) nesta tabela.
--
-- A mesma varredura confirmou que os outros candidatos ja estao corrigidos em
-- producao, ao contrario do que os arquivos de migration sugerem:
--   products  -> so products_select_public (SELECT, is_active = true)
--   orders    -> so orders_select_auth (SELECT, por dono via auth.uid())
--   coupons, shipping_quotes, nfe_settings -> sem policy permissiva
-- Ou seja: os arquivos 002_ecommerce_tables.sql e 20260712_shipping_quotes.sql
-- estao DESATUALIZADOS em relacao a prod. Nao mexo neles aqui.
--
-- POR QUE E SEGURO TRANCAR (auditoria do repo, 2026-07-29)
-- Os dois unicos acessos a shipping_tags usam supabaseAdmin (service role):
--   logistics.functions.ts:1225  INSERT (requestSigepLabels)
--   logistics.functions.ts:1263  SELECT (listSigepLabels)
-- O terceiro hit, logistica.tsx:1706, e comentario. Nada fora de src/ toca a
-- tabela. A tabela esta VAZIA em prod, entao este e o caso de dano zero —
-- igual a shipping_quotes/nfe_settings quando foram trancadas em 17/07.
-- =====================================================

-- =====================================================
-- 1. Remove TODAS as policies da tabela
-- =====================================================
-- Loop em vez de DROP nominal, mesmo motivo de 20260729: trata o que existe de
-- fato e e idempotente.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shipping_tags'
  LOOP
    RAISE NOTICE 'Removendo policy "%" de %.%', r.policyname, r.schemaname, r.tablename;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- =====================================================
-- 2. RLS ligado (sem policy = nega tudo)
-- =====================================================
-- service_role continua passando (bypassa RLS), que e como as server fns
-- acessam. Sem FORCE, pelo mesmo motivo de 20260729: FORCE tiraria a isencao
-- do owner, que e o papel do SQL Editor, e um UPDATE manual passaria a afetar
-- 0 linhas sem dar erro.
ALTER TABLE public.shipping_tags ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. Revoga GRANT da tabela E da view
-- =====================================================
REVOKE ALL ON public.shipping_tags FROM anon, authenticated;

-- A VIEW e o detalhe que quase passou batido: shipping_tags_stats
-- (20260714_shipping_tags.sql) agrega status/service de shipping_tags. No
-- Postgres, view sem `security_invoker` roda com as permissoes do DONO dela,
-- entao a RLS da tabela base e avaliada contra o owner — nao contra quem
-- consulta. Uma view com GRANT para anon vira caminho de leitura por volta da
-- RLS que acabamos de ligar. Nenhum codigo usa esta view (grep em src/ e
-- scripts/ nao acha um uso), entao revogar nao quebra nada.
--
-- Condicional porque REVOKE em objeto inexistente ABORTA o script: nao verifiquei
-- se a view existe em prod (pg_policies, que foi o que li, nao lista views).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'shipping_tags_stats'
  ) THEN
    REVOKE ALL ON public.shipping_tags_stats FROM anon, authenticated;
    RAISE NOTICE 'GRANT revogado da view shipping_tags_stats';
  ELSE
    RAISE NOTICE 'View shipping_tags_stats nao existe — nada a revogar';
  END IF;
END $$;

-- =====================================================
-- 4. Verificacao (rode junto e confira a saida)
-- =====================================================
-- Esperado: rls_habilitado = true, policies = 0, e os tres contadores de
-- privilegio em 0.
SELECT
  c.relname                                             AS objeto,
  c.relkind                                             AS tipo, -- r = tabela, v = view
  c.relrowsecurity                                      AS rls_habilitado,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies,
  (SELECT count(*) FROM information_schema.role_table_grants g
     WHERE g.table_schema = 'public' AND g.table_name = c.relname
       AND g.grantee = 'anon')                          AS privilegios_anon,
  (SELECT count(*) FROM information_schema.role_table_grants g
     WHERE g.table_schema = 'public' AND g.table_name = c.relname
       AND g.grantee = 'authenticated')                 AS privilegios_authenticated
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('shipping_tags', 'shipping_tags_stats')
ORDER BY c.relname;
