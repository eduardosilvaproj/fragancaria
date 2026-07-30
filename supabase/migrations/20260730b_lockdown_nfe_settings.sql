-- =====================================================
-- LOCKDOWN RLS: nfe_settings
-- =====================================================
-- CONTEXTO
-- A migration 20260714_nfe_notaas.sql (a que FOI aplicada) cria:
--   CREATE POLICY nfe_settings_admin_all ON public.nfe_settings
--     FOR ALL USING (true) WITH CHECK (true);
-- Sem restricao de role. No papel isso libera anon e authenticated para ler e
-- escrever o emitente: CNPJ, inscricao estadual, endereco fiscal e a coluna
-- certificado_senha. A anon key vai no bundle do browser, entao "no papel"
-- significaria exposicao real.
--
-- ESTADO MEDIDO EM PROD (2026-07-30, anon key, SEM login)
-- A tabela JA ESTA FECHADA para anon. Sonda com a anon key:
--   SELECT  -> 42501 permission denied for table nfe_settings
--   UPDATE  -> 42501 permission denied for table nfe_settings
--   INSERT  -> 42501 permission denied for table nfe_settings
--   DELETE  -> 42501 permission denied for table nfe_settings
-- Comparacao no mesmo teste (controles ja trancados em 2026-07-29):
--   payment_settings  -> 42501 em SELECT/INSERT
--   shipping_settings -> 42501 em SELECT/INSERT
--   shipping_tags     -> 42501 em SELECT/INSERT
--   store_settings    -> SELECT PERMITIDO, 0 linhas (tem GRANT, RLS filtra)
-- Ou seja: o arquivo do repo NAO reflete producao — mais um caso do padrao ja
-- registrado (a auditoria de 29/07 teve 4 falsos positivos por arquivo
-- defasado, e o unico buraco real, shipping_tags, nao estava em arquivo obvio).
-- O 42501 indica ausencia de GRANT de tabela, que barra antes da RLS. Logo a
-- policy permissiva do arquivo ou nunca existiu em prod, ou foi removida fora
-- do repo.
--
-- O QUE ESTA MIGRATION E, ENTAO
-- NAO e a correcao de um buraco aberto. E:
--   (a) tornar o estado desejado explicito no repo, para o proximo que ler
--       20260714 nao recriar a policy permissiva;
--   (b) fechar a lacuna que a sonda NAO cobriu — ver abaixo;
--   (c) igualar nfe_settings ao padrao de store_settings / payment_settings /
--       shipping_settings: RLS ligado, ZERO policies, so service role.
--
-- LACUNA QUE ESTA MIGRATION FECHA (e que a sonda nao mediu)
-- A sonda usou a anon key SEM login, entao provou o papel `anon` e nao
-- `authenticated`. Foi exatamente `authenticated` o vetor do lockdown de
-- 29/07: policies chamadas "admin" com predicado
-- USING (auth.role() = 'authenticated') — qualquer cliente logado da loja.
-- GRANT e privilegio POR PAPEL, e este projeto ja viu os dois divergirem
-- (shipping_settings sem GRANT dava 42501; payment_settings com GRANT dava 0
-- linhas). Nao da para concluir sobre `authenticated` a partir de um teste de
-- `anon`. O REVOKE do bloco 3 cobre os dois papeis de forma explicita.
--
-- POR QUE E SEGURO TRANCAR (grep de 2026-07-30)
-- Existem exatamente 3 acessos a nfe_settings no codigo, todos em
-- src/lib/nfe.functions.ts, todos com `supabaseAdmin` (service role, que
-- bypassa RLS) e todos atras de requireAdmin():
--   linha 117  getNfeSettings  -> SELECT
--   linha 186  saveNfeSettings -> UPSERT
--   linha 230  emitNFe         -> SELECT
-- As outras 3 ocorrencias de "nfe_settings" no repo sao COMENTARIO
-- (LojaFisicaSection.tsx:4, store-settings.functions.ts:4,
-- configuracoes.tsx:1558). Nenhum componente React, hook ou rota le a tabela
-- com o client do browser. Nao ha realtime/channel nela. Portanto remover
-- policies nao tira acesso de ninguem que hoje funcione.
--
-- DIVERGENCIA DE SCHEMA ENCONTRADA (nao corrigida aqui, so registrada)
-- A coluna certificado_senha EXISTE em prod (auditoria de 30/07 leu a linha
-- 'main' e o campo veio NULO). Mas ela NAO e criada por
-- 20260714_nfe_notaas.sql, que e a migration que o proprio cabecalho declara
-- como a aplicada; ela so aparece em 20260718_nfe_settings.sql, que o mesmo
-- cabecalho afirma "nunca foi aplicada em prod". Uma das duas coisas e falsa,
-- ou a coluna entrou por ALTER manual. Fica como pendencia de auditoria: nao
-- mexo em coluna nesta rodada.
--
-- FORA DE ESCOPO DESTA MIGRATION (decisao do dono / orientacao do contador)
-- Hardcode de NCM/CFOP/CST em nfe.functions.ts e a tabela de 10 cidades do
-- getCityCode. Nada aqui toca emissao.
-- =====================================================

