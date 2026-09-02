-- Fran recomenda - tabela de curadoria de produtos pela consultora Fran
-- Tabela NOVA e aditiva: não altera nem remove nenhum objeto existente.
-- Padrão de segurança igual ao de nfe_settings / payment_settings:
-- RLS ligada, ZERO policies, acesso exclusivamente por service role via server fn.

create table if not exists public.fran_recomenda (
  id          uuid primary key default gen_random_uuid(),
  produto_id  text not null,
  selo        text,              -- "Fran indica", "Fran usa", "Fran ama"
  frase       text,              -- a recomendação, curta
  ordem       int not null default 0,
  ativo       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_fran_recomenda_ativo_ordem
  on public.fran_recomenda (ativo, ordem);

-- Função de updated_at com nome PRÓPRIO desta tabela, de propósito.
-- Um nome genérico como set_updated_at() com CREATE OR REPLACE sobrescreveria
-- silenciosamente a função de mesmo nome usada por triggers de outras tabelas.
create or replace function public.set_fran_recomenda_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fran_recomenda_updated_at on public.fran_recomenda;
create trigger trg_fran_recomenda_updated_at
  before update on public.fran_recomenda
  for each row
  execute function public.set_fran_recomenda_updated_at();

-- ==================================================
-- Segurança
-- ==================================================
-- RLS ligada e NENHUMA policy criada, de propósito. Sem policy, ninguém passa
-- pela RLS — e o service role a ignora por definição, então a leitura pública
-- da vitrine acontece pela server fn, que aplica a whitelist de colunas.
-- Policy de "public read" aqui seria letra morta (os privilégios estão revogados)
-- e, pior, faria uma auditoria futura ler a tabela como publicamente legível.
alter table public.fran_recomenda enable row level security;

revoke all on public.fran_recomenda from anon, authenticated;

-- ==================================================
-- Verificação — rodar junto e conferir cada resultado
-- ==================================================

-- 1) RLS precisa vir true
select relrowsecurity as rls_ligada
from pg_class
where oid = 'public.fran_recomenda'::regclass;

-- 2) Contagem de policies precisa vir 0
select count(*) as qtd_policies
from pg_policies
where schemaname = 'public' and tablename = 'fran_recomenda';

-- 3) Não pode aparecer anon nem authenticated nesta lista
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'fran_recomenda'
order by grantee, privilege_type;

-- 4) Colunas criadas — conferir que selo e frase estão presentes
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'fran_recomenda'
order by ordinal_position;

-- 5) Tabela recém-criada, precisa vir 0
select count(*) as linhas from public.fran_recomenda;