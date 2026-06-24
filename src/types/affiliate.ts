// =============================================
// TIPOS DO SISTEMA DE AFILIADOS
// =============================================

export type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PixKeyType = 'cpf' | 'email' | 'phone' | 'random' | 'cnpj';
export type BankAccountType = 'corrente' | 'poupanca';
export type SaleStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'refunded';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
export type PaymentMethod = 'pix' | 'transfer' | 'other';
export type NotificationType = 'sale' | 'payout' | 'tier_change' | 'approval' | 'system';

// =============================================
// CONFIGURAÇÕES
// =============================================
export interface AffiliateSettings {
  id: string;
  default_commission_rate: number;
  cookie_duration_days: number;
  min_payout_amount: number;
  auto_approve_affiliates: boolean;
  payout_day: number;
  terms_url?: string;
  support_email: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// TIERS
// =============================================
export interface AffiliateTier {
  id: string;
  name: string;
  slug: string;
  min_sales_amount: number;
  commission_rate: number;
  color: string;
  icon: string;
  benefits: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// AFILIADO
// =============================================
export interface Affiliate {
  id: string;
  user_id: string;

  // Dados pessoais
  full_name: string;
  email: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;

  // Endereço
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;

  // Dados bancários
  pix_key?: string;
  pix_key_type?: PixKeyType;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: BankAccountType;

  // Redes sociais
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;

  // Comissão
  custom_commission_rate?: number;
  current_tier_id?: string;

  // Status
  status: AffiliateStatus;
  rejection_reason?: string;
  suspension_reason?: string;
  approved_at?: string;
  approved_by?: string;

  // Código único
  affiliate_code: string;

  // Métricas
  total_clicks: number;
  total_sales_count: number;
  total_sales_amount: number;
  total_commission_earned: number;
  total_commission_paid: number;
  current_month_sales: number;

  // Termos
  accepted_terms: boolean;
  accepted_terms_at?: string;

  created_at: string;
  updated_at: string;

  // Relações (join)
  current_tier?: AffiliateTier;
}

// =============================================
// LINK DE AFILIADO
// =============================================
export interface AffiliateLink {
  id: string;
  affiliate_id: string;

  // Produto
  product_id?: string;
  product_name?: string;
  product_image?: string;
  product_price?: number;

  // Link
  code: string;
  short_url?: string;

  // Métricas
  clicks: number;
  unique_clicks: number;
  conversions: number;
  conversion_rate: number;
  total_sales_amount: number;

  is_active: boolean;
  last_click_at?: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// CLIQUE
// =============================================
export interface AffiliateClick {
  id: string;
  link_id: string;
  affiliate_id: string;

  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  country?: string;
  city?: string;
  device_type?: string;

  session_id?: string;
  converted: boolean;
  converted_at?: string;
  order_id?: string;

  created_at: string;
}

// =============================================
// VENDA
// =============================================
export interface AffiliateSale {
  id: string;
  affiliate_id: string;
  link_id?: string;
  click_id?: string;

  // Pedido
  order_id: string;
  order_number?: string;
  order_date?: string;
  customer_email?: string;
  customer_name?: string;

  // Valores
  order_subtotal: number;
  order_shipping: number;
  order_discount: number;
  order_total: number;

  // Comissão
  commission_rate: number;
  commission_amount: number;
  tier_at_sale?: string;

  // Status
  status: SaleStatus;
  status_reason?: string;
  confirmed_at?: string;

  // Pagamento
  payout_id?: string;
  paid_at?: string;

  created_at: string;
  updated_at: string;

  // Relações (join)
  affiliate?: Affiliate;
  link?: AffiliateLink;
}

// =============================================
// PAGAMENTO
// =============================================
export interface AffiliatePayout {
  id: string;
  affiliate_id: string;

  // Valores
  gross_amount: number;
  fees: number;
  net_amount: number;
  sales_count: number;

  // Período
  period_start: string;
  period_end: string;

  // Pagamento
  payment_method?: PaymentMethod;
  payment_reference?: string;
  payment_proof_url?: string;

  // Snapshot
  pix_key_used?: string;
  bank_info_used?: Record<string, string>;

  // Status
  status: PayoutStatus;
  status_reason?: string;

  processed_at?: string;
  processed_by?: string;
  paid_at?: string;

  notes?: string;
  created_at: string;
  updated_at: string;

  // Relações (join)
  affiliate?: Affiliate;
}

// =============================================
// HISTÓRICO DE TIER
// =============================================
export interface AffiliateTierHistory {
  id: string;
  affiliate_id: string;
  from_tier_id?: string;
  to_tier_id?: string;
  from_tier_name?: string;
  to_tier_name?: string;
  reason: string;
  sales_amount?: number;
  created_at: string;
}

// =============================================
// NOTIFICAÇÃO
// =============================================
export interface AffiliateNotification {
  id: string;
  affiliate_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// =============================================
// DASHBOARD SUMMARY (View)
// =============================================
export interface AffiliateDashboardSummary {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  affiliate_code: string;
  status: AffiliateStatus;
  tier_name?: string;
  tier_icon?: string;
  tier_color?: string;
  current_commission_rate: number;
  total_clicks: number;
  total_sales_count: number;
  total_sales_amount: number;
  total_commission_earned: number;
  total_commission_paid: number;
  pending_commission: number;
  current_month_sales: number;
  active_links_count: number;
  pending_sales_count: number;
}

// =============================================
// FORMULÁRIOS
// =============================================
export interface AffiliateRegistrationForm {
  // Dados pessoais
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date?: string;

  // Endereço (opcional)
  address_zip?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;

  // Dados bancários
  pix_key: string;
  pix_key_type: PixKeyType;

  // Redes sociais
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;

  // Senha
  password: string;
  confirm_password: string;

  // Termos
  accepted_terms: boolean;
}

export interface AffiliateLoginForm {
  email: string;
  password: string;
}

export interface CreateLinkForm {
  product_id?: string;
  product_name?: string;
  product_image?: string;
  product_price?: number;
}

// =============================================
// API RESPONSES
// =============================================
export interface AffiliateApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// =============================================
// FILTROS
// =============================================
export interface AffiliateFilters {
  status?: AffiliateStatus;
  tier_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface SaleFilters {
  affiliate_id?: string;
  status?: SaleStatus;
  date_from?: string;
  date_to?: string;
}

export interface PayoutFilters {
  affiliate_id?: string;
  status?: PayoutStatus;
  date_from?: string;
  date_to?: string;
}
