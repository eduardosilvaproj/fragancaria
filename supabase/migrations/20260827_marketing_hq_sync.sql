-- Migration para solicitações de sincronização e storage bucket
-- Data: 2026-08-27

-- Tabela para solicitações de sincronização com Marketing HQ
create table if not exists public.marketing_hq_sync_requests (
  id uuid primary key default gen_random_uuid(),
  requested_at timestamp with time zone default now() not null,
  status text not null default 'pending',
  completed_at timestamp with time zone,
  metadata jsonb
);

-- Índice para buscas por data
create index if not exists idx_marketing_hq_sync_requests_requested_at on public.marketing_hq_sync_requests(requested_at);

-- Habilitar RLS
alter table public.marketing_hq_sync_requests enable row level security;

-- Política de leitura/escrita para authenticated users
create policy "Enable all access for authenticated users on marketing_hq_sync_requests"
  on public.marketing_hq_sync_requests
  for all
  using (true)
  with check (true);

-- Criar bucket para exportações de marketing (se não existir)
insert into storage.buckets (id, name, public)
values ('marketing-exports', 'marketing-exports', false)
on conflict (id) do nothing;

-- Política de storage para bucket marketing-exports
create policy "Enable upload and read for authenticated users on marketing-exports"
  on storage.objects
  for all
  using (bucket_id = 'marketing-exports')
  with check (bucket_id = 'marketing-exports');
