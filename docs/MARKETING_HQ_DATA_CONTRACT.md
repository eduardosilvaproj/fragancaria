# Contrato de Dados - Marketing HQ

Este documento define a estrutura de dados e métodos de acesso para integração entre o site Fragranciaria e o Marketing HQ.

## Visão Geral

O fluxo de dados segue o padrão:
```
SITE → SUPABASE → MARKETING DATA → MARKETING HQ
```

## Tabelas Principais

### 1. website_events

Armazena todos os eventos de navegação e interação do site.

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| id | bigint | ID auto-incremental | ✓ |
| session_id | uuid | ID da sessão | ✓ |
| anonymous_user_id | uuid | ID do usuário anônimo | ✓ |
| customer_id | uuid | ID do cliente (se autenticado) | ✗ |
| event_type | text | Tipo de evento (page_view, product_view, etc.) | ✓ |
| product_id | uuid | ID do produto (quando aplicável) | ✗ |
| sku | text | SKU do produto (quando aplicável) | ✗ |
| source | text | Fonte de tráfego (normalizada) | ✗ |
| medium | text | Meio de tráfego | ✗ |
| campaign | text | Campanha | ✗ |
| content | text | Conteúdo da campanha | ✗ |
| term | text | Termo de busca | ✗ |
| device_type | text | Tipo de dispositivo | ✗ |
| page_url | text | URL da página | ✗ |
| referrer | text | URL de referência | ✗ |
| metadata | jsonb | Metadados adicionais | ✗ |
| created_at | timestamp | Data de criação | ✓ |

**Tipos de evento:**
- `page_view` - Visualização de página
- `product_view` - Visualização de produto
- `search` - Busca realizada
- `add_to_cart` - Adição ao carrinho
- `remove_from_cart` - Remoção do carrinho
- `checkout_start` - Início de checkout
- `purchase` - Compra realizada

### 2. website_sessions

Armazena informações sobre sessões de usuário.

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| id | uuid | ID da sessão | ✓ |
| anonymous_user_id | uuid | ID do usuário anônimo | ✓ |
| customer_id | uuid | ID do cliente (se autenticado) | ✗ |
| started_at | timestamp | Data de início | ✓ |
| ended_at | timestamp | Data de término | ✗ |
| landing_page | text | Página de entrada | ✗ |
| source | text | Fonte de tráfego | ✗ |
| medium | text | Meio de tráfego | ✗ |
| campaign | text | Campanha | ✗ |
| device_type | text | Tipo de dispositivo | ✗ |
| converted | boolean | Se converteu em compra | ✗ |
| order_id | uuid | ID do pedido (se convertido) | ✗ |

### 3. website_product_metrics_daily

Armazena métricas diárias agregadas por produto.

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| date | date | Data | ✓ |
| product_id | uuid | ID do produto | ✗ |
| sku | text | SKU do produto | ✗ |
| sessions | bigint | Número de sessões | ✗ |
| product_views | bigint | Visualizações de produto | ✗ |
| add_to_cart | bigint | Adições ao carrinho | ✗ |
| checkout_started | bigint | Inícios de checkout | ✗ |
| purchases | bigint | Compras | ✗ |
| units_sold | bigint | Unidades vendidas | ✗ |
| revenue | numeric(12,2) | Receita | ✗ |
| conversion_rate | numeric(5,2) | Taxa de conversão (%) | ✗ |
| cart_abandonment_rate | numeric(5,2) | Taxa de abandono de carrinho (%) | ✗ |

## Views para Marketing HQ

### hq_website_summary

Resumo geral do site.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| total_sessions | bigint | Total de sessões |
| total_customers | bigint | Total de clientes autenticados |
| total_page_views | bigint | Total de visualizações de página |
| product_views | bigint | Total de visualizações de produto |
| add_to_cart | bigint | Total de adições ao carrinho |
| checkout_started | bigint | Total de inícios de checkout |
| purchases | bigint | Total de compras |
| revenue | numeric(12,2) | Receita total |
| last_event_at | timestamp | Data do último evento |

### hq_product_metrics

Métricas de produtos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| product_id | uuid | ID do produto |
| product_name | text | Nome do produto |
| product_sku | text | SKU do produto |
| views | bigint | Visualizações |
| add_to_cart | bigint | Adições ao carrinho |
| purchases | bigint | Compras |
| units_sold | bigint | Unidades vendidas |
| revenue | numeric(12,2) | Receita |

