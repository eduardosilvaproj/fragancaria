import { Link } from "@tanstack/react-router";
import { CheckCircle2, Package, MapPin, CreditCard, Copy } from "lucide-react";
import { toast } from "sonner";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { PAYMENT_METHODS, SHIPPING_METHODS } from "@/config/mercadopago";

// Só aceitamos UUIDs reais do Supabase. O `payment_id` do Mercado Pago é
// numérico (ex: 165965290803) e quebra o `.eq("id", ...)` na rota
// /pedido/$id. Sem essa guarda, o link "Acompanhar Pedido" abre página
// com erro 22P02 (invalid input syntax for type uuid).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string | undefined | null): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

export function OrderConfirmation() {
  const { customer, shippingAddress, shippingMethod, paymentMethod, paymentData, clearCheckout } = useCheckoutStore();

  const shipping = SHIPPING_METHODS.find((s) => s.id === shippingMethod);
  const payment = PAYMENT_METHODS.find((p) => p.id === paymentMethod);

  const statusLabel =
    paymentData?.status === "approved" ? "Aprovado" : paymentData?.status === "rejected" ? "Recusado" : "Aguardando pagamento";
  const statusClass =
    paymentData?.status === "approved"
      ? "bg-[#1C6B4A] text-white"
      : paymentData?.status === "rejected"
      ? "bg-red-600 text-white"
      : "bg-[#B07B1E] text-white";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center py-6">
        <div className="w-20 h-20 bg-[#1C6B4A] rounded-full mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-3xl text-[#0F3A3E]">Pedido Confirmado!</h2>
        <p className="text-[#51635F] mt-2">
          Obrigado pela sua compra{customer?.firstName ? `, ${customer.firstName}` : ""}!
        </p>
      </div>

      <div className="bg-white border border-[#E9E1D2] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E9E1D2] pb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#51635F]">Pedido</div>
            <div className="font-serif text-xl text-[#0F3A3E]">#{paymentData?.orderId ?? "-----"}</div>
          </div>
          <span className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-bold ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <Row icon={CreditCard} label="Pagamento" value={payment?.name ?? "—"} />
        <Row icon={Package} label="Envio" value={shipping ? `${shipping.name} • ${shipping.days}` : "—"} />
        {shippingAddress && (
          <Row
            icon={MapPin}
            label="Endereço"
            value={`${shippingAddress.street}, ${shippingAddress.number} — ${shippingAddress.neighborhood}, ${shippingAddress.city}/${shippingAddress.state}`}
          />
        )}
      </div>

      {paymentData?.trackingTokenFormatted && (
        <div className="bg-white border border-[#E9E1D2] p-6 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#51635F] font-semibold">
            Código de rastreio
          </div>
          <p className="text-sm text-[#51635F]">
            Guarde este código. Use-o em "Rastrear pedido" para acompanhar sua compra
            sem precisar de conta.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-lg text-[#0F3A3E] tracking-wider bg-[#F3EEE3] border border-[#E9E1D2] px-4 py-3 text-center">
              {paymentData.trackingTokenFormatted}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  paymentData.trackingToken ?? paymentData.trackingTokenFormatted ?? "",
                );
                toast.success("Código copiado!");
              }}
              className="border border-[#0F3A3E] text-[#0F3A3E] px-4 py-3 hover:bg-[#0F3A3E] hover:text-white"
              aria-label="Copiar código de rastreio"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#F3EEE3] border border-[#E9E1D2] p-6">
        <h3 className="font-serif text-lg text-[#0F3A3E] mb-3">Próximos passos</h3>
        <ul className="space-y-2 text-sm text-[#51635F] list-disc list-inside">
          <li>Você receberá um e-mail de confirmação em {customer?.email || "seu endereço cadastrado"}.</li>
          <li>Acompanharemos a separação do pedido nas próximas 24 horas.</li>
          <li>O código de rastreamento será enviado assim que a transportadora coletar.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {paymentData?.trackingToken ? (
          <Link
            to="/pedido/$token"
            params={{ token: paymentData.trackingToken }}
            className="flex-1 bg-[#B07B1E] text-white py-4 text-center text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#8f6418]"
          >
            Acompanhar Pedido →
          </Link>
        ) : (
          <a
            href={`/minha-conta/pedidos`}
            className="flex-1 bg-[#B07B1E] text-white py-4 text-center text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#8f6418]"
          >
            Ver Meus Pedidos
          </a>
        )}
        <Link
          to="/"
          onClick={() => clearCheckout()}
          className="flex-1 bg-[#0F3A3E] text-white py-4 text-center text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F]"
        >
          Continuar Comprando
        </Link>
        <Link
          to="/produtos"
          onClick={() => clearCheckout()}
          className="flex-1 border border-[#0F3A3E] text-[#0F3A3E] py-4 text-center text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#0F3A3E] hover:text-white"
        >
          Ver Mais Produtos
        </Link>
      </div>

      <p className="text-center text-xs text-[#51635F]">
        Precisa de ajuda?{" "}
        <Link to="/contato" className="text-[#B07B1E] underline">
          Fale com o suporte
        </Link>
      </p>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="w-5 h-5 text-[#B07B1E] flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#51635F] font-semibold">{label}</div>
        <div className="text-sm text-[#0F3A3E]">{value}</div>
      </div>
    </div>
  );
}