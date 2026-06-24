import { Link } from "@tanstack/react-router";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { CheckCircle, Package, Mail, ArrowRight } from "lucide-react";

interface OrderConfirmationProps {
  onNewOrder: () => void;
}

export function OrderConfirmation({ onNewOrder }: OrderConfirmationProps) {
  const { customer, paymentData, paymentMethod, shippingAddress, shippingMethod } =
    useCheckoutStore();

  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case "credit_card":
        return "Cartão de Crédito";
      case "pix":
        return "PIX";
      case "boleto":
        return "Boleto Bancário";
      default:
        return "";
    }
  };

  const getStatusLabel = () => {
    switch (paymentData?.status) {
      case "approved":
        return { text: "Aprovado", color: "text-[#1C6B4A]", bg: "bg-[#E8F5E9]" };
      case "pending":
        return { text: "Aguardando pagamento", color: "text-[#B07B1E]", bg: "bg-[#FFF8E1]" };
      default:
        return { text: "Processando", color: "text-[#51635F]", bg: "bg-[#F8F4EA]" };
    }
  };

  const status = getStatusLabel();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header de sucesso */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-[#1C6B4A]" />
        </div>
        <h2 className="font-serif text-3xl text-[#0F3A3E] mb-2">
          Pedido Confirmado!
        </h2>
        <p className="text-[#51635F]">
          Obrigado pela sua compra, {customer?.firstName}!
        </p>
      </div>

      {/* Detalhes do pedido */}
      <div className="bg-white border border-[#E9E1D2] p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-[#75827E]">Número do pedido</p>
            <p className="font-serif text-xl text-[#0F3A3E]">
              #{paymentData?.id?.slice(-8).toUpperCase() || "00000000"}
            </p>
          </div>
          <div className={`${status.bg} px-4 py-2`}>
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Forma de pagamento */}
          <div>
            <p className="text-sm text-[#75827E] mb-2">Forma de pagamento</p>
            <p className="text-[#0F3A3E] font-medium">{getPaymentMethodLabel()}</p>
            {paymentMethod === "pix" && paymentData?.status === "pending" && (
              <p className="text-sm text-[#B07B1E] mt-1">
                Aguardando confirmação do PIX
              </p>
            )}
            {paymentMethod === "boleto" && paymentData?.status === "pending" && (
              <p className="text-sm text-[#B07B1E] mt-1">
                Boleto vence em 3 dias úteis
              </p>
            )}
          </div>

          {/* Entrega */}
          <div>
            <p className="text-sm text-[#75827E] mb-2">Método de entrega</p>
            <p className="text-[#0F3A3E] font-medium">{shippingMethod?.name}</p>
            <p className="text-sm text-[#51635F] mt-1">
              Previsão: {shippingMethod?.estimatedDays} dias úteis
            </p>
          </div>
        </div>

        {/* Endereço */}
        <div className="mt-6 pt-6 border-t border-[#E9E1D2]">
          <p className="text-sm text-[#75827E] mb-2">Endereço de entrega</p>
          <p className="text-[#0F3A3E]">
            {shippingAddress?.street}, {shippingAddress?.number}
            {shippingAddress?.complement && ` - ${shippingAddress.complement}`}
          </p>
          <p className="text-[#51635F] text-sm">
            {shippingAddress?.neighborhood} - {shippingAddress?.city}/{shippingAddress?.state}
          </p>
          <p className="text-[#51635F] text-sm">CEP: {shippingAddress?.zipCode}</p>
        </div>
      </div>

      {/* Próximos passos */}
      <div className="bg-[#F8F4EA] border border-[#E9E1D2] p-6 mb-6">
        <h3 className="font-medium text-[#0F3A3E] mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Próximos passos
        </h3>
        <ul className="space-y-3 text-sm text-[#51635F]">
          <li className="flex items-start gap-2">
            <span className="text-[#1C6B4A]">✓</span>
            Enviamos um e-mail de confirmação para {customer?.email}
          </li>
          <li className="flex items-start gap-2">
            <Package className="h-4 w-4 text-[#B07B1E] mt-0.5" />
            {paymentData?.status === "approved" ? (
              "Seu pedido está sendo preparado e em breve será enviado"
            ) : (
              "Após a confirmação do pagamento, seu pedido será preparado"
            )}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#0F3A3E]">📦</span>
            Você receberá o código de rastreamento por e-mail
          </li>
        </ul>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/"
          onClick={onNewOrder}
          className="flex-1 bg-[#0F3A3E] text-white py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#16504F] transition-colors text-center flex items-center justify-center gap-2"
        >
          Continuar comprando
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/produtos"
          className="flex-1 border border-[#0F3A3E] text-[#0F3A3E] py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#F8F4EA] transition-colors text-center"
        >
          Ver mais produtos
        </Link>
      </div>

      {/* Suporte */}
      <div className="text-center mt-8 text-sm text-[#75827E]">
        <p>
          Dúvidas? Entre em contato:{" "}
          <a
            href="mailto:contato@fragranciaria.com.br"
            className="text-[#B07B1E] hover:underline"
          >
            contato@fragranciaria.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
