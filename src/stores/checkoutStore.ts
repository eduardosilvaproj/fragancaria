import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PaymentMethodId, ShippingMethodId } from '@/config/mercadopago';

export type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'confirmation';

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
  status?: 'pending' | 'approved' | 'rejected';
  pixCode?: string;
  pixQrCode?: string;
  boletoCode?: string;
  boletoUrl?: string;
  cardLast4?: string;
  installments?: number;
}

export interface CheckoutCoupon {
  code: string;
  discountPercent: number;
}

interface CheckoutState {
  step: CheckoutStep;
  customer: Customer | null;
  shippingAddress: ShippingAddress | null;
  shippingMethod: ShippingMethodId | null;
  paymentMethod: PaymentMethodId | null;
  paymentData: PaymentData | null;
  coupon: CheckoutCoupon | null;
  setStep: (s: CheckoutStep) => void;
  setCustomer: (c: Customer) => void;
  setShippingAddress: (a: ShippingAddress) => void;
  setShippingMethod: (m: ShippingMethodId) => void;
  setPaymentMethod: (m: PaymentMethodId) => void;
  setPaymentData: (d: PaymentData) => void;
  setCoupon: (c: CheckoutCoupon | null) => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      step: 'shipping',
      customer: null,
      shippingAddress: null,
      shippingMethod: null,
      paymentMethod: null,
      paymentData: null,
      coupon: null,
      setStep: (step) => set({ step }),
      setCustomer: (customer) => set({ customer }),
      setShippingAddress: (shippingAddress) => set({ shippingAddress }),
      setShippingMethod: (shippingMethod) => set({ shippingMethod }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setPaymentData: (paymentData) => set({ paymentData }),
      setCoupon: (coupon) => set({ coupon }),
      clearCheckout: () =>
        set({
          step: 'shipping',
          paymentMethod: null,
          paymentData: null,
        }),
    }),
    {
      name: 'fragranciaria-checkout',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        customer: state.customer,
        shippingAddress: state.shippingAddress,
        shippingMethod: state.shippingMethod,
        coupon: state.coupon,
      }),
    }
  )
);