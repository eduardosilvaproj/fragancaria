import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PaymentMethodId, ShippingMethodId } from "@/config/mercadopago";
import type { CouponType } from "@/lib/commerce-config";

export type CheckoutStep = "cart" | "shipping" | "payment" | "confirmation";

export type ShippingQuoteStatus = "idle" | "loading" | "success" | "error";

export interface ShippingQuoteOption {
  servicoId: number;
  transportadora: string;
  servico: string;
  precoCentavos: number;
  prazoDias: number;
  precoExibidoCentavos: number;
}

export interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  cpf: string;
}

export interface ShippingAddress {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface PaymentData {
  orderId?: string;
  status?: "pending" | "approved" | "rejected" | "in_process";
  pixCode?: string;
  pixQrCode?: string;
  boletoCode?: string;
  boletoUrl?: string;
  cardLast4?: string;
  cardBrand?: string;
  installments?: number;
  trackingToken?: string;
  trackingTokenFormatted?: string;
}

// Cupom aplicado no checkout, já resolvido pela server fn resolveCoupon.
// Guarda tipo + valor (os três tipos) em vez de só percentual. O desconto em
// reais nunca é guardado aqui — é recalculado por couponDiscountAmount a
// partir do subtotal atual, e o servidor o recalcula de novo no pagamento.
export interface CheckoutCoupon {
  code: string;
  type: CouponType;
  value: number;
  label: string;
}

interface CheckoutState {
  step: CheckoutStep;
  customer: Customer | null;
  shippingAddress: ShippingAddress | null;
  shippingMethod: ShippingMethodId | null;
  shippingPrice: number;
  quoteStatus: ShippingQuoteStatus;
  quoteError: string | null;
  quoteCep: string | null;
  cotacaoId: string | null;
  servicoId: number | null;
  opcoes: ShippingQuoteOption[];
  paymentMethod: PaymentMethodId | null;
  paymentData: PaymentData | null;
  coupon: CheckoutCoupon | null;
  setStep: (s: CheckoutStep) => void;
  setCustomer: (c: Customer) => void;
  setShippingAddress: (a: ShippingAddress) => void;
  setShippingMethod: (m: ShippingMethodId) => void;
  setShippingPrice: (p: number) => void;
  setShippingQuote: (q: {
    status: ShippingQuoteStatus;
    cotacaoId?: string;
    opcoes?: ShippingQuoteOption[];
    cep?: string;
    error?: string | null;
  }) => void;
  setServicoId: (id: number) => void;
  clearShippingQuote: () => void;
  setPaymentMethod: (m: PaymentMethodId) => void;
  setPaymentData: (d: PaymentData) => void;
  setCoupon: (c: CheckoutCoupon | null) => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      step: "shipping",
      customer: null,
      shippingAddress: null,
      shippingMethod: null,
      shippingPrice: 0,
      quoteStatus: "idle",
      quoteError: null,
      quoteCep: null,
      cotacaoId: null,
      servicoId: null,
      opcoes: [],
      paymentMethod: null,
      paymentData: null,
      coupon: null,
      setStep: (step) => set({ step }),
      setCustomer: (customer) => set({ customer }),
      setShippingAddress: (shippingAddress) => set({ shippingAddress }),
      setShippingMethod: (shippingMethod) => set({ shippingMethod }),
      setShippingPrice: (shippingPrice) => set({ shippingPrice }),
      setShippingQuote: ({ status, cotacaoId, opcoes, cep, error }) =>
        set({
          quoteStatus: status,
          quoteError: error ?? null,
          quoteCep: cep ?? null,
          cotacaoId: cotacaoId ?? null,
          opcoes: opcoes ?? [],
        }),
      setServicoId: (servicoId) => set({ servicoId }),
      clearShippingQuote: () =>
        set({
          quoteStatus: "idle",
          quoteError: null,
          quoteCep: null,
          cotacaoId: null,
          servicoId: null,
          opcoes: [],
          shippingPrice: 0,
        }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setPaymentData: (paymentData) => set({ paymentData }),
      setCoupon: (coupon) => set({ coupon }),
      clearCheckout: () =>
        set({
          step: "shipping",
          paymentMethod: null,
          paymentData: null,
          shippingPrice: 0,
          quoteStatus: "idle",
          quoteError: null,
          quoteCep: null,
          cotacaoId: null,
          servicoId: null,
          opcoes: [],
        }),
    }),
    {
      name: "fragranciaria-checkout",
      storage: createJSONStorage(() => localStorage),
      // v2 (C14): o cupom mudou de {code, discountPercent} para
      // {code, type, value, label}. O migrate descarta o cupom v1 persistido,
      // preservando o resto do progresso (endereço, frete). Um cupom v1 não
      // derruba o render (as fns leem coupon?.type e caem no fallback), mas
      // zeraria o desconto silenciosamente e mostraria label vazia — some com
      // ele em vez de exibir um cupom meia-boca.
      version: 2,
      migrate: (persisted: any) => {
        if (persisted?.coupon && !("type" in persisted.coupon)) {
          persisted.coupon = null;
        }
        return persisted;
      },
      partialize: (state) => ({
        customer: state.customer,
        shippingAddress: state.shippingAddress,
        shippingMethod: state.shippingMethod,
        shippingPrice: state.shippingPrice,
        quoteStatus: state.quoteStatus,
        quoteError: state.quoteError,
        quoteCep: state.quoteCep,
        cotacaoId: state.cotacaoId,
        servicoId: state.servicoId,
        opcoes: state.opcoes,
        coupon: state.coupon,
      }),
    },
  ),
);
