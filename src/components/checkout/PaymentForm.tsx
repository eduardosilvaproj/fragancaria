import { useEffect, useState, useRef } from "react";
import { CreditCard, Loader2, Copy, QrCode, FileText, Check, AlertCircle, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { PAYMENT_METHODS, SHIPPING_METHODS, INSTALLMENTS_OPTIONS, type PaymentMethodId } from "@/config/mercadopago";
import { useServerFn } from "@tanstack/react-start";
import { createPayment } from "@/lib/payments.functions";

// Mercado Pago Public Key - necessário para tokenizar cartões
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || "APP_USR-f84f9b2c-7a06-4298-bc17-b0226a47989e";

// Declaração para o SDK do Mercado Pago
declare global {
  interface Window {
    MercadoPago: any;
  }
}

// Detectar bandeira do cartão
type CardBrand = "visa" | "mastercard" | "amex" | "elo" | "hipercard" | "unknown";

const detectCardBrand = (number: string): CardBrand => {
  const cleaned = number.replace(/\s/g, "");
  if (/^4/.test(cleaned)) return "visa";
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return "mastercard";
  if (/^3[47]/.test(cleaned)) return "amex";
  if (/^636368|438935|504175|451416|636297|5067|4576|4011/.test(cleaned)) return "elo";
  if (/^606282|3841/.test(cleaned)) return "hipercard";
  return "unknown";
};

const CARD_BRAND_NAMES: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  elo: "Elo",
  hipercard: "Hipercard",
  unknown: "",
};

const CARD_BRAND_COLORS: Record<CardBrand, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#006FCF",
  elo: "#00A4E0",
  hipercard: "#B3131B",
  unknown: "#51635F",
};

// Algoritmo de Luhn para validar número de cartão
const validateLuhn = (number: string): boolean => {
  const cleaned = number.replace(/\s/g, "");
  if (!/^\d+$/.test(cleaned) || cleaned.length < 13) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

// Validar CPF
const validateCpf = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(digits[10]);
};

// Máscaras
const maskCardNumber = (v: string): string => {
  const cleaned = v.replace(/\D/g, "").slice(0, 16);
  const brand = detectCardBrand(cleaned);

  // Amex tem formato diferente: 4-6-5
  if (brand === "amex") {
    return cleaned
      .replace(/(\d{4})(\d)/, "$1 $2")
      .replace(/(\d{4} \d{6})(\d)/, "$1 $2");
  }

  // Padrão: 4-4-4-4
  return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const maskCpf = (v: string): string =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1-$2");

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function calcTotal({ subtotal, shipping, couponPercent, pix }: { subtotal: number; shipping: number; couponPercent: number; pix: boolean }) {
  const d1 = (subtotal * couponPercent) / 100;
  const d2 = pix ? (subtotal * 5) / 100 : 0;
  return Math.max(0, subtotal - d1 - d2 + shipping);
}

export function PaymentForm() {
  const { getTotalPrice, items } = useCartStore();
  const { paymentMethod, setPaymentMethod, setPaymentData, setStep, shippingMethod, coupon, customer, shippingAddress } =
    useCheckoutStore();

  const subtotal = getTotalPrice();
  const shipping = SHIPPING_METHODS.find((s) => s.id === shippingMethod)?.price ?? 0;
  const couponPercent = coupon?.discountPercent ?? 0;
  const total = calcTotal({ subtotal, shipping, couponPercent, pix: paymentMethod === "pix" });

  // Calcular desconto real
  const discount = (subtotal * couponPercent) / 100 + (paymentMethod === "pix" ? (subtotal * 5) / 100 : 0);

  // Mapear itens do carrinho para o formato esperado
  const cartItems = items.map(item => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    price: item.price,
    image: item.image,
    variationName: item.variationName,
  }));

  const select = (id: PaymentMethodId) => setPaymentMethod(id);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#E9E1D2] p-6">
        <h3 className="font-serif text-lg text-[#0F3A3E] mb-5">Forma de Pagamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => select(m.id)}
              className={`relative text-left border p-4 transition-all ${
                paymentMethod === m.id ? "border-[#B07B1E] bg-[#F3EEE3]" : "border-[#E9E1D2] hover:border-[#B07B1E]/50"
              }`}
            >
              {"discount" in m && m.discount && (
                <span className="absolute top-2 right-2 bg-[#1C6B4A] text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                  {m.discount}% OFF
                </span>
              )}
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="font-semibold text-[#0F3A3E] text-sm">{m.name}</div>
              <div className="text-xs text-[#51635F] mt-0.5">{m.description}</div>
            </button>
          ))}
        </div>
      </section>

      {paymentMethod === "credit_card" && (
        <CardForm
          total={total}
          subtotal={subtotal}
          discount={discount}
          shippingPrice={shipping}
          shippingMethod={shippingMethod}
          items={cartItems}
          customer={customer}
          shippingAddress={shippingAddress}
          onDone={(data) => { setPaymentData(data); setStep("confirmation"); }}
        />
      )}
      {paymentMethod === "pix" && (
        <PixForm
          total={total}
          subtotal={subtotal}
          discount={discount}
          shippingPrice={shipping}
          shippingMethod={shippingMethod}
          items={cartItems}
          customer={customer}
          shippingAddress={shippingAddress}
          onDone={(data) => { setPaymentData(data); setStep("confirmation"); }}
        />
      )}
      {paymentMethod === "boleto" && (
        <BoletoForm
          total={total}
          subtotal={subtotal}
          discount={discount}
          shippingPrice={shipping}
          shippingMethod={shippingMethod}
          items={cartItems}
          customer={customer}
          shippingAddress={shippingAddress}
          onDone={(data) => { setPaymentData(data); setStep("confirmation"); }}
        />
      )}

      <button
        type="button"
        onClick={() => setStep("shipping")}
        className="text-[12px] uppercase tracking-[0.18em] font-semibold text-[#51635F] hover:text-[#0F3A3E]"
      >
        ← Voltar para Entrega
      </button>
    </div>
  );
}

