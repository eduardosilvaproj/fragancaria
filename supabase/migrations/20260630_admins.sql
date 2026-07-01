-- Migration: tabela admins — controla quem tem acesso ao painel /admin
--
-- Contexto: o /admin não tinha autenticação (qualquer um acessava o painel,
-- via conversas de clientes e podia aprovar afiliados). Esta migration cria a
-- lista de administradores. A autenticação usa Supabase Auth (email+senha); um
-- usuário logado só é admin se o seu id estiver nesta tabela.
--
-- Acesso: leitura/escrita apenas via service role (supabaseAdmin), nunca pelo
-- cliente. RLS habilitado sem policies anon/authenticated.

CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admins TO service_role;

-- Sem policies: apenas service role acessa.

-- Semeia os dois usuários auth existentes como admins.
-- Remova a linha que não deve ter acesso depois de confirmar o login.
INSERT INTO public.admins (user_id, email) VALUES
  ('ca3d9d68-c8f6-4466-9af6-e351563d3a5e', 'rabelli19@gmail.com'),
  ('cd2488d6-bffc-4409-b60e-c013daddcf6c', 'eduardosilva.proj@gmail.com')
ON CONFLICT (user_id) DO NOTHING;
