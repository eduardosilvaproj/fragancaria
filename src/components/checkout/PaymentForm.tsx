import { useEffect, useState } from "react";
import { CreditCard, Loader2, Copy, QrCode, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { PAYMENT_METHODS, SHIPPING_METHODS, INSTALLMENTS_OPTIONS, type PaymentMethodId } from "@/config/mercadopago";
import { useServerFn } from "@tanstack/react-start";
import { createPayment } from "@/lib/payments.functions";

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

const inputCls =
  "w-full border border-[#E9E1D2] bg-white px-4 py-3 text-sm text-[#0F3A3E] focus:outline-none focus:border-[#B07B1E] transition-colors";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-[#51635F] font-semibold mb-1.5">{label}</label>
      {children}
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
  const createPaymentFn = useServerFn(createPayment);
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState({ number: "", name: "", month: "", year: "", cvv: "", installments: 1, cpf: "" });

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) { toast.error("Dados do cliente ausentes"); return; }
    setLoading(true);

    try {
      // Para cartão, precisamos tokenizar primeiro (integração completa com MP SDK)
      // Por enquanto, simular pagamento aprovado e salvar no Supabase
      const res: any = await createPaymentFn({
        data: {
          method: "credit_card",
          amount: Number(total.toFixed(2)),
          description: "Pedido Fragranciaria",
          token: "simulated_token", // Em produção: usar MP SDK para tokenizar
          installments: card.installments,
          payer: {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            identification: { type: "CPF", number: card.cpf || customer.cpf },
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
        },
      });

      if (!res.success) throw new Error(res.error);

      const last4 = card.number.replace(/\D/g, "").slice(-4);
      toast.success("Pagamento aprovado!");
      onDone({
        orderId: res.data.orderId || res.data.id,
        status: res.data.status || "approved",
        cardLast4: last4,
        installments: card.installments
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-[#E9E1D2] p-6 space-y-5">
      <div className="flex items-center gap-2 text-[#0F3A3E]">
        <CreditCard className="w-5 h-5" />
        <h4 className="font-serif text-lg">Dados do Cartão</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Número do Cartão" full>
          <input
            required
            value={card.number}
            onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ") })}
            placeholder="0000 0000 0000 0000"
            className={inputCls}
          />
        </Field>
        <Field label="Nome no Cartão" full>
          <input required value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-3 gap-2 md:col-span-1">
          <Field label="Mês">
            <select required value={card.month} onChange={(e) => setCard({ ...card, month: e.target.value })} className={inputCls}>
              <option value="">MM</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Ano">
            <select required value={card.year} onChange={(e) => setCard({ ...card, year: e.target.value })} className={inputCls}>
              <option value="">AAAA</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="CVV">
            <input required value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="000" className={inputCls} />
          </Field>
        </div>
        <Field label="Parcelas">
          <select value={card.installments} onChange={(e) => setCard({ ...card, installments: Number(e.target.value) })} className={inputCls}>
            {INSTALLMENTS_OPTIONS.map((o) => (
              <option key={o.installments} value={o.installments}>
                {o.installments}x de {formatBRL(total / o.installments)} sem juros
              </option>
            ))}
          </select>
        </Field>
        <Field label="CPF do Titular" full>
          <input required value={card.cpf} onChange={(e) => setCard({ ...card, cpf: e.target.value })} placeholder="000.000.000-00" className={inputCls} />
        </Field>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0F3A3E] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pagar ${formatBRL(total)}`}
      </button>
    </form>
  );
}

function PixForm({ total, subtotal, discount, shippingPrice, shippingMethod, items, customer, shippingAddress, onDone }: PaymentFormProps) {
  const createPaymentFn = useServerFn(createPayment);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
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
        },
      });
      if (!res.success) throw new Error(res.error);
      setCode(res.data.pixQrCode ?? "");
      setQrBase64(res.data.pixQrCodeBase64 ?? null);
      setPaymentId(res.data.id);
      setOrderId(res.data.orderId ?? null);
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
    onDone({ orderId: orderId || paymentId || "PENDING", status: "pending", pixCode: code ?? undefined });
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
    onDone({ orderId: orderId || paymentId || "PENDING", status: "pending", boletoCode: code ?? undefined, boletoUrl: boletoUrl ?? undefined });
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
