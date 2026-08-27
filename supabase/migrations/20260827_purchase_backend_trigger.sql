-- Migration para registrar PURCHASE_COMPLETED no backend a partir de public.orders e public.order_items
-- Data: 2026-08-27

-- 1. Garantir constraint de idempotência única por pedido e tipo de evento purchase
alter table public.website_events
  add column if not exists order_id uuid references public.orders(id) on delete set NULL;

-- Criar índice para order_id
create index if not exists idx_website_events_order_id on public.website_events(order_id);

-- Criar índice único parcial para garantir 1 único evento de purchase por pedido (idempotência absoluta)
create unique index if not exists idx_unique_order_purchase_event
  on public.website_events(order_id)
  where event_type = 'purchase';

-- 2. Função de backend para registrar o purchase oficial usando dados de public.orders e public.order_items
create or replace function public.record_purchase_event(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_order record;
  v_session_id uuid;
  v_anonymous_user_id uuid;
  v_customer_id uuid;
  v_source text;
  v_medium text;
  v_campaign text;
  v_content text;
  v_term text;
  v_device_type text;
  v_items jsonb;
  v_total_revenue numeric(12,2);
  v_total_quantity integer;
begin
  -- Verificar se o pedido existe e está pago/aprovado
  select * into v_order
  from public.orders
  where id = p_order_id
    and (payment_status = 'approved' or status in ('paid', 'processing', 'shipped', 'delivered'));

  if not found then
    return; -- Pedido não existe ou não está aprovado/pago
  end if;

  -- Verificar se já existe evento de purchase para este pedido (idempotência)
  if exists (select 1 from public.website_events where order_id = p_order_id and event_type = 'purchase') then
    return;
  end if;

  -- Buscar dados de sessão associados ao cliente ou via sessões recentes
  select session_id, anonymous_user_id, source, medium, campaign, content, term, device_type
  into v_session_id, v_anonymous_user_id, v_source, v_medium, v_campaign, v_content, v_term, v_device_type
  from public.website_sessions
  where customer_id = v_order.customer_id
     or order_id = p_order_id
  order by started_at desc
  limit 1;

  -- Se não encontrar sessão, usar defaults anônimos seguros
  if v_session_id is null then
    v_session_id := gen_random_uuid();
  end if;
  if v_anonymous_user_id is null then
    v_anonymous_user_id := gen_random_uuid();
  end if;

  -- Obter itens reais do pedido de public.order_items
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'product_id', oi.product_id,
      'sku', oi.sku,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'revenue', oi.total_price
    )), '[]'::jsonb),
    coalesce(sum(oi.total_price), 0),
    coalesce(sum(oi.quantity), 0)
  into v_items, v_total_revenue, v_total_quantity
  from public.order_items oi
  where oi.order_id = p_order_id;

  -- Inserir evento de purchase oficial usando exclusivamente dados do banco
  insert into public.website_events (
    session_id,
    anonymous_user_id,
    customer_id,
    order_id,
    event_type,
    source,
    medium,
    campaign,
    content,
    term,
    device_type,
    page_url,
    metadata
  )
  values (
    v_session_id,
    v_anonymous_user_id,
    v_order.customer_id,
    p_order_id,
    'purchase',
    v_source,
    v_medium,
    v_campaign,
    v_content,
    v_term,
    coalesce(v_device_type, 'desktop'),
    '/checkout/sucesso',
    jsonb_build_object(
      'order_id', p_order_id,
      'order_number', v_order.order_number,
      'revenue', coalesce(v_order.total, v_total_revenue),
      'subtotal', v_order.subtotal,
      'discount', v_order.discount_amount,
      'shipping', v_order.shipping_cost,
      'net_revenue', coalesce(v_order.total, v_total_revenue) - coalesce(v_order.shipping_cost, 0),
      'items_count', v_total_quantity,
      'items', v_items,
      'timestamp', now()
    )
  )
  on conflict (order_id) where event_type = 'purchase' do nothing;

  -- Marcar sessão como convertida se existir
  update public.website_sessions
  set converted = true, order_id = p_order_id
  where id = v_session_id;

end;
$$;

-- 3. Trigger automático em orders para disparar o purchase quando o pagamento for aprovado / pedido pago
create or replace function public.trigger_record_purchase_on_order_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if (NEW.payment_status = 'approved' or NEW.status in ('paid', 'processing', 'shipped', 'delivered'))
     and (OLD.payment_status is distinct from NEW.payment_status or OLD.status is distinct from NEW.status) then
    perform public.record_purchase_event(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists tr_record_purchase_on_order on public.orders;
create trigger tr_record_purchase_on_order
  after insert or update on public.orders
  for each row
  execute function public.trigger_record_purchase_on_order_update();
