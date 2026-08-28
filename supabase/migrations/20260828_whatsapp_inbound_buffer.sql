-- Migration para buffer de mensagens recebidas do WhatsApp/Zernio
-- Objetivo: agrupar rajadas de mensagens do mesmo telefone em uma única chamada ao modelo

-- Tabela principal: buffer de mensagens recebidas
create table if not exists public.whatsapp_inbound_buffer (
  id bigint generated always as identity primary key,
  phone text not null,
  message_id text not null unique,
  body text not null,
  message_ts timestamptz not null default now(),
  processed_at timestamptz null,
  created_at timestamptz not null default now()
);

-- Índice para busca rápida por telefone
create index if not exists idx_whatsapp_inbound_buffer_phone on public.whatsapp_inbound_buffer(phone);

-- Índice para busca do worker: flush_at <= now() e processing_since null
create index if not exists idx_whatsapp_flush_state_flush_at on public.whatsapp_flush_state(flush_at);

-- Índice para garantir unicidade de message_id (idempotência)
create unique index if not exists idx_whatsapp_inbound_buffer_message_id on public.whatsapp_inbound_buffer(message_id);

-- Tabela de estado por telefone: controla quando processar
create table if not exists public.whatsapp_flush_state (
  phone text primary key,
  flush_at timestamptz not null,
  processing_since timestamptz null,
  created_at timestamptz not null default now()
);

-- Função para atualizar flush_at com teto de 40s
create or replace function public.update_flush_at(phone text)
returns timestamptz as $$
declare
  current_flush timestamptz;
  earliest_unprocessed timestamptz;
  new_flush timestamptz;
  max_flush timestamptz;
begin
  -- Busca o flush_at atual
  select flush_at into current_flush from public.whatsapp_flush_state where phone = update_flush_at.phone;

  -- Busca a mensagem não processada mais antiga deste telefone
  select min(message_ts) into earliest_unprocessed
  from public.whatsapp_inbound_buffer
  where phone = update_flush_at.phone and processed_at is null;

  if earliest_unprocessed is null then
    -- Sem mensagens não processadas, mantém o flush_at atual ou define para now() + 10s
    if current_flush is null then
      new_flush := now() + interval '10 seconds';
    else
      new_flush := current_flush;
    end if;
  else
    -- Calcula novo flush_at: now() + 10s, mas não ultrapassa earliest_unprocessed + 40s
    new_flush := now() + interval '10 seconds';
    max_flush := earliest_unprocessed + interval '40 seconds';

    if new_flush > max_flush then
      new_flush := max_flush;
    end if;
  end if;

  -- Atualiza ou insere o estado
  insert into public.whatsapp_flush_state (phone, flush_at, processing_since)
  values (update_flush_at.phone, new_flush, null)
  on conflict (phone) do update
  set flush_at = excluded.flush_at;

  return new_flush;
end;
$$ language plpgsql;

-- Grant de permissões para o papel authenticated (RLS)
-- Permite que a função de processamento leia e escreva nas tabelas
alter table public.whatsapp_inbound_buffer enable row level security;

create policy "Allow authenticated users to insert into whatsapp_inbound_buffer"
  on public.whatsapp_inbound_buffer
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated users to select from whatsapp_inbound_buffer"
  on public.whatsapp_inbound_buffer
  for select
  to authenticated
  using (true);

create policy "Allow authenticated users to update whatsapp_inbound_buffer"
  on public.whatsapp_inbound_buffer
  for update
  to authenticated
  with check (true);

alter table public.whatsapp_flush_state enable row level security;

create policy "Allow authenticated users to insert/update whatsapp_flush_state"
  on public.whatsapp_flush_state
  for all
  to authenticated
  with check (true);

comment on table public.whatsapp_inbound_buffer is 'Buffer de mensagens recebidas do WhatsApp/Zernio antes de processamento em lote.';
comment on table public.whatsapp_flush_state is 'Estado de processamento por telefone para controle de rajadas.';
