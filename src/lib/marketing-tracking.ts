import { supabase } from './supabase';

// =============================================
// MARKETING TRACKING CLIENT
// =============================================

// Tipos de eventos
type EventType =
  | 'page_view'
  | 'product_view'
  | 'search'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_start'
  | 'purchase';

// Tipos de dispositivo
type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'other';

// Dados da sessão
interface SessionData {
  sessionId: string;
  anonymousUserId: string;
  customerId: string | null;
  startedAt: string;
  landingPage: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  deviceType: DeviceType;
}

// Estado da sessão
let currentSession: SessionData | null = null;

// Função para detectar tipo de dispositivo
function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'other';

  const userAgent = window.navigator.userAgent;

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    return 'mobile';
  }

  if (/Tablet|iPad/i.test(userAgent)) {
    return 'tablet';
  }

  return 'desktop';
}

// Função para extrair parâmetros UTM
function extractUtmParams(): {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
} {
  if (typeof window === 'undefined') {
    return { source: null, medium: null, campaign: null, content: null, term: null };
  }

  const urlParams = new URLSearchParams(window.location.search);

  return {
    source: urlParams.get('utm_source') || null,
    medium: urlParams.get('utm_medium') || null,
    campaign: urlParams.get('utm_campaign') || null,
    content: urlParams.get('utm_content') || null,
    term: urlParams.get('utm_term') || null,
  };
}

// Função para gerar UUID seguro (sem dependência externa)
function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback para navegadores antigos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Função para iniciar sessão
async function startSession(): Promise<SessionData | null> {
  if (typeof window === 'undefined') return null;
  if (currentSession) return currentSession;

  // Gerar IDs
  const sessionId = generateUUID();
  const anonymousUserId = localStorage.getItem('marketing_anonymous_id') || generateUUID();

  // Salvar anonymous ID no localStorage para persistência
  if (!localStorage.getItem('marketing_anonymous_id')) {
    localStorage.setItem('marketing_anonymous_id', anonymousUserId);
  }

  // Extrair parâmetros UTM
  const { source, medium, campaign } = extractUtmParams();

  // Detectar dispositivo
  const deviceType = detectDeviceType();

  // Dados da sessão
  const sessionData: SessionData = {
    sessionId,
    anonymousUserId,
    customerId: null, // Será preenchido se usuário estiver logado
    startedAt: new Date().toISOString(),
    landingPage: window.location.pathname,
    source,
    medium,
    campaign,
    deviceType,
  };

  // Salvar sessão
  currentSession = sessionData;

  // Registrar sessão no backend
  try {
    await supabase.rpc('track_session_start', {
      p_anonymous_user_id: anonymousUserId,
      p_customer_id: null,
      p_landing_page: window.location.pathname,
      p_source: source,
      p_medium: medium,
      p_campaign: campaign,
      p_device_type: deviceType,
    });
  } catch (error) {
    console.error('Erro ao registrar sessão:', error);
  }

  return sessionData;
}

// Função para obter sessão atual
async function getCurrentSession(): Promise<SessionData | null> {
  if (typeof window === 'undefined') return null;
  if (!currentSession) {
    return await startSession();
  }
  return currentSession;
}

// Função para registrar evento
async function trackEvent(eventType: EventType, options: {
  productId?: string;
  sku?: string;
  pageUrl?: string;
  referrer?: string;
  metadata?: Record<string, any>;
} = {}) {
  if (typeof window === 'undefined') return;
  try {
    const session = await getCurrentSession();
    if (!session) return;

    const {
      productId = null,
      sku = null,
      pageUrl = window.location.pathname,
      referrer = document.referrer || null,
      metadata = {},
    } = options;

    // Extrair parâmetros UTM
    const { source, medium, campaign, content, term } = extractUtmParams();

    // Registrar evento no backend
    await supabase.rpc('track_event', {
      p_session_id: session.sessionId,
      p_anonymous_user_id: session.anonymousUserId,
      p_customer_id: session.customerId,
      p_event_type: eventType,
      p_product_id: productId,
      p_sku: sku,
      p_source: source,
      p_medium: medium,
      p_campaign: campaign,
      p_content: content,
      p_term: term,
      p_device_type: session.deviceType,
      p_page_url: pageUrl,
      p_referrer: referrer,
      p_metadata: metadata,
    });

    // Log para debug
    if (import.meta.env.DEV) {
      console.log(`[Marketing] Evento registrado: ${eventType}`, {
        sessionId: session.sessionId,
        anonymousUserId: session.anonymousUserId,
        productId,
        sku,
        metadata,
      });
    }
  } catch (error) {
    console.error(`Erro ao registrar evento ${eventType}:`, error);
  }
}

