-- Tabela de configuracoes de pagamento (singleton: sempre id=1)
create table if not exists payment_settings (
  id integer primary key default 1 check (id = 1),
  mp_public_key text,
  mp_access_token text,
  mp_sandbox boolean not null default true,
  min_installments integer not null default 1,
  max_installments integer not null default 12,
  free_installments integer not null default 3,
  enabled_methods text[] not null default array['pix', 'credit_card', 'boleto'],
  updated_at timestamptz not null default now()
);

-- Ja cria o unico registro; o resto das colunas NULL significa "nao configurado"
insert into payment_settings (id) values (1) on conflict (id) do nothing;

alter table payment_settings enable row level security;

-- so admin pode ler/escrever
create policy "admin_all_payment_settings"
  on payment_settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');