-- =====================================================
-- 0. DIAGNOSTICO DO ESTADO ANTES (nao altera nada)
-- =====================================================
-- Roda ANTES do lockdown e imprime o que existe de fato. Duas coisas so podem
-- ser medidas daqui de dentro, com acesso ao catalogo:
--   - pg_policies: a sonda externa ve o efeito (42501), nao a policy em si.
--   - views: pg_policies NAO lista view, e view sem security_invoker avalia
--     RLS contra o DONO, nao contra quem consulta. Foi assim que
--     shipping_tags_stats passou batido na auditoria anterior. Tentei enumerar
--     por fora via OpenAPI do PostgREST e tomei 401, e adivinhar nome nao e
--     prova — entao a checagem correta e esta, em pg_views.
DO $$
DECLARE
  r RECORD;
  n integer;
BEGIN
  RAISE NOTICE '--- ANTES: policies em nfe_settings ---';
  n := 0;
  FOR r IN
    SELECT policyname, roles::text AS roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'nfe_settings'
  LOOP
    n := n + 1;
    RAISE NOTICE 'policy "%": roles=% cmd=% using=% check=%',
      r.policyname, r.roles, r.cmd, coalesce(r.qual, '(null)'), coalesce(r.with_check, '(null)');
  END LOOP;
  IF n = 0 THEN
    RAISE NOTICE 'nenhuma policy (a do arquivo 20260714 nao esta em prod)';
  END IF;

  RAISE NOTICE '--- ANTES: grants de tabela para anon/authenticated ---';
  n := 0;
  FOR r IN
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'nfe_settings'
      AND grantee IN ('anon', 'authenticated')
    ORDER BY grantee, privilege_type
  LOOP
    n := n + 1;
    RAISE NOTICE 'GRANT % para %', r.privilege_type, r.grantee;
  END LOOP;
  IF n = 0 THEN
    RAISE NOTICE 'nenhum grant para anon/authenticated (explica o 42501 medido)';
  END IF;

  RAISE NOTICE '--- ANTES: views que referenciam nfe_settings ---';
  n := 0;
  FOR r IN
    SELECT c.relname AS viewname,
           c.reloptions::text AS opcoes,
           pg_get_userbyid(c.relowner) AS dono
    FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public'
      AND c.relkind IN ('v', 'm')
      AND pg_get_viewdef(c.oid) ILIKE '%nfe_settings%'
  LOOP
    n := n + 1;
    RAISE NOTICE 'VIEW %.% dono=% opcoes=% <= CHECAR security_invoker',
      'public', r.viewname, r.dono, coalesce(r.opcoes, '(sem opcoes)');
  END LOOP;
  IF n = 0 THEN
    RAISE NOTICE 'nenhuma view le nfe_settings (nada a checar)';
  END IF;

  RAISE NOTICE '--- ANTES: funcoes SECURITY DEFINER que leem nfe_settings ---';
  n := 0;
  FOR r IN
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.prosecdef                      -- SECURITY DEFINER
      AND pg_get_functiondef(p.oid) ILIKE '%nfe_settings%'
  LOOP
    n := n + 1;
    RAISE NOTICE 'FUNCTION %() e SECURITY DEFINER e toca nfe_settings <= CHECAR', r.proname;
  END LOOP;
  IF n = 0 THEN
    RAISE NOTICE 'nenhuma funcao SECURITY DEFINER toca nfe_settings';
  END IF;
END $$;

-- =====================================================
-- 1. Remove TODAS as policies da tabela
-- =====================================================
-- Loop em vez de DROP POLICY nominal, pelo mesmo motivo do lockdown de 29/07:
-- o nome no arquivo (nfe_settings_admin_all) pode nao ser o que existe em
-- prod, e ja se provou que arquivo != producao neste projeto. O loop trata o
-- que existe DE FATO e e idempotente.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'nfe_settings'
  LOOP
    RAISE NOTICE 'Removendo policy "%" de %.%', r.policyname, r.schemaname, r.tablename;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- =====================================================
-- 2. Garante RLS ligado (sem policy = nega tudo)
-- =====================================================
ALTER TABLE public.nfe_settings ENABLE ROW LEVEL SECURITY;

-- NAO usar FORCE ROW LEVEL SECURITY, de proposito e pelo mesmo motivo
-- documentado em 20260729: FORCE tira a isencao do DONO (postgres), que e o
-- papel do SQL Editor. O efeito seria um UPDATE manual em nfe_settings
-- afetando 0 linhas SEM erro — o pior modo de falha. E contra quem tenha
-- credencial de owner, FORCE nao protege (owner pode DISABLE RLS).

-- =====================================================
-- 3. Revoga GRANT de tabela (fecha a lacuna de `authenticated`)
-- =====================================================
-- Este e o bloco que agrega seguranca de verdade nesta migration. A sonda
-- provou que `anon` toma 42501; `authenticated` nao foi medido. O REVOKE
-- explicita os dois papeis, entao nao depende de qual deles tinha GRANT.
REVOKE ALL ON public.nfe_settings FROM anon, authenticated;

-- =====================================================
-- 4. VERIFICACAO (rode junto e confira a saida)
-- =====================================================
-- Esperado, nas 5 linhas (nfe_settings + os 4 controles):
--   rls_habilitado            = true
--   rls_forcado               = false  (proposital, ver bloco 2)
--   policies                  = 0
--   privilegios_anon          = 0
--   privilegios_authenticated = 0
-- store_settings pode aparecer com privilegios > 0: ela nasceu com RLS ligado
-- e zero policies e nao e alvo desta migration. Se aparecer, e informativo.
SELECT
  c.relname                                             AS tabela,
  c.relrowsecurity                                      AS rls_habilitado,
  c.relforcerowsecurity                                 AS rls_forcado,
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
  AND c.relname IN ('nfe_settings', 'store_settings',
                    'payment_settings', 'shipping_settings', 'shipping_tags')
ORDER BY c.relname;