// Função para registrar visualização de página
async function trackPageView() {
  await trackEvent('page_view', {
    pageUrl: window.location.pathname,
    referrer: document.referrer,
  });
}

// Função para registrar visualização de produto
async function trackProductView(productId: string, sku: string, metadata: Record<string, any> = {}) {
  await trackEvent('product_view', {
    productId,
    sku,
    pageUrl: window.location.pathname,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

// Função para registrar busca
async function trackSearch(query: string, resultsCount: number) {
  await trackEvent('search', {
    pageUrl: window.location.pathname,
    metadata: {
      query,
      results_count: resultsCount,
      timestamp: new Date().toISOString(),
    },
  });
}

// Função para registrar adição ao carrinho
async function trackAddToCart(productId: string, sku: string, quantity: number, price: number) {
  await trackEvent('add_to_cart', {
    productId,
    sku,
    metadata: {
      quantity,
      price,
      revenue: quantity * price,
      timestamp: new Date().toISOString(),
    },
  });
}

// Função para registrar remoção do carrinho
async function trackRemoveFromCart(productId: string, sku: string, quantity: number) {
  await trackEvent('remove_from_cart', {
    productId,
    sku,
    metadata: {
      quantity,
      timestamp: new Date().toISOString(),
    },
  });
}

// Função para registrar início de checkout
async function trackCheckoutStart(items: Array<{
  productId: string;
  sku: string;
  quantity: number;
  price: number;
}>) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  await trackEvent('checkout_start', {
    metadata: {
      items_count: totalItems,
      total_revenue: totalRevenue,
      items: items.map(item => ({
        product_id: item.productId,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
      })),
      timestamp: new Date().toISOString(),
    },
  });
}

// Função para registrar compra (DESATIVADA NO CLIENTE - Fonte de verdade é o Backend via public.orders e trigger SQL)
async function trackPurchase(orderId: string, _items: any[], _totalAmount: number, _discount: number = 0, _shipping: number = 0) {
  // A contabilização financeira e o evento PURCHASE_COMPLETED são gerados exclusivamente
  // pelo banco de dados (trigger em public.orders) para garantir segurança e integridade financeira.
  if (import.meta.env.DEV) {
    console.log(`[Marketing] Purchase gerado pelo backend para order_id: ${orderId}`);
  }
}

// Função para definir ID do cliente (quando usuário faz login)
async function setCustomerId(customerId: string) {
  if (typeof window === 'undefined') return;
  if (!currentSession) {
    currentSession = await startSession();
  }
  if (!currentSession) return;
  currentSession.customerId = customerId;

  // Atualizar sessão no backend
  try {
    await supabase.rpc('update_customer_in_session', {
      p_session_id: currentSession.sessionId,
      p_customer_id: customerId,
    });
  } catch (error) {
    console.error('Erro ao atualizar ID do cliente na sessão:', error);
  }
}

// Função para limpar sessão (logout)
async function clearSession() {
  currentSession = null;
  localStorage.removeItem('marketing_anonymous_id');
}

// Função para obter dados de sessão atual
function getSessionData() {
  return currentSession;
}

// Inicializar tracking automaticamente
if (typeof window !== 'undefined') {
  // Registrar página inicial
  startSession().then(() => {
    trackPageView();
  });

  // Track page views on route changes (se estiver usando um router)
  // Isso seria integrado com o sistema de roteamento específico
}

// Exportar funções públicas
export const marketingTracking = {
  startSession,
  getCurrentSession,
  trackEvent,
  trackPageView,
  trackProductView,
  trackSearch,
  trackAddToCart,
  trackRemoveFromCart,
  trackCheckoutStart,
  trackPurchase,
  setCustomerId,
  clearSession,
  getSessionData,
  detectDeviceType,
  extractUtmParams,
};

// Função para atualizar ID do cliente na sessão (RPC adicional)
// Esta função precisa ser adicionada ao Supabase
declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<T = any>(fn: 'update_customer_in_session', params: {
      p_session_id: string;
      p_customer_id: string;
    }): Promise<T>;
  }
}