const inputCls = (error?: string) =>
  `w-full border bg-white px-4 py-3 text-sm text-[#0F3A3E] focus:outline-none transition-colors ${
    error ? "border-red-400 focus:border-red-500" : "border-[#E9E1D2] focus:border-[#B07B1E]"
  }`;

function Field({ label, full, error, children }: { label: string; full?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-[#51635F] font-semibold mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

interface PaymentFormProps {
  total: number;
  subtotal: number;
  discount: number;
  shippingPrice: number;
  shippingMethod: string | null;
  items: Array<{ id: string; title: string; quantity: number; price: number; image?: string }>;
  customer: any;
  shippingAddress: any;
  onDone: (d: any) => void;
}

function CardForm({ total, subtotal, discount, shippingPrice, shippingMethod, items, customer, shippingAddress, onDone }: PaymentFormProps) {
  const { user } = useSupabaseSession();
  const createPaymentFn = useServerFn(createPayment);
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [card, setCard] = useState({ number: "", name: "", month: "", year: "", cvv: "", installments: 1, cpf: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const mpRef = useRef<any>(null);

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i));

  // Detectar bandeira do cartão
  const cardBrand = detectCardBrand(card.number);
  const isAmex = cardBrand === "amex";
  const cvvLength = isAmex ? 4 : 3;

  // Carregar SDK do Mercado Pago
  useEffect(() => {
    if (window.MercadoPago) {
      mpRef.current = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      mpRef.current = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      setSdkLoaded(true);
    };
    script.onerror = () => {
      toast.error("Erro ao carregar SDK de pagamento");
    };
    document.body.appendChild(script);

    return () => {};
  }, []);

  // Validação de campo
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "number":
        if (!value) return "Número do cartão é obrigatório";
        if (!validateLuhn(value)) return "Número do cartão inválido";
        break;
      case "name":
        if (!value) return "Nome é obrigatório";
        if (value.length < 3) return "Nome muito curto";
        if (!/^[A-Z\s]+$/.test(value)) return "Use apenas letras maiúsculas";
        break;
      case "month":
        if (!value) return "Mês é obrigatório";
        break;
      case "year":
        if (!value) return "Ano é obrigatório";
        break;
      case "cvv":
        if (!value) return "CVV é obrigatório";
        if (value.length < cvvLength) return `CVV deve ter ${cvvLength} dígitos`;
        break;
      case "cpf":
        if (!value) return "CPF é obrigatório";
        if (!validateCpf(value)) return "CPF inválido";
        break;
    }
    return undefined;
  };

  // Validar expiração
  const validateExpiration = (): string | undefined => {
    if (!card.month || !card.year) return undefined;
    const now = new Date();
    const expDate = new Date(parseInt(card.year), parseInt(card.month) - 1, 1);
    if (expDate < now) return "Cartão expirado";
    return undefined;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error || "" }));

    // Validar expiração quando mês ou ano mudam
    if (field === "month" || field === "year") {
      const expError = validateExpiration();
      if (expError) {
        setErrors(prev => ({ ...prev, expiration: expError }));
      } else {
        setErrors(prev => ({ ...prev, expiration: "" }));
      }
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    newErrors.number = validateField("number", card.number) || "";
    newErrors.name = validateField("name", card.name) || "";
    newErrors.month = validateField("month", card.month) || "";
    newErrors.year = validateField("year", card.year) || "";
    newErrors.cvv = validateField("cvv", card.cvv) || "";
    newErrors.cpf = validateField("cpf", card.cpf) || "";
    newErrors.expiration = validateExpiration() || "";

    setErrors(newErrors);
    setTouched({ number: true, name: true, month: true, year: true, cvv: true, cpf: true });

    return !Object.values(newErrors).some(Boolean);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) { toast.error("Dados do cliente ausentes"); return; }
    if (!shippingAddress) { toast.error("Endereço de entrega ausente. Volte e preencha os dados de entrega."); return; }
    if (!sdkLoaded || !mpRef.current) { toast.error("SDK de pagamento não carregado. Aguarde..."); return; }

    if (!validateAll()) {
      toast.error("Corrija os campos em vermelho");
      return;
    }

    setLoading(true);

    try {
      const cardNumber = card.number.replace(/\s/g, "");
      const expirationMonth = card.month;
      const expirationYear = card.year;
      const securityCode = card.cvv;
      const cardholderName = card.name;
      const identificationNumber = card.cpf.replace(/\D/g, "");

      let token: string;
      try {
        const tokenResponse = await mpRef.current.createCardToken({
          cardNumber: cardNumber,
          cardholderName: cardholderName,
          cardExpirationMonth: expirationMonth,
          cardExpirationYear: expirationYear.slice(-2),
          securityCode: securityCode,
          identificationType: "CPF",
          identificationNumber: identificationNumber,
        });

        if (!tokenResponse || !tokenResponse.id) {
          throw new Error("Falha ao tokenizar cartão");
        }
        token = tokenResponse.id;
      } catch (tokenError: any) {
        let errorMsg = "Dados do cartão inválidos";
        if (tokenError?.cause && Array.isArray(tokenError.cause)) {
          const causes = tokenError.cause.map((c: any) => c.description || c.message).filter(Boolean);
          if (causes.length > 0) errorMsg = causes.join(". ");
        } else if (tokenError?.message) {
          errorMsg = tokenError.message;
        }
        throw new Error(errorMsg);
      }

      const res: any = await createPaymentFn({
        data: {
          method: "credit_card",
          amount: Number(total.toFixed(2)),
          description: "Pedido Fragranciaria",
          token,
          installments: card.installments,
          payer: {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            identification: { type: "CPF", number: identificationNumber },
            address: shippingAddress
              ? {
                  zipCode: shippingAddress.cep,
                  streetName: shippingAddress.street,
                  streetNumber: shippingAddress.number,
                  neighborhood: shippingAddress.neighborhood,
                  city: shippingAddress.city,
                  state: shippingAddress.state,
                  complement: shippingAddress.complement,
                }
              : undefined,
          },
          items,
          subtotal,
          discount,
          shippingPrice,
          shippingMethod: shippingMethod ?? undefined,
        userId: user?.id,
        },
      });

      if (!res.success) throw new Error(res.error);

      const last4 = cardNumber.slice(-4);

      if (res.data.status === "approved") {
        toast.success("Pagamento aprovado!");
      } else if (res.data.status === "in_process") {
        toast.info("Pagamento em análise. Você receberá uma confirmação em breve.");
      } else if (res.data.status === "rejected") {
        throw new Error("Pagamento recusado. Verifique os dados do cartão ou tente outro método.");
      }

      onDone({
        orderId: res.data.orderId,
        status: res.data.status || "approved",
        cardLast4: last4,
        cardBrand: CARD_BRAND_NAMES[cardBrand],
        installments: card.installments,
        trackingToken: res.data.trackingToken,
        trackingTokenFormatted: res.data.trackingTokenFormatted,
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-[#E9E1D2] p-6 space-y-5">
      {/* Header com segurança */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#0F3A3E]">
          <CreditCard className="w-5 h-5" />
          <h4 className="font-serif text-lg">Dados do Cartão</h4>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#51635F] uppercase tracking-wider">
          <Lock className="w-3 h-3" />
          Pagamento Seguro
        </div>
      </div>

      {/* Bandeira detectada */}
      {cardBrand !== "unknown" && card.number.length >= 4 && (
        <div className="flex items-center gap-2 p-2 bg-[#F3EEE3] border border-[#E9E1D2]">
          <div
            className="w-8 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: CARD_BRAND_COLORS[cardBrand] }}
          >
            {cardBrand === "visa" && "VISA"}
            {cardBrand === "mastercard" && "MC"}
            {cardBrand === "amex" && "AMEX"}
            {cardBrand === "elo" && "ELO"}
            {cardBrand === "hipercard" && "HIPER"}
          </div>
          <span className="text-xs text-[#51635F]">
            {CARD_BRAND_NAMES[cardBrand]} detectado
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Número do Cartão" full error={touched.number ? errors.number : undefined}>
          <input
            required
            value={card.number}
            onChange={(e) => setCard({ ...card, number: maskCardNumber(e.target.value) })}
            onBlur={() => handleBlur("number", card.number)}
            placeholder={isAmex ? "0000 000000 00000" : "0000 0000 0000 0000"}
            className={inputCls(touched.number ? errors.number : undefined)}
            autoComplete="cc-number"
          />
        </Field>

        <Field label="Nome no Cartão" full error={touched.name ? errors.name : undefined}>
          <input
            required
            value={card.name}
            onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase().replace(/[^A-Z\s]/g, "") })}
            onBlur={() => handleBlur("name", card.name)}
            placeholder="COMO ESTÁ NO CARTÃO"
            className={inputCls(touched.name ? errors.name : undefined)}
            autoComplete="cc-name"
          />
        </Field>

        <div className="grid grid-cols-3 gap-2 md:col-span-1">
          <Field label="Mês" error={touched.month ? errors.month || errors.expiration : undefined}>
            <select
              required
              value={card.month}
              onChange={(e) => setCard({ ...card, month: e.target.value })}
              onBlur={() => handleBlur("month", card.month)}
              className={inputCls(touched.month ? errors.month || errors.expiration : undefined)}
              autoComplete="cc-exp-month"
            >
              <option value="">MM</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Ano" error={touched.year ? errors.year : undefined}>
            <select
              required
              value={card.year}
              onChange={(e) => setCard({ ...card, year: e.target.value })}
              onBlur={() => handleBlur("year", card.year)}
              className={inputCls(touched.year ? errors.year : undefined)}
              autoComplete="cc-exp-year"
            >
              <option value="">AAAA</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label={`CVV${isAmex ? " (4 dígitos)" : ""}`} error={touched.cvv ? errors.cvv : undefined}>
            <input
              required
              value={card.cvv}
              onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, cvvLength) })}
              onBlur={() => handleBlur("cvv", card.cvv)}
              placeholder={isAmex ? "0000" : "000"}
              className={inputCls(touched.cvv ? errors.cvv : undefined)}
              autoComplete="cc-csc"
              type="password"
            />
          </Field>
        </div>

        <Field label="Parcelas">
          <select
            value={card.installments}
            onChange={(e) => setCard({ ...card, installments: Number(e.target.value) })}
            className={inputCls()}
          >
            {INSTALLMENTS_OPTIONS.map((o) => (
              <option key={o.installments} value={o.installments}>
                {o.installments}x de {formatBRL(total / o.installments)} sem juros
              </option>
            ))}
          </select>
        </Field>

        <Field label="CPF do Titular" full error={touched.cpf ? errors.cpf : undefined}>
          <input
            required
            value={card.cpf}
            onChange={(e) => setCard({ ...card, cpf: maskCpf(e.target.value) })}
            onBlur={() => handleBlur("cpf", card.cpf)}
            placeholder="000.000.000-00"
            className={inputCls(touched.cpf ? errors.cpf : undefined)}
          />
        </Field>
      </div>

      {/* Selos de segurança */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-[#E9E1D2]">
        <div className="flex items-center gap-1 text-[10px] text-[#51635F]">
          <Shield className="w-3 h-3 text-[#1C6B4A]" />
          Criptografia SSL
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#51635F]">
          <Lock className="w-3 h-3 text-[#1C6B4A]" />
          Dados protegidos
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !sdkLoaded}
        className="w-full bg-[#0F3A3E] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processando...
          </>
        ) : !sdkLoaded ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pagar {formatBRL(total)}
          </>
        )}
      </button>
    </form>
  );
}

