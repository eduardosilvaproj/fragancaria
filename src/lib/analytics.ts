// Analytics utilities for Google Analytics 4 and Meta Pixel
// IDs should be configured via environment variables in production

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Google Analytics 4
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

export function initGA() {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
}

export function trackPageView(url: string, title?: string) {
  if (!window.gtag) return;
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title || document.title,
  });
}

export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (!window.gtag) return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// E-commerce events
export function trackViewItem(item: {
  id: string;
  name: string;
  brand?: string;
  price: number;
  category?: string;
}) {
  if (!window.gtag) return;
  window.gtag('event', 'view_item', {
    currency: 'BRL',
    value: item.price,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_brand: item.brand,
        item_category: item.category,
        price: item.price,
      },
    ],
  });
}

export function trackAddToCart(item: {
  id: string;
  name: string;
  brand?: string;
  price: number;
  quantity: number;
}) {
  if (!window.gtag) return;
  window.gtag('event', 'add_to_cart', {
    currency: 'BRL',
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_brand: item.brand,
        price: item.price,
        quantity: item.quantity,
      },
    ],
  });

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [item.id],
      content_name: item.name,
      content_type: 'product',
      value: item.price * item.quantity,
      currency: 'BRL',
    });
  }
}

export function trackRemoveFromCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  if (!window.gtag) return;
  window.gtag('event', 'remove_from_cart', {
    currency: 'BRL',
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      },
    ],
  });
}

export function trackBeginCheckout(items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>) {
  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'BRL',
      value,
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: items.map((i) => i.id),
      num_items: items.length,
      value,
      currency: 'BRL',
    });
  }
}

export function trackSearch(searchTerm: string) {
  if (window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
    });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Search', {
      search_string: searchTerm,
    });
  }
}

// Meta Pixel
export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '';

export function initMetaPixel() {
  if (!META_PIXEL_ID || typeof window === 'undefined') return;

  // Load Meta Pixel script
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${META_PIXEL_ID}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

export function trackMetaPageView() {
  if (!window.fbq) return;
  window.fbq('track', 'PageView');
}

export function trackMetaViewContent(item: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) {
  if (!window.fbq) return;
  window.fbq('track', 'ViewContent', {
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    content_category: item.category,
    value: item.price,
    currency: 'BRL',
  });
}

// Compra confirmada. Deve ser chamada APENAS quando o pagamento estiver
// aprovado — nunca na criação do pedido (PIX/boleto confirmam DEPOIS via
// webhook, e a tela de sucesso aparece ANTES da confirmação).
//
// `dedupeKey` é o id do pedido; se já estiver no localStorage, a função não
// envia novamente (evita contar duas vezes em recarregamento de tela).
export function trackPurchase(input: {
  orderId: string;
  value: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  onTracked?: () => void;
}) {
  if (typeof window === 'undefined') return;

  const flagKey = `purchase_tracked_${input.orderId}`;
  try {
    if (localStorage.getItem(flagKey)) return;
  } catch {
    // localStorage indisponido (modo anônimo/strict privacy) — prosseguimos
    // sem deduplicação. Risco: contar duas vezes se o cliente recarregar.
  }

  // GA4: purchase
  if (window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: input.orderId,
      value: input.value,
      currency: 'BRL',
      items: input.items.map((it) => ({
        item_id: it.id,
        item_name: it.name,
        price: it.price,
        quantity: it.quantity,
      })),
    });
  }

  // Meta: Purchase
  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      content_ids: input.items.map((i) => i.id),
      num_items: input.items.reduce((s, i) => s + i.quantity, 0),
      value: input.value,
      currency: 'BRL',
    });
  }

  try {
    localStorage.setItem(flagKey, '1');
  } catch {
    // Sem localStorage, sem dedupe — já tratado acima.
  }

  input.onTracked?.();
}
