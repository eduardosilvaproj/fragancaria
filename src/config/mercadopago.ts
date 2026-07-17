export const MP_PUBLIC_KEY = 'APP_USR-ecf4de3f-5862-496a-a2dd-3212cc22c30d';

export const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Cartão de Crédito', icon: '💳', description: 'Até 10x sem juros' },
  { id: 'pix', name: 'PIX', icon: '⚡', description: 'Aprovação instantânea', discount: 5 },
  { id: 'boleto', name: 'Boleto Bancário', icon: '📄', description: 'Vencimento em 3 dias úteis' },
] as const;

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

export const INSTALLMENTS_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  installments: i + 1,
  label: `${i + 1}x sem juros`,
}));

export { SHIPPING_METHODS } from "@/lib/commerce-config";
export type { ShippingMethodId } from "@/lib/commerce-config";