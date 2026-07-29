-- =====================================================
-- LOCKDOWN RLS: payment_settings + shipping_settings
-- =====================================================
-- PROBLEMA
-- As duas tabelas foram criadas em 2026-07-12 com policies do tipo
--   USING (auth.role() = 'authenticated')
-- (payment_settings: "admin_all_payment_settings";
--  shipping_settings: "Admin manage shipping settings")
-- O nome diz "admin", o predicado nao. `authenticated` e QUALQUER usuario
-- logado — inclusive cliente comum da loja. Como a anon key vai no bundle do
-- browser, um cliente autenticado poderia falar direto com o PostgREST e ler
-- ou escrever nessas configuracoes.
--
-- O QUE ESTA EXPOSTO (auditado em 2026-07-29, valores nao transcritos):
--   shipping_settings.sigep_credentials -> usuario + codigoAcesso PREENCHIDOS
--   shipping_settings.sender_info       -> CNPJ e endereco do remetente
--   payment_settings.mp_access_token    -> NULL (o token do Mercado Pago vive
--                                          em env var, nao no banco)
-- Ou seja: credencial real de verdade e a do SIGEP. O risco de ESCRITA, no
-- entanto, vale para as duas — mexer em free_shipping_threshold ou em
-- enabled_methods altera preco de frete e meio de pagamento da loja.
--
-- POR QUE E SEGURO TRANCAR (auditoria do repo, 2026-07-29)
-- Os 12 pontos que tocam essas tabelas estao TODOS em src/lib/*.functions.ts
-- e usam `supabaseAdmin` (service role, que bypassa RLS):
--   payments.functions.ts:868,911
--   shipping-settings.functions.ts:59,199,227
--   logistics.functions.ts:596,791,1062,1100,1138,1150
--   generate-order-label-core.ts:420 (recebe o client de fora; producao passa
--                                     supabaseAdmin)
-- Nenhum componente React, hook ou rota le essas tabelas com o client do
-- browser. Nada fora de src/ referencia as duas. Nao ha channel/realtime no
-- client, nem view ou function do Postgres lendo essas tabelas. Portanto
-- remover as policies nao tira acesso de ninguem que hoje funcione.
--
-- ESTE ARQUIVO NAO MEXE EM store_settings (20260728) — aquela ja nasceu com
-- RLS ligado e zero policies, que e o padrao replicado aqui.
-- =====================================================

-- =====================================================
-- 1. Remove TODAS as policies das duas tabelas
-- =====================================================
-- Loop em vez de DROP POLICY nominal de proposito: os nomes vieram das
-- migrations de 2026-07-12, mas o estado real de producao pode ter policy
-- renomeada ou acrescentada fora do repo (ja aconteceu neste projeto: ver a
-- descoberta de nome de CHECK em 20260727c). O loop trata o que existe DE
-- FATO, e e idempotente — rodar duas vezes nao da erro.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('payment_settings', 'shipping_settings')
  LOOP
    RAISE NOTICE 'Removendo policy "%" de %.%', r.policyname, r.schemaname, r.tablename;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- =====================================================
-- 2. Garante RLS ligado (sem policy = nega tudo)
-- =====================================================
-- Com RLS habilitado e ZERO policies, anon e authenticated nao leem nem
-- escrevem nada. service_role continua passando (bypassa RLS), que e como as
-- server fns acessam.
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

-- NAO usar FORCE ROW LEVEL SECURITY aqui, de proposito.
-- FORCE remove a isencao de RLS do DONO da tabela (postgres) — que e
-- justamente o papel usado pelo SQL Editor. O efeito seria: um UPDATE manual
-- em shipping_settings pelo SQL Editor afetaria 0 linhas SEM dar erro, que e o
-- pior modo de falha possivel. E contra um atacante que tenha credencial de
-- owner, FORCE nao protege nada (quem e owner pode simplesmente rodar
-- ALTER TABLE ... DISABLE ROW LEVEL SECURITY). Custo real, ganho nenhum.

-- =====================================================
-- 3. Revoga o GRANT de tabela (defesa em profundidade)
-- =====================================================
-- RLS sem policy ja basta para negar. O REVOKE e a segunda camada: se alguem
-- criar uma policy permissiva no futuro sem pensar, o GRANT ausente ainda
-- barra. Auditado em 2026-07-29: com a anon key e SEM login, shipping_settings
-- ja respondia "42501 permission denied" (nao tinha GRANT), enquanto
-- payment_settings respondia 0 linhas (tinha GRANT, e a RLS filtrava). Este
-- bloco iguala as duas no estado mais restrito.
REVOKE ALL ON public.payment_settings FROM anon, authenticated;
REVOKE ALL ON public.shipping_settings FROM anon, authenticated;

-- =====================================================
-- 4. Verificacao (rode junto e confira a saida)
-- =====================================================
-- Esperado nas DUAS linhas:
--   rls_habilitado             = true
--   rls_forcado                = false  (proposital, ver bloco 2)
--   policies                   = 0
--   privilegios_anon           = 0
--   privilegios_authenticated  = 0
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
  AND c.relname IN ('payment_settings', 'shipping_settings')
ORDER BY c.relname;
