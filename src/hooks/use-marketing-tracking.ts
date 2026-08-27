import { useEffect } from 'react';
import { marketingTracking } from '@/lib/marketing-tracking';

// Hook para registrar visualização de página
export function usePageView(pageName?: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Registrar visualização de página
    marketingTracking.trackPageView();

    if (import.meta.env.DEV) {
      console.log(`[Marketing] Page view registrado: ${pageName || window.location.pathname}`);
    }
  }, [pageName]);
}

// Hook para registrar visualização de produto
export function useProductView(productId: string | null, sku: string | null, metadata?: Record<string, any>) {
  useEffect(() => {
    if (!productId || !sku || typeof window === 'undefined') return;

    // Registrar visualização de produto após 1 segundo (evitar bounce)
    const timer = setTimeout(() => {
      marketingTracking.trackProductView(productId, sku, metadata);
    }, 1000);

    return () => clearTimeout(timer);
  }, [productId, sku, metadata]);
}

// Hook para registrar busca
export function useTrackSearch() {
  return (query: string, resultsCount: number) => {
    marketingTracking.trackSearch(query, resultsCount);
  };
}

// Hook para registrar adição ao carrinho
export function useTrackAddToCart() {
  return (productId: string, sku: string, quantity: number, price: number) => {
    marketingTracking.trackAddToCart(productId, sku, quantity, price);
  };
}

// Hook para registrar início de checkout
export function useTrackCheckoutStart() {
  return (items: Array<{ productId: string; sku: string; quantity: number; price: number }>) => {
    marketingTracking.trackCheckoutStart(items);
  };
}

// Hook para registrar compra
export function useTrackPurchase() {
  return (
    orderId: string,
    items: Array<{ productId: string; sku: string; quantity: number; price: number }>,
    totalAmount: number,
    discount?: number,
    shipping?: number
  ) => {
    marketingTracking.trackPurchase(orderId, items, totalAmount, discount, shipping);
  };
}

// Hook para definir ID do cliente quando autenticado
export function useTrackCustomerId(customerId: string | null) {
  useEffect(() => {
    if (!customerId) return;

    marketingTracking.setCustomerId(customerId);
  }, [customerId]);
}