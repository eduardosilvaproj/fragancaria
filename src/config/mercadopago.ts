export const MP_PUBLIC_KEY = 'APP_USR-ecf4de3f-5862-496a-a2dd-3212cc22c30d';

export const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Cartão de Crédito', icon: '💳', description: 'Parcele sua compra' },
  { id: 'pix', name: 'PIX', icon: '⚡', description: 'Aprovação instantânea', discount: 5 },
  { id: 'boleto', name: 'Boleto Bancário', icon: '📄', description: 'Vencimento em 3 dias úteis' },
] as const;

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

// Numero maximo de parcelas oferecido na vitrine e no checkout.
//
// NAO afirmamos "sem juros" em nenhum texto do site. Quem define parcelamento
// sem juros e a configuracao da conta do Mercado Pago, nao este codigo: o
// checkout so envia `installments` para a API (payments.functions.ts) e o MP
// aplica as regras dele. Alem disso `payment_settings.free_installments` tem
// default 3 no banco e e editavel pelo admin, ou seja, o proprio projeto nao
// trata "10x sem juros" como verdade fixa.
//
// Por isso as parcelas exibidas usam `total / N` apenas como ESTIMATIVA, com
// rotulo "a partir de". O valor exato (com eventual juro) e o que o Mercado
// Pago devolve na etapa de pagamento.
export const MAX_INSTALLMENTS = 10;

export const INSTALLMENTS_LABEL = `Em até ${MAX_INSTALLMENTS}x no cartão`;

export const INSTALLMENTS_OPTIONS = Array.from({ length: MAX_INSTALLMENTS }, (_, i) => ({
  installments: i + 1,
  label: `${i + 1}x`,
}));

export { SHIPPING_METHODS } from "@/lib/commerce-config";
export type { ShippingMethodId } from "@/lib/commerce-config";