### hq_sales_daily

Vendas diárias.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| date | date | Data |
| orders | bigint | Número de pedidos |
| gross_revenue | numeric(12,2) | Receita bruta |
| total_discount | numeric(12,2) | Total de descontos |
| net_revenue | numeric(12,2) | Receita líquida |
| shipping_revenue | numeric(12,2) | Receita com frete |
| unique_products | bigint | Produtos únicos |
| units_sold | bigint | Unidades vendidas |

### hq_traffic_sources

Fontes de tráfego.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| source | text | Fonte |
| medium | text | Meio |
| campaign | text | Campanha |
| sessions | bigint | Sessões |
| page_views | bigint | Visualizações de página |
| product_views | bigint | Visualizações de produto |
| add_to_cart | bigint | Adições ao carrinho |
| checkout_started | bigint | Inícios de checkout |
| purchases | bigint | Compras |
| revenue | numeric(12,2) | Receita |

## Funções Disponíveis

### get_marketing_hq_snapshot

Retorna um snapshot completo dos dados de marketing.

**Parâmetros:**
- `start_date_param` (date, default: now() - 30 days) - Data inicial
- `end_date_param` (date, default: now()) - Data final
- `sku_param` (text, default: null) - SKU específico para filtrar

**Retorno:**
```json
{
  "period": "custom",
  "sessions": 1234,
  "product_views": 5678,
  "add_to_cart": 901,
  "checkout_started": 234,
  "purchases": 156,
  "revenue": 12345.67,
  "conversion": 12.5,
  "top_products": [
    {
      "product_id": "...",
      "product_name": "...",
      "views": 123,
      "purchases": 45,
      "revenue": 6789.01
    }
  ],
  "traffic_sources": [
    {
      "source": "google",
      "medium": "cpc",
      "sessions": 456,
      "revenue": 7890.12
    }
  ],
  "product_metrics": [
    {
      "product_id": "...",
      "product_name": "...",
      "views": 123,
      "add_to_cart": 45,
      "purchases": 67,
      "revenue": 8901.23
    }
  ],
  "generated_at": "2026-08-27T12:00:00Z"
}
```

**Exemplo de chamada:**
```sql
select * from public.get_marketing_hq_snapshot(
  start_date_param := '2026-08-01',
  end_date_param := '2026-08-31',
  sku_param := 'FRAG-001'
);
```

### track_event

Registra um evento no sistema.

**Parâmetros:**
- `p_session_id` (uuid) - ID da sessão
- `p_anonymous_user_id` (uuid) - ID do usuário anônimo
- `p_customer_id` (uuid) - ID do cliente (opcional)
- `p_event_type` (text) - Tipo de evento
- `p_product_id` (uuid) - ID do produto (opcional)
- `p_sku` (text) - SKU do produto (opcional)
- `p_source` (text) - Fonte de tráfego
- `p_medium` (text) - Meio de tráfego
- `p_campaign` (text) - Campanha
- `p_content` (text) - Conteúdo
- `p_term` (text) - Termo
- `p_device_type` (text) - Tipo de dispositivo
- `p_page_url` (text) - URL da página
- `p_referrer` (text) - URL de referência
- `p_metadata` (jsonb) - Metadados adicionais

**Exemplo de chamada:**
```sql
select public.track_event(
  p_session_id := 'a1b2c3d4-5678-90ef-ghij-klmnopqrstuv',
  p_anonymous_user_id := 'b2c3d4e5-6789-01fg-hijk-lmnopqrstuvw',
  p_customer_id := null,
  p_event_type := 'product_view',
  p_product_id := 'c3d4e5f6-7890-12gh-ijkl-mnopqrstuvwx',
  p_sku := 'FRAG-001',
  p_source := 'google',
  p_medium := 'cpc',
  p_campaign := 'summer-sale',
  p_content := null,
  p_term := null,
  p_device_type := 'desktop',
  p_page_url := '/produto/frag-001',
  p_referrer := 'https://google.com',
  p_metadata := '{"price": 99.99}'::jsonb
);
```

### track_session_start

Registra o início de uma sessão.