function PixForm({ total, subtotal, discount, shippingPrice, shippingMethod, items, customer, shippingAddress, onDone }: PaymentFormProps) {
  const { user } = useSupabaseSession();
  const createPaymentFn = useServerFn(createPayment);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [trackingTokenFormatted, setTrackingTokenFormatted] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(30 * 60);

  useEffect(() => {
    if (!code) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [code]);

  const generate = async () => {
    if (!customer) { toast.error("Dados do cliente ausentes"); return; }
    setLoading(true);
    try {
      const res: any = await createPaymentFn({
        data: {
          method: "pix",
          amount: Number(total.toFixed(2)),
          description: "Pedido Fragranciaria",
          payer: {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            identification: { type: "CPF", number: customer.cpf },
            address: shippingAddress
              ? {
                  zipCode: shippingAddress.cep,
                  streetName: shippingAddress.street,
                  streetNumber: shippingAddress.number,
                  neighborhood: shippingAddress.neighborhood,
                  city: shippingAddress.city,
                  state: shippingAddress.state,
                  complement: shippingAddress.complement,
                }
              : undefined,
          },
          items,
          subtotal,
          discount,
          shippingPrice,
          shippingMethod: shippingMethod ?? undefined,
        userId: user?.id,
        },
      });
      if (!res.success) throw new Error(res.error);
      setCode(res.data.pixCode ?? "");
      setQrBase64(res.data.pixQrCode ?? null);
      setPaymentId(res.data.id);
      setOrderId(res.data.orderId ?? null);
      setTrackingToken(res.data.trackingToken ?? null);
      setTrackingTokenFormatted(res.data.trackingTokenFormatted ?? null);
      toast.success("PIX gerado! Escaneie o QR Code ou copie o código.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar PIX");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const confirm = () => {
    onDone({
      orderId: orderId ?? undefined,
      status: "pending",
      pixCode: code ?? undefined,
      trackingToken: trackingToken ?? undefined,
      trackingTokenFormatted: trackingTokenFormatted ?? undefined,
    });
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="bg-white border border-[#E9E1D2] p-6 space-y-5">
      <div className="bg-[#1C6B4A]/10 border border-[#1C6B4A]/30 text-[#1C6B4A] px-4 py-3 text-sm font-semibold">
        ⚡ Pague com PIX e ganhe 5% de desconto — Total: {formatBRL(total)}
      </div>

      {!code ? (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-[#0F3A3E] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar PIX"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-48 h-48 bg-[#F3EEE3] border border-[#E9E1D2] flex items-center justify-center">
              {qrBase64 ? (
                <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code PIX" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-32 h-32 text-[#0F3A3E]" />
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-[#51635F] uppercase tracking-wider">Expira em</div>
              <div className="font-serif text-2xl text-[#0F3A3E]">{mm}:{ss}</div>
            </div>
          </div>
          <div className="border border-[#E9E1D2] p-3 break-all text-xs text-[#51635F] font-mono">{code}</div>
          <button onClick={copy} className="w-full border border-[#0F3A3E] text-[#0F3A3E] py-3 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#0F3A3E] hover:text-white flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" /> Copiar Código PIX
          </button>
          <button onClick={confirm} className="w-full bg-[#1C6B4A] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#155339] flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Já fiz o pagamento
          </button>
        </div>
      )}
    </div>
  );
}

function BoletoForm({ total, subtotal, discount, shippingPrice, shippingMethod, items, customer, shippingAddress, onDone }: PaymentFormProps) {
  const { user } = useSupabaseSession();
  const createPaymentFn = useServerFn(createPayment);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const generate = async () => {
    if (!customer) { toast.error("Dados do cliente ausentes"); return; }
    setLoading(true);
    try {
      const res: any = await createPaymentFn({
        data: {
          method: "boleto",
          amount: Number(total.toFixed(2)),
          description: "Pedido Fragranciaria",
          payer: {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            identification: { type: "CPF", number: customer.cpf },
            address: shippingAddress
              ? {
                  zipCode: shippingAddress.cep,
                  streetName: shippingAddress.street,
                  streetNumber: shippingAddress.number,
                  neighborhood: shippingAddress.neighborhood,
                  city: shippingAddress.city,
                  state: shippingAddress.state,
                  complement: shippingAddress.complement,
                }
              : undefined,
          },
          items,
          subtotal,
          discount,
          shippingPrice,
          shippingMethod: shippingMethod ?? undefined,
        userId: user?.id,
        },
      });
      if (!res.success) throw new Error(res.error);
      setCode(res.data.boletoBarcode ?? "");
      setBoletoUrl(res.data.boletoUrl ?? null);
      setPaymentId(res.data.id);
      setOrderId(res.data.orderId ?? null);
      toast.success("Boleto gerado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar boleto");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const confirm = () => {
    onDone({ orderId: orderId ?? undefined, status: "pending", boletoCode: code ?? undefined, boletoUrl: boletoUrl ?? undefined });
  };

  return (
    <div className="bg-white border border-[#E9E1D2] p-6 space-y-5">
      <div className="bg-[#F3EEE3] border border-[#E9E1D2] px-4 py-3 text-sm text-[#0F3A3E] flex items-center gap-2">
        <FileText className="w-5 h-5 text-[#B07B1E]" />
        O boleto vence em 3 dias úteis. Total: <strong>{formatBRL(total)}</strong>
      </div>

      {!code ? (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-[#0F3A3E] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar Boleto"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="border border-[#E9E1D2] p-4 text-center">
            <div className="font-mono text-[#0F3A3E] text-sm tracking-wider">{code}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="flex-1 border border-[#0F3A3E] text-[#0F3A3E] py-3 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#0F3A3E] hover:text-white flex items-center justify-center gap-2">
              <Copy className="w-4 h-4" /> Copiar Código
            </button>
            <a
              href={boletoUrl ?? "#"}
              target={boletoUrl ? "_blank" : undefined}
              rel="noreferrer"
              onClick={(e) => { if (!boletoUrl) e.preventDefault(); }}
              className="flex-1 border border-[#0F3A3E] text-[#0F3A3E] py-3 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#0F3A3E] hover:text-white flex items-center justify-center"
            >
              Visualizar Boleto
            </a>
          </div>
          <button onClick={confirm} className="w-full bg-[#1C6B4A] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#155339]">
            Concluir Pedido
          </button>
        </div>
      )}
    </div>
  );
}
