import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Affiliate,
  AffiliateLink,
  AffiliateSale,
  AffiliatePayout,
  AffiliateTier,
  AffiliateSettings,
  AffiliateNotification,
  AffiliateDashboardSummary,
  AffiliateRegistrationForm,
  CreateLinkForm,
  AffiliateFilters,
  SaleFilters,
  PayoutFilters,
  PaginatedResponse,
} from '@/types/affiliate';

// =============================================
// CONFIGURAÇÃO DO CLIENTE SUPABASE
// =============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cliente singleton - inicializado apenas no browser
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  // Verificar se está no browser
  if (typeof window === 'undefined') {
    // No servidor, retornar um cliente mock que não faz nada
    throw new Error('Supabase client should only be used in browser');
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured.');
    throw new Error('Supabase not configured');
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 0,
      },
    },
  });

  return _supabase;
}

// Export para compatibilidade - mas use getSupabase() internamente
export const supabase = {
  get auth() { return getSupabase().auth; },
  from: (table: string) => getSupabase().from(table),
  rpc: (fn: string, params?: any) => getSupabase().rpc(fn, params),
};

// =============================================
// AUTENTICAÇÃO
// =============================================

export const affiliateAuth = {
  /**
   * Registra um novo afiliado
   */
  async register(form: AffiliateRegistrationForm) {
    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: 'affiliate',
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Erro ao criar usuário');

    // 2. Criar registro na tabela affiliates
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        user_id: authData.user.id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        cpf: form.cpf || null,
        birth_date: form.birth_date || null,
        address_street: form.address_street || null,
        address_number: form.address_number || null,
        address_complement: form.address_complement || null,
        address_neighborhood: form.address_neighborhood || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: form.address_zip || null,
        pix_key: form.pix_key || null,
        pix_key_type: form.pix_key_type || null,
        instagram: form.instagram || null,
        youtube: form.youtube || null,
        tiktok: form.tiktok || null,
        website: form.website || null,
        accepted_terms: form.accepted_terms,
        accepted_terms_at: form.accepted_terms ? new Date().toISOString() : null,
        status: 'pending',
      })
      .select()
      .single();

    if (affiliateError) {
      // Rollback: deletar usuário criado
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw affiliateError;
    }

    return { user: authData.user, affiliate };
  },

  /**
   * Login do afiliado
   */
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Verificar se é afiliado
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (!affiliate) {
      await supabase.auth.signOut();
      throw new Error('Conta não encontrada no programa de afiliados');
    }

    return { session: data.session, affiliate };
  },

  /**
   * Logout
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Login com Google OAuth
   */
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/afiliado/dashboard`,
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Recuperar senha
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/afiliado/nova-senha`,
    });
    if (error) throw error;
  },

  /**
   * Atualizar senha
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  /**
   * Obter sessão atual
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Obter usuário atual
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },
};

// =============================================
// AFILIADO
// =============================================

export const affiliateService = {
  /**
   * Obter afiliado atual (logado)
   */
  async getCurrentAffiliate(): Promise<Affiliate | null> {
    const user = await affiliateAuth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('affiliates')
      .select('*, current_tier:affiliate_tiers(*)')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Obter resumo do dashboard
   */
  async getDashboardSummary(): Promise<AffiliateDashboardSummary | null> {
    const user = await affiliateAuth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('affiliate_dashboard_summary')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Atualizar perfil do afiliado
   */
  async updateProfile(updates: Partial<Affiliate>) {
    const user = await affiliateAuth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('affiliates')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================
// LINKS
// =============================================

export const linkService = {
  /**
   * Criar link de afiliado
   */
  async createLink(form: CreateLinkForm): Promise<AffiliateLink> {
    const affiliate = await affiliateService.getCurrentAffiliate();
    if (!affiliate) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('affiliate_links')
      .insert({
        affiliate_id: affiliate.id,
        product_id: form.product_id,
        product_name: form.product_name,
        product_image: form.product_image,
        product_price: form.product_price,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Listar links do afiliado
   */
  async getLinks(page = 1, perPage = 20): Promise<PaginatedResponse<AffiliateLink>> {
    const affiliate = await affiliateService.getCurrentAffiliate();
    if (!affiliate) throw new Error('Não autenticado');

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await supabase
      .from('affiliate_links')
      .select('*', { count: 'exact' })
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  },

  /**
   * Desativar link
   */
  async deactivateLink(linkId: string) {
    const { error } = await supabase
      .from('affiliate_links')
      .update({ is_active: false })
      .eq('id', linkId);

    if (error) throw error;
  },

  /**
   * Gerar URL do link
   */
  generateLinkUrl(code: string, productId?: string): string {
    const baseUrl = window.location.origin;
    if (productId) {
      return `${baseUrl}/produto/${productId}?ref=${code}`;
    }
    return `${baseUrl}?ref=${code}`;
  },
};

// =============================================
// VENDAS
// =============================================

export const saleService = {
  /**
   * Listar vendas do afiliado
   */
  async getSales(
    filters: SaleFilters = {},
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<AffiliateSale>> {
    const affiliate = await affiliateService.getCurrentAffiliate();
    if (!affiliate) throw new Error('Não autenticado');

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('affiliate_sales')
      .select('*, link:affiliate_links(*)', { count: 'exact' })
      .eq('affiliate_id', affiliate.id);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  },
};

// =============================================
// PAGAMENTOS
// =============================================

export const payoutService = {
  /**
   * Listar pagamentos do afiliado
   */
  async getPayouts(
    filters: PayoutFilters = {},
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<AffiliatePayout>> {
    const affiliate = await affiliateService.getCurrentAffiliate();
    if (!affiliate) throw new Error('Não autenticado');

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('affiliate_payouts')
      .select('*', { count: 'exact' })
      .eq('affiliate_id', affiliate.id);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  },
};

// =============================================
// NOTIFICAÇÕES
// =============================================

export const notificationService = {
  /**
   * Listar notificações do afiliado
   */
  async getNotifications(
    unreadOnly = false,
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<AffiliateNotification>> {
    const affiliate = await affiliateService.getCurrentAffiliate();
    if (!affiliate) throw new Error('Não autenticado');

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('affiliate_notifications')
      .select('*', { count: 'exact' })
      .eq('affiliate_id', affiliate.id);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  },

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('affiliate_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Marcar todas como lidas
   */
  async markAllAsRead() {
    const affiliate = await affiliateService.getCurrentAffiliate();
    if (!affiliate) throw new Error('Não autenticado');

    const { error } = await supabase
      .from('affiliate_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('affiliate_id', affiliate.id)
      .eq('is_read', false);

    if (error) throw error;
  },
};

// =============================================
// CONFIGURAÇÕES E TIERS (Público)
// =============================================

export const settingsService = {
  /**
   * Obter configurações do programa
   */
  async getSettings(): Promise<AffiliateSettings | null> {
    const { data, error } = await supabase
      .from('affiliate_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Obter todos os tiers
   */
  async getTiers(): Promise<AffiliateTier[]> {
    const { data, error } = await supabase
      .from('affiliate_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};

// =============================================
// RASTREAMENTO (para uso no site público)
// =============================================

export const trackingService = {
  /**
   * Registrar clique em link de afiliado
   */
  async trackClick(code: string, sessionId: string) {
    // Buscar link pelo código
    const { data: link, error: linkError } = await supabase
      .from('affiliate_links')
      .select('id, affiliate_id')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (linkError || !link) return null;

    // Registrar clique
    const { data: click, error: clickError } = await supabase
      .from('affiliate_clicks')
      .insert({
        link_id: link.id,
        affiliate_id: link.affiliate_id,
        session_id: sessionId,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      })
      .select()
      .single();

    if (clickError) {
      console.error('Erro ao registrar clique:', clickError);
      return null;
    }

    // Atualizar contador de cliques
    await supabase.rpc('increment_link_clicks', { link_id: link.id });

    return click;
  },

  /**
   * Salvar referência no cookie/localStorage
   */
  saveReferral(code: string, durationDays = 30) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + durationDays);

    const referralData = {
      code,
      timestamp: new Date().toISOString(),
      expiry: expiry.toISOString(),
    };

    // Salvar em localStorage
    localStorage.setItem('affiliate_ref', JSON.stringify(referralData));

    // Salvar em cookie também
    document.cookie = `affiliate_ref=${code}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;
  },

  /**
   * Obter referência salva
   */
  getReferral(): string | null {
    // Tentar localStorage primeiro
    const stored = localStorage.getItem('affiliate_ref');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (new Date(data.expiry) > new Date()) {
          return data.code;
        }
        // Expirado, remover
        localStorage.removeItem('affiliate_ref');
      } catch {
        localStorage.removeItem('affiliate_ref');
      }
    }

    // Fallback para cookie
    const match = document.cookie.match(/affiliate_ref=([^;]+)/);
    return match ? match[1] : null;
  },

  /**
   * Limpar referência
   */
  clearReferral() {
    localStorage.removeItem('affiliate_ref');
    document.cookie = 'affiliate_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  },
};

// =============================================
// HOOKS DE AUTENTICAÇÃO
// =============================================

export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}