**Parâmetros:**
- `p_anonymous_user_id` (uuid) - ID do usuário anônimo
- `p_customer_id` (uuid) - ID do cliente (opcional)
- `p_landing_page` (text) - Página de entrada
- `p_source` (text) - Fonte de tráfego
- `p_medium` (text) - Meio de tráfego
- `p_campaign` (text) - Campanha
- `p_device_type` (text) - Tipo de dispositivo

**Retorno:** ID da sessão criada

**Exemplo de chamada:**
```sql
select public.track_session_start(
  p_anonymous_user_id := 'b2c3d4e5-6789-01fg-hijk-lmnopqrstuvw',
  p_customer_id := null,
  p_landing_page := '/',
  p_source := 'google',
  p_medium := 'cpc',
  p_campaign := 'summer-sale',
  p_device_type := 'desktop'
);
```

### update_session_end

Atualiza o fim de uma sessão.

**Parâmetros:**
- `p_session_id` (uuid) - ID da sessão
- `p_converted` (boolean) - Se converteu em compra
- `p_order_id` (uuid) - ID do pedido (opcional)

**Exemplo de chamada:**
```sql
select public.update_session_end(
  p_session_id := 'a1b2c3d4-5678-90ef-ghij-klmnopqrstuv',
  p_converted := true,
  p_order_id := 'd4e5f6g7-8901-23hi-jklm-nopqrstuvwxy'
);
```

## Autenticação e Acesso

### Permissões RLS

Todas as tabelas e views têm políticas RLS configuradas para permitir leitura para a role `authenticated`.

### Acesso do Marketing HQ

O Marketing HQ pode acessar os dados usando:

1. **Chave de API do Supabase** (recomendado para integração programática)
2. **Interface do Supabase** (para consultas manuais)
3. **Funções RPC** (para snapshots estruturados)

### Exemplo de consulta com JavaScript

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://seu-projeto.supabase.co'
const supabaseKey = 'sua-chave-publica'
const supabase = createClient(supabaseUrl, supabaseKey)

// Consultar resumo do site
const { data: summary, error } = await supabase
  .from('hq_website_summary')
  .select('*')
  .single()

// Consultar métricas de produtos
const { data: products, error: productsError } = await supabase
  .from('hq_product_metrics')
  .select('*')
  .order('revenue', { ascending: false })

// Chamar função de snapshot
const { data: snapshot, error: snapshotError } = await supabase
  .rpc('get_marketing_hq_snapshot', {
    start_date_param: '2026-08-01',
    end_date_param: '2026-08-31'
  })
