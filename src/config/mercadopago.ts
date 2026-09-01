export const MP_PUBLIC_KEY = 'APP_USR-ecf4de3f-5862-496a-a2dd-3212cc22c30d';

export const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Cartão de Crédito', icon: '💳', description: 'Parcele sua compra' },
  { id: 'pix', name: 'PIX', icon: '⚡', description: 'Aprovação instantânea', discount: 5 },
  { id: 'boleto', name: 'Boleto Bancário', icon: '📄', description: 'Vencimento em 3 dias úteis' },
] as const;

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

// Numero maximo de parcelas oferecido na vitrine e no checkout.
// Validado em produção: 10x sem juros vale para qualquer valor da loja.
export const MAX_INSTALLMENTS = 10;

export const INSTALLMENTS_LABEL = `Em até ${MAX_INSTALLMENTS}x sem juros`;

export const INSTALLMENTS_OPTIONS = Array.from({ length: MAX_INSTALLMENTS }, (_, i) => ({
  installments: i + 1,
  label: `${i + 1}x`,
}));

export { SHIPPING_METHODS } from "@/lib/commerce-config";
export type { ShippingMethodId } from "@/lib/commerce-config";