import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShippingAddress {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CustomerInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  cpf: string;
}

export interface CheckoutState {
  // Etapa atual
  step: 'cart' | 'shipping' | 'payment' | 'confirmation';

  // Dados do cliente
  customer: CustomerInfo | null;

  // Endereço de entrega
  shippingAddress: ShippingAddress | null;

  // Método de envio selecionado
  shippingMethod: {
    id: string;
    name: string;
    price: number;
    estimatedDays: number;
  } | null;

  // Método de pagamento
  paymentMethod: 'credit_card' | 'pix' | 'boleto' | null;

  // Dados do pagamento (após processado)
  paymentData: {
    id: string;
    status: string;
    pixQrCode?: string;
    pixQrCodeBase64?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
  } | null;

  // Cupom de desconto
  coupon: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  } | null;

  // Actions
  setStep: (step: CheckoutState['step']) => void;
  setCustomer: (customer: CustomerInfo) => void;
  setShippingAddress: (address: ShippingAddress) => void;
  setShippingMethod: (method: CheckoutState['shippingMethod']) => void;
  setPaymentMethod: (method: CheckoutState['paymentMethod']) => void;
  setPaymentData: (data: CheckoutState['paymentData']) => void;
  setCoupon: (coupon: CheckoutState['coupon']) => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      step: 'cart',
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

      clearCheckout: () => set({
        step: 'cart',
        customer: null,
        shippingAddress: null,
        shippingMethod: null,
        paymentMethod: null,
        paymentData: null,
        coupon: null,
      }),
    }),
    {
      name: 'fragranciaria-checkout',
      partialize: (state) => ({
        customer: state.customer,
        shippingAddress: state.shippingAddress,
        shippingMethod: state.shippingMethod,
        coupon: state.coupon,
      }),
    }
  )
);
