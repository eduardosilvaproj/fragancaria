-- Migration para tabelas de marketing para integração com Marketing HQ
-- Data: 2026-08-27

-- Tabela para eventos do site
create table if not exists public.website_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  anonymous_user_id uuid not null,
  customer_id uuid,
  event_type text not null,
  product_id uuid,
  sku text,
  source text,
  medium text,
  campaign text,
  content text,
  term text,
  device_type text,
  page_url text,
  referrer text,
  metadata jsonb,
  created_at timestamp with time zone default now() not null
);

-- Índice para buscas por sessão
create index if not exists idx_website_events_session_id on public.website_events(session_id);

-- Índice para buscas por usuário anônimo
create index if not exists idx_website_events_anonymous_user_id on public.website_events(anonymous_user_id);

-- Índice para buscas por cliente
create index if not exists idx_website_events_customer_id on public.website_events(customer_id);

-- Índice para buscas por tipo de evento
create index if not exists idx_website_events_event_type on public.website_events(event_type);

-- Índice para buscas por data
create index if not exists idx_website_events_created_at on public.website_events(created_at);

-- Tabela para sessões
create table if not exists public.website_sessions (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id uuid not null,
  customer_id uuid,
  started_at timestamp with time zone default now() not null,
  ended_at timestamp with time zone,
  landing_page text,
  source text,
  medium text,
  campaign text,
  device_type text,
  converted boolean default false,
  order_id uuid
);

-- Índice para buscas por usuário anônimo
create index if not exists idx_website_sessions_anonymous_user_id on public.website_sessions(anonymous_user_id);

-- Índice para buscas por cliente
create index if not exists idx_website_sessions_customer_id on public.website_sessions(customer_id);

-- Índice para buscas por data
create index if not exists idx_website_sessions_started_at on public.website_sessions(started_at);

-- Tabela para métricas diárias de produtos
create table if not exists public.website_product_metrics_daily (
  date date primary key,
  product_id uuid,
  sku text,
  sessions bigint default 0,
  product_views bigint default 0,
  add_to_cart bigint default 0,
  checkout_started bigint default 0,
  purchases bigint default 0,
  units_sold bigint default 0,
  revenue numeric(12, 2) default 0,
  conversion_rate numeric(5, 2) default 0,
  cart_abandonment_rate numeric(5, 2) default 0
);

-- Índice para buscas por data
create index if not exists idx_product_metrics_daily_date on public.website_product_metrics_daily(date);

-- Índice para buscas por produto
create index if not exists idx_product_metrics_daily_product_id on public.website_product_metrics_daily(product_id);

-- View para resumo do site para Marketing HQ
create or replace view public.hq_website_summary as
select
  count(distinct session_id) as total_sessions,
  count(distinct case when customer_id is not null then customer_id end) as total_customers,
  count(*) filter (where event_type = 'page_view') as total_page_views,
  count(*) filter (where event_type = 'product_view') as product_views,
  count(*) filter (where event_type = 'add_to_cart') as add_to_cart,
  count(*) filter (where event_type = 'checkout_start') as checkout_started,
  count(*) filter (where event_type = 'purchase') as purchases,
  sum(case when event_type = 'purchase' and metadata->>'revenue' is not null then (metadata->>'revenue')::numeric else 0 end) as revenue,
  max(created_at) as last_event_at
from public.website_events;

-- View para métricas de produtos para Marketing HQ
create or replace view public.hq_product_metrics as
select
  p.id as product_id,
  p.title as product_name,
  p.sku as product_sku,
  count(*) filter (where we.event_type = 'product_view') as views,
  count(*) filter (where we.event_type = 'add_to_cart') as add_to_cart,
  count(*) filter (where we.event_type = 'purchase') as purchases,
  sum(case when we.event_type = 'purchase' and we.metadata->>'quantity' is not null then (we.metadata->>'quantity')::int else 0 end) as units_sold,
  sum(case when we.event_type = 'purchase' and we.metadata->>'revenue' is not null then (we.metadata->>'revenue')::numeric else 0 end) as revenue
from public.products p
left join public.website_events we on p.id = we.product_id
where we.created_at >= now() - interval '90 days'
group by p.id, p.title, p.sku
order by revenue desc;

