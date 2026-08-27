// Helper client-only para chamar marketing tracking de forma segura
// Este arquivo é importado dinamicamente para evitar SSR

import { marketingTracking } from "./marketing-tracking";

export function trackPageView() {
  marketingTracking.trackPageView();
}

export function trackProductView(productId: string, sku: string, metadata: Record<string, any>) {
  marketingTracking.trackProductView(productId, sku, metadata);
}

export function trackCheckoutStart(items: Array<{ productId: string; sku: string; quantity: number; price: number }>) {
  marketingTracking.trackCheckoutStart(items);
}

export function trackAddToCart(productId: string, sku: string, quantity: number, price: number) {
  marketingTracking.trackAddToCart(productId, sku, quantity, price);
}

export function trackPurchase(orderId: string, items: Array<{ productId: string; sku: string; quantity: number; price: number }>, totalAmount: number, discount?: number, shipping?: number) {
  marketingTracking.trackPurchase(orderId, items, totalAmount, discount, shipping);
}
