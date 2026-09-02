-- ============================================
-- Prateleira de Campanha - tabelas isoladas
-- ============================================
-- Tabelas NOVAS para a prateleira de campanha na home.
-- NÃO mexe em home_featured_manual (produção, intocável).
--
-- Modelo igual a site_banners: RLS ligada, ZERO policies, REVOKE de anon
-- e authenticated, acesso só por server fn com service_role.

-- ============================================
-- 1. Tabela principal: campanha (metadados)
-- ============================================
CREATE TABLE IF NOT EXISTS home_campanha (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  subtitulo     text,
  inicia_em     timestamptz NOT NULL,
  termina_em    timestamptz NOT NULL,
  ativo         boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índice para busca da campanha ativa (menor inicia_em dentro da janela)
CREATE INDEX IF NOT EXISTS idx_home_campanha_ativa
  ON home_campanha(inicia_em)
  WHERE ativo = true;

-- Função de updated_at específica para home_campanha
CREATE OR REPLACE FUNCTION update_home_campanha_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_home_campanha_updated_at ON home_campanha;
CREATE TRIGGER trg_home_campanha_updated_at
  BEFORE UPDATE ON home_campanha
  FOR EACH ROW
  EXECUTE FUNCTION update_home_campanha_updated_at_column();

-- ============================================
-- 2. Tabela de produtos da campanha (curadoria)
-- ============================================
CREATE TABLE IF NOT EXISTS home_campanha_produtos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id  uuid NOT NULL REFERENCES home_campanha(id) ON DELETE CASCADE,
  produto_id   text NOT NULL,
  ordem        integer NOT NULL DEFAULT 0
);

-- Índice para ordenação dos produtos dentro da campanha
CREATE INDEX IF NOT EXISTS idx_home_campanha_produtos_ordem
  ON home_campanha_produtos(campanha_id, ordem);

-- ============================================
-- 3. RLS: ligar, REVOKE total, ZERO policies
-- ============================================

-- home_campanha
ALTER TABLE home_campanha ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON home_campanha FROM anon, authenticated;

-- home_campanha_produtos
ALTER TABLE home_campanha_produtos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON home_campanha_produtos FROM anon, authenticated;

-- ============================================
-- 4. Bloco de verificação
-- ============================================
DO $$
DECLARE
  r record;
  policy_count bigint;
  grant_count bigint;
  rls_enabled boolean;
BEGIN
  -- Verifica RLS está ligado em home_campanha
  SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE oid = 'public.home_campanha'::regclass;

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS: home_campanha não tem RLS ligado';
  END IF;

  -- Verifica que anon e authenticated NÃO têm privilégios
  SELECT count(*) INTO grant_count
    FROM information_schema.table_privileges
    WHERE table_name = 'home_campanha'
      AND grantee IN ('anon', 'authenticated');

  IF grant_count > 0 THEN
    RAISE EXCEPTION 'RLS: anon ou authenticated ainda têm privilégios em home_campanha';
  END IF;

  -- Verifica ZERO policies em home_campanha
  SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'home_campanha';

  IF policy_count > 0 THEN
    RAISE EXCEPTION 'RLS: home_campanha tem % policies, esperado 0', policy_count;
  END IF;

  -- Mesmas verificações para home_campanha_produtos
  SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE oid = 'public.home_campanha_produtos'::regclass;

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS: home_campanha_produtos não tem RLS ligado';
  END IF;

  SELECT count(*) INTO grant_count
    FROM information_schema.table_privileges
    WHERE table_name = 'home_campanha_produtos'
      AND grantee IN ('anon', 'authenticated');

  IF grant_count > 0 THEN
    RAISE EXCEPTION 'RLS: anon ou authenticated ainda têm privilégios em home_campanha_produtos';
  END IF;

  SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'home_campanha_produtos';

  IF policy_count > 0 THEN
    RAISE EXCEPTION 'RLS: home_campanha_produtos tem % policies, esperado 0', policy_count;
  END IF;

  RAISE NOTICE 'Verificação OK: RLS ligado, ZERO policies, anon/authenticated revogados em ambas as tabelas';
END $$;