-- View para vendas diárias para Marketing HQ
create or replace view public.hq_sales_daily as
select
  date_trunc('day', o.created_at)::date as date,
  count(*) as orders,
  sum(o.total) as gross_revenue,
  sum(o.discount) as total_discount,
  sum(o.total - o.discount) as net_revenue,
  sum(o.shipping) as shipping_revenue,
  count(distinct oi.product_id) as unique_products,
  sum(oi.quantity) as units_sold
from public.orders o
join public.order_items oi on o.id = oi.order_id
where o.created_at >= now() - interval '90 days'
group by date_trunc('day', o.created_at)::date
order by date;

-- View para fontes de tráfego para Marketing HQ
create or replace view public.hq_traffic_sources as
select
  source,
  medium,
  campaign,
  count(distinct session_id) as sessions,
  count(*) filter (where event_type = 'page_view') as page_views,
  count(*) filter (where event_type = 'product_view') as product_views,
  count(*) filter (where event_type = 'add_to_cart') as add_to_cart,
  count(*) filter (where event_type = 'checkout_start') as checkout_started,
  count(*) filter (where event_type = 'purchase') as purchases,
  sum(case when event_type = 'purchase' and metadata->>'revenue' is not null then (metadata->>'revenue')::numeric else 0 end) as revenue
from public.website_events
where source is not null
and created_at >= now() - interval '90 days'
group by source, medium, campaign
order by sessions desc;

-- Função para obter snapshot de marketing
create or replace function public.get_marketing_hq_snapshot(
  start_date_param date default (now() - interval '30 days')::date,
  end_date_param date default now()::date,
  sku_param text default null
)
returns table (
  period text,
  sessions bigint,
  product_views bigint,
  add_to_cart bigint,
  checkout_started bigint,
  purchases bigint,
  revenue numeric(12, 2),
  conversion numeric(5, 2),
  top_products jsonb,
  traffic_sources jsonb,
  product_metrics jsonb,
  generated_at timestamp with time zone
)
language sql
as $$
  select
    'custom' as period,
    count(distinct session_id) as sessions,
    count(*) filter (where event_type = 'product_view') as product_views,
    count(*) filter (where event_type = 'add_to_cart') as add_to_cart,
    count(*) filter (where event_type = 'checkout_start') as checkout_started,
    count(*) filter (where event_type = 'purchase') as purchases,
    sum(case when event_type = 'purchase' and metadata->>'revenue' is not null then (metadata->>'revenue')::numeric else 0 end) as revenue,
    case when count(*) filter (where event_type = 'product_view') > 0 then
      (count(*) filter (where event_type = 'purchase')::numeric / count(*) filter (where event_type = 'product_view')::numeric) * 100
    else 0 end as conversion,
    (
      select jsonb_agg(jsonb_build_object(
        'product_id', product_id,
        'product_name', product_name,
        'views', views,
        'purchases', purchases,
        'revenue', revenue
      ))
      from (
        select
          p.id as product_id,
          p.title as product_name,
          count(*) filter (where we.event_type = 'product_view') as views,
          count(*) filter (where we.event_type = 'purchase') as purchases,
          sum(case when we.event_type = 'purchase' and we.metadata->>'revenue' is not null then (we.metadata->>'revenue')::numeric else 0 end) as revenue
        from public.products p
        left join public.website_events we on p.id = we.product_id
        where we.created_at between start_date_param and end_date_param
        and (sku_param is null or p.sku = sku_param)
        group by p.id, p.title
        order by revenue desc
        limit 10
      ) as top_products
    ) as top_products,
    (
      select jsonb_agg(jsonb_build_object(
        'source', source,
        'medium', medium,
        'sessions', sessions,
        'revenue', revenue
      ))
      from (
        select
          source,
          medium,
          count(distinct session_id) as sessions,
          sum(case when event_type = 'purchase' and metadata->>'revenue' is not null then (metadata->>'revenue')::numeric else 0 end) as revenue
        from public.website_events
        where created_at between start_date_param and end_date_param
        group by source, medium
        order by sessions desc
        limit 10
      ) as traffic_sources
    ) as traffic_sources,
    (
      select jsonb_agg(jsonb_build_object(
        'product_id', product_id,
        'product_name', product_name,
        'views', views,
        'add_to_cart', add_to_cart,
        'purchases', purchases,
        'revenue', revenue
      ))
      from (
        select
          p.id as product_id,
          p.title as product_name,
          count(*) filter (where we.event_type = 'product_view') as views,
          count(*) filter (where we.event_type = 'add_to_cart') as add_to_cart,
          count(*) filter (where we.event_type = 'purchase') as purchases,
          sum(case when we.event_type = 'purchase' and we.metadata->>'revenue' is not null then (we.metadata->>'revenue')::numeric else 0 end) as revenue
        from public.products p
        left join public.website_events we on p.id = we.product_id
        where we.created_at between start_date_param and end_date_param
        and (sku_param is null or p.sku = sku_param)
        group by p.id, p.title
        order by revenue desc
      ) as product_metrics
    ) as product_metrics,
    now() as generated_at
  from public.website_events
  where created_at between start_date_param and end_date_param
  and (sku_param is null or product_id in (select id from public.products where sku = sku_param));