```

## Normalização de Dados

### Fontes de Tráfego (UTM Source)

A função `normalize_utm_source` normaliza as fontes para os seguintes valores:

- `google` - Qualquer fonte contendo "google"
- `meta` - Qualquer fonte contendo "meta", "facebook" ou "instagram"
- `tiktok` - Qualquer fonte contendo "tiktok"
- `direct` - Fonte direta ou nula
- `organic` - Tráfego orgânico
- `email` - Tráfego de email
- `affiliate` - Tráfego de afiliados
- `other` - Outras fontes

### Tipos de Dispositivo

Valores esperados:
- `desktop`
- `mobile`
- `tablet`
- `other`

## Integração com Website Intelligence Engine V3.7

Os eventos mapeiam para o Website Intelligence Engine da seguinte forma:

| Evento do Site | Evento do Engine |
|----------------|------------------|
| page_view | SESSION_STARTED |
| product_view | PRODUCT_VIEWED |
| search | SEARCH_PERFORMED |
| add_to_cart | ADD_TO_CART |
| checkout_start | CHECKOUT_STARTED |
| purchase | PURCHASE_COMPLETED |

## Atualização de Dados

### Frequência de Atualização

- **Eventos em tempo real**: Registrados imediatamente
- **Sessões**: Atualizadas em tempo real
- **Métricas diárias**: Calculadas automaticamente para os últimos 90 dias
- **Views**: Atualizadas em tempo real com os dados mais recentes

### Freshness dos Dados

Cada view e snapshot inclui:
- `generated_at` - Data de geração
- `last_event_at` - Data do último evento
- `last_order_at` - Data do último pedido

## Exportação Manual

O sistema inclui um botão de exportação no painel admin para exportar dados manualmente nos formatos:
- CSV
- XLSX
- JSON

### Dados Exportados

- Products
- Sales
- Website Funnel
- Product Metrics
- Traffic Sources

## Segurança

### Dados Sensíveis

O sistema NÃO armazena:
- Nomes completos
- CPF
- Endereços completos
- Telefones
- E-mails

Todos os dados são anonimizados ou usam IDs internos.

### Acesso Seguro

- **Nunca exponha a Service Role Key no frontend**
- Use funções RPC com permissões restritas
- Prefira Supabase Edge Functions para acesso programático
- Use RLS para controlar acesso às tabelas

## Exemplos de Payloads

### Evento de Visualização de Produto

```json
{
  "session_id": "a1b2c3d4-5678-90ef-ghij-klmnopqrstuv",
  "anonymous_user_id": "b2c3d4e5-6789-01fg-hijk-lmnopqrstuvw",
  "customer_id": null,
  "event_type": "product_view",
  "product_id": "c3d4e5f6-7890-12gh-ijkl-mnopqrstuvwx",
  "sku": "FRAG-001",
  "source": "google",
  "medium": "cpc",
  "campaign": "summer-sale",
  "content": null,
  "term": null,
  "device_type": "desktop",
  "page_url": "/produto/frag-001",
  "referrer": "https://google.com",
  "metadata": {
    "price": 99.99,
    "category": "perfume"
  },
  "created_at": "2026-08-27T12:00:00Z"
}
```

### Evento de Compra

```json
{
  "session_id": "a1b2c3d4-5678-90ef-ghij-klmnopqrstuv",
  "anonymous_user_id": "b2c3d4e5-6789-01fg-hijk-lmnopqrstuvw",
  "customer_id": "d3e4f5g6-7890-12hi-jklm-nopqrstuvwx",
  "event_type": "purchase",
  "product_id": null,
  "sku": null,
  "source": "google",
  "medium": "cpc",
  "campaign": "summer-sale",
  "content": null,
  "term": null,
  "device_type": "desktop",
  "page_url": "/checkout/sucesso",
  "referrer": "/checkout",
  "metadata": {
    "order_id": "e4f5g6h7-8901-23ij-klmn-opqrstuvwxyz",
    "revenue": 299.97,
    "items": [
      {
        "product_id": "c3d4e5f6-7890-12gh-ijkl-mnopqrstuvwx",
        "sku": "FRAG-001",
        "quantity": 2,
        "price": 99.99,
        "revenue": 199.98
      },
      {
        "product_id": "d4e5f6g7-8901-23hi-jklm-nopqrstuvwx",
        "sku": "FRAG-002",
        "quantity": 1,
        "price": 99.99,
        "revenue": 99.99
      }
    ]
  },
  "created_at": "2026-08-27T12:15:00Z"
}
```

## Testes

### Fluxo de Teste Recomendado

1. Abrir o site
2. Navegar para um produto
3. Adicionar produto ao carrinho
4. Iniciar checkout
5. Concluir pedido de teste
6. Verificar registros no Supabase
7. Verificar agregação nas views
8. Verificar saída para Marketing HQ

### Consultas de Verificação

```sql
-- Verificar eventos registrados
select * from public.website_events
where created_at >= now() - interval '1 hour'
order by created_at desc
limit 10;

-- Verificar sessões ativas
select * from public.website_sessions
where ended_at is null
order by started_at desc
limit 10;

-- Verificar métricas diárias
select * from public.website_product_metrics_daily
order by date desc
limit 7;

-- Testar função de snapshot
select * from public.get_marketing_hq_snapshot(
  start_date_param := now() - interval '7 days',
  end_date_param := now()
);
```

## Manutenção

### Atualização de Métricas Diárias

As métricas diárias podem ser recalculadas manualmente:

```sql
select public.calculate_daily_metrics();
```

### Recalcular para Período Específico

```sql
select public.calculate_daily_metrics_for_date(
  p_start_date := '2026-08-01',
  p_end_date := '2026-08-31'
);
```

## Notas de Implementação

1. **Não duplique dados de pedidos**: Use a tabela existente `orders` e `order_items`
2. **Anonimização**: Use IDs internos em vez de dados pessoais
3. **Segurança**: Nunca exponha a Service Role Key no frontend
4. **Desempenho**: Índices estão configurados para consultas comuns
5. **Compatibilidade**: Estrutura compatível com Website Intelligence Engine V3.7