$$;

-- Função para atualizar ID do cliente na sessão
create or replace function public.update_customer_in_session(
  p_session_id uuid,
  p_customer_id uuid
)
returns void
language sql
security definer
as $$
  update public.website_sessions
  set customer_id = p_customer_id
  where id = p_session_id;

  update public.website_events
  set customer_id = p_customer_id
  where session_id = p_session_id;
$$;

-- Permissões RLS para as tabelas de marketing
-- Permitir leitura para role authenticated (Marketing HQ)
alter table public.website_events enable row level security;

create policy "Enable read access for authenticated users on website_events"
  on public.website_events
  for select
  using (true);

alter table public.website_sessions enable row level security;

create policy "Enable read access for authenticated users on website_sessions"
  on public.website_sessions
  for select
  using (true);

alter table public.website_product_metrics_daily enable row level security;

create policy "Enable read access for authenticated users on website_product_metrics_daily"
  on public.website_product_metrics_daily
  for select
  using (true);

-- Permitir leitura nas views para role authenticated
alter view public.hq_website_summary enable row level security;

create policy "Enable read access for authenticated users on hq_website_summary"
  on public.hq_website_summary
  for select
  using (true);

alter view public.hq_product_metrics enable row level security;

create policy "Enable read access for authenticated users on hq_product_metrics"
  on public.hq_product_metrics
  for select
  using (true);

alter view public.hq_sales_daily enable row level security;

create policy "Enable read access for authenticated users on hq_sales_daily"
  on public.hq_sales_daily
  for select
  using (true);

alter view public.hq_traffic_sources enable row level security;

create policy "Enable read access for authenticated users on hq_traffic_sources"
  on public.hq_traffic_sources
  for select
  using (true);

-- Permitir execução da função para role authenticated
alter function public.get_marketing_hq_snapshot(start_date_param date, end_date_param date, sku_param text)
  security definer
  set search_path = public;

create policy "Enable execute access for authenticated users on get_marketing_hq_snapshot"
  on public.get_marketing_hq_snapshot
  for execute
  using (true);

-- Função para normalizar source
create or replace function public.normalize_utm_source(source text)
returns text
language sql
as $$
  select
    case
      when lower(source) like '%google%' then 'google'
      when lower(source) like '%meta%' or lower(source) like '%facebook%' or lower(source) like '%instagram%' then 'meta'
      when lower(source) like '%tiktok%' then 'tiktok'
      when lower(source) like '%direct%' or source is null then 'direct'
      when lower(source) like '%organic%' then 'organic'
      when lower(source) like '%email%' then 'email'
      when lower(source) like '%affiliate%' then 'affiliate'
      else 'other'
    end;
$$;

-- Função para registrar evento
create or replace function public.track_event(
  p_session_id uuid,
  p_anonymous_user_id uuid,
  p_customer_id uuid,
  p_event_type text,
  p_product_id uuid,
  p_sku text,
  p_source text,
  p_medium text,
  p_campaign text,
  p_content text,
  p_term text,
  p_device_type text,
  p_page_url text,
  p_referrer text,
  p_metadata jsonb
)
returns void
language sql
security definer
as $$
  insert into public.website_events (
    session_id,
    anonymous_user_id,
    customer_id,
    event_type,
    product_id,
    sku,
    source,
    medium,
    campaign,
    content,
    term,
    device_type,
    page_url,
    referrer,
    metadata
  )
  values (
    p_session_id,
    p_anonymous_user_id,
    p_customer_id,
    p_event_type,
    p_product_id,
    p_sku,
    public.normalize_utm_source(p_source),
    p_medium,
    p_campaign,
    p_content,
    p_term,
    p_device_type,
    p_page_url,
    p_referrer,
    p_metadata
  );
$$;

-- Função para registrar sessão
create or replace function public.track_session_start(
  p_anonymous_user_id uuid,
  p_customer_id uuid,
  p_landing_page text,
  p_source text,
  p_medium text,
  p_campaign text,
  p_device_type text
)
returns uuid
language sql
security definer
as $$
  insert into public.website_sessions (
    anonymous_user_id,
    customer_id,
    landing_page,
    source,
    medium,
    campaign,
    device_type
  )
  values (
    p_anonymous_user_id,
    p_customer_id,
    p_landing_page,
    public.normalize_utm_source(p_source),
    p_medium,
    p_campaign,
    p_device_type
  )
  returning id;
$$;

-- Função para atualizar sessão
create or replace function public.update_session_end(
  p_session_id uuid,
  p_converted boolean,
  p_order_id uuid
)
returns void
language sql
security definer
as $$
  update public.website_sessions
  set
    ended_at = now(),
    converted = p_converted,
    order_id = p_order_id
  where id = p_session_id;
$$;

-- Função para calcular métricas diárias
create or replace function public.calculate_daily_metrics()
returns void
language plpgsql
security definer
as $$
begin
  -- Calcular métricas para os últimos 90 dias
  perform public.calculate_daily_metrics_for_date((now() - interval '90 days')::date, now()::date);
end;
$$;

-- Função para calcular métricas para um período específico
create or replace function public.calculate_daily_metrics_for_date(
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
security definer
as $$
declare
  current_date date;
  total_sessions bigint;
  total_product_views bigint;
  total_add_to_cart bigint;
  total_checkout_started bigint;
  total_purchases bigint;
  total_units_sold bigint;
  total_revenue numeric(12, 2);
begin
  current_date := p_start_date;

  while current_date <= p_end_date loop
    -- Calcular métricas para o dia atual
    select
      count(distinct session_id),
      count(*) filter (where event_type = 'product_view'),
      count(*) filter (where event_type = 'add_to_cart'),
      count(*) filter (where event_type = 'checkout_start'),
      count(*) filter (where event_type = 'purchase'),
      sum(case when event_type = 'purchase' and metadata->>'quantity' is not null then (metadata->>'quantity')::int else 0 end),
      sum(case when event_type = 'purchase' and metadata->>'revenue' is not null then (metadata->>'revenue')::numeric else 0 end)
    into
      total_sessions,
      total_product_views,
      total_add_to_cart,
      total_checkout_started,
      total_purchases,
      total_units_sold,
      total_revenue
    from public.website_events
    where date_trunc('day', created_at) = current_date;

    -- Atualizar ou inserir métricas
    insert into public.website_product_metrics_daily (
      date,
      sessions,
      product_views,
      add_to_cart,
      checkout_started,
      purchases,
      units_sold,
      revenue
    )
    values (
      current_date,
      total_sessions,
      total_product_views,
      total_add_to_cart,
      total_checkout_started,
      total_purchases,
      total_units_sold,
      total_revenue
    )
    on conflict (date)
    do update set
      sessions = excluded.sessions,
      product_views = excluded.product_views,
      add_to_cart = excluded.add_to_cart,
      checkout_started = excluded.checkout_started,
      purchases = excluded.purchases,
      units_sold = excluded.units_sold,
      revenue = excluded.revenue;

    current_date := current_date + interval '1 day';
  end loop;
end;
$$;
