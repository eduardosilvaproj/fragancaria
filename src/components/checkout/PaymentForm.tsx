import { useState, useEffect } from "react";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { useCartStore } from "@/stores/cartStore";
import { cn } from "@/lib/utils";
import { CreditCard, QrCode, FileText, Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { MP_PUBLIC_KEY, INSTALLMENTS_OPTIONS } from "@/config/mercadopago";

interface PaymentFormProps {
  onBack: () => void;
  onSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  subtotal: number;
}

type PaymentMethod = "credit_card" | "pix" | "boleto";

export function PaymentForm({
  onBack,
  onSuccess,
  isLoading,
  setIsLoading,
  subtotal,
}: PaymentFormProps) {
  const { items, clearCart } = useCartStore();
  const {
    customer,
    shippingAddress,
    shippingMethod,
    coupon,
    paymentMethod,
    setPaymentMethod,
    setPaymentData,
  } = useCheckoutStore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    paymentMethod || "credit_card"
  );
  const [mpReady, setMpReady] = useState(false);
  const [cardFormData, setCardFormData] = useState({
    cardNumber: "",
    cardholderName: "",
    expirationMonth: "",
    expirationYear: "",
    securityCode: "",
    installments: "1",
    identificationType: "CPF",
    identificationNumber: customer?.cpf || "",
  });

  // Resultados de pagamento
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
  } | null>(null);
  const [boletoData, setBoletoData] = useState<{
    url: string;
    barcode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const shippingCost = shippingMethod?.price || 0;
  const discount = coupon
    ? coupon.type === "percentage"
      ? subtotal * (coupon.discount / 100)
      : coupon.discount
    : 0;
  const pixDiscount = selectedMethod === "pix" ? subtotal * 0.05 : 0;
  const total = subtotal + shippingCost - discount - pixDiscount;

  // Inicializar SDK do Mercado Pago
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, {
        locale: "pt-BR",
      });
      // @ts-ignore
      window.mp = mp;
      setMpReady(true);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{4})(\d)/, "$1 $2")
      .replace(/(\d{4})(\d)/, "$1 $2")
      .replace(/(\d{4})(\d)/, "$1 $2")
      .replace(/(\d{4})\d+?$/, "$1");
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const createPayment = async (method: PaymentMethod, token?: string) => {
    const payload = {
      method,
      amount: total,
      description: `Pedido Fragranciaria - ${items.length} item(s)`,
      payer: {
        email: customer?.email,
        firstName: customer?.firstName,
        lastName: customer?.lastName,
        identification: {
          type: "CPF",
          number: customer?.cpf,
        },
        address: shippingAddress
          ? {
              zipCode: shippingAddress.zipCode,
              streetName: shippingAddress.street,
              streetNumber: shippingAddress.number,
              neighborhood: shippingAddress.neighborhood,
              city: shippingAddress.city,
              state: shippingAddress.state,
            }
          : undefined,
      },
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      ...(method === "credit_card" && {
        token,
        installments: parseInt(cardFormData.installments),
      }),
    };

    // Em produção, chamar a API real
    // const response = await fetch('/api/create-payment', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // return response.json();

    // Simulação para desenvolvimento
    await new Promise((r) => setTimeout(r, 2000));

    if (method === "pix") {
      return {
        success: true,
        data: {
          id: "PIX_" + Date.now(),
          status: "pending",
          pixQrCode:
            "00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p65204000053039865802BR5925FRAGRANCIARIA COMERCIO6009SAO PAULO62070503***6304",
          pixQrCodeBase64: "",
        },
      };
    } else if (method === "boleto") {
      return {
        success: true,
        data: {
          id: "BOL_" + Date.now(),
          status: "pending",
          boletoUrl: "https://www.mercadopago.com.br/payments/123456/ticket",
          boletoBarcode: "23793.38128 60000.000003 00000.000409 1 84340000012345",
        },
      };
    } else {
      return {
        success: true,
        data: {
          id: "CC_" + Date.now(),
          status: "approved",
        },
      };
    }
  };

  const handleSubmitCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpReady) {
      toast.error("Aguarde o carregamento do pagamento");
      return;
    }

    setIsLoading(true);

    try {
      // @ts-ignore
      const mp = window.mp;

      // Criar token do cartão
      const cardData = {
        cardNumber: cardFormData.cardNumber.replace(/\s/g, ""),
        cardholderName: cardFormData.cardholderName,
        cardExpirationMonth: cardFormData.expirationMonth,
        cardExpirationYear: "20" + cardFormData.expirationYear,
        securityCode: cardFormData.securityCode,
        identificationType: cardFormData.identificationType,
        identificationNumber: cardFormData.identificationNumber.replace(/\D/g, ""),
      };

      // Em produção, usar o SDK real:
      // const { id: token } = await mp.createCardToken(cardData);

      // Simulação
      const token = "CARD_TOKEN_" + Date.now();

      const result = await createPayment("credit_card", token);

      if (result.success) {
        setPaymentMethod("credit_card");
        setPaymentData(result.data);

        if (result.data.status === "approved") {
          toast.success("Pagamento aprovado!");
          clearCart();
          onSuccess();
        } else {
          toast.error("Pagamento não aprovado. Tente novamente.");
        }
      } else {
        toast.error(result.error || "Erro ao processar pagamento");
      }
    } catch (error: any) {
      console.error("Erro no pagamento:", error);
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitPix = async () => {
    setIsLoading(true);

    try {
      const result = await createPayment("pix");

      if (result.success) {
        setPaymentMethod("pix");
        setPaymentData(result.data);
        setPixData({
          qrCode: result.data.pixQrCode,
          qrCodeBase64: result.data.pixQrCodeBase64,
        });
        toast.success("PIX gerado! Escaneie o QR Code para pagar.");
      } else {
        toast.error(result.error || "Erro ao gerar PIX");
      }
    } catch (error: any) {
      console.error("Erro no PIX:", error);
      toast.error(error.message || "Erro ao gerar PIX");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBoleto = async () => {
    setIsLoading(true);

    try {
      const result = await createPayment("boleto");

      if (result.success) {
        setPaymentMethod("boleto");
        setPaymentData(result.data);
        setBoletoData({
          url: result.data.boletoUrl,
          barcode: result.data.boletoBarcode,
        });
        toast.success("Boleto gerado com sucesso!");
      } else {
        toast.error(result.error || "Erro ao gerar boleto");
      }
    } catch (error: any) {
      console.error("Erro no boleto:", error);
      toast.error(error.message || "Erro ao gerar boleto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPixBoleto = () => {
    clearCart();
    onSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#51635F] hover:text-[#0F3A3E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Voltar para entrega</span>
      </button>

      {/* Seleção de método */}
      <div className="bg-white border border-[#E9E1D2] p-6">
        <h3 className="font-serif text-xl text-[#0F3A3E] mb-6">
          Escolha a forma de pagamento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cartão */}
          <button
            onClick={() => {
              setSelectedMethod("credit_card");
              setPixData(null);
              setBoletoData(null);
            }}
            className={cn(
              "p-4 border text-left transition-all",
              selectedMethod === "credit_card"
                ? "border-[#0F3A3E] bg-[#F8F4EA]"
                : "border-[#E9E1D2] hover:border-[#B07B1E]"
            )}
          >
            <CreditCard
              className={cn(
                "h-6 w-6 mb-3",
                selectedMethod === "credit_card"
                  ? "text-[#0F3A3E]"
                  : "text-[#75827E]"
              )}
            />
            <p className="font-medium text-[#0F3A3E]">Cartão de Crédito</p>
            <p className="text-sm text-[#75827E] mt-1">Até 10x sem juros</p>
          </button>

          {/* PIX */}
          <button
            onClick={() => {
              setSelectedMethod("pix");
              setBoletoData(null);
            }}
            className={cn(
              "p-4 border text-left transition-all relative",
              selectedMethod === "pix"
                ? "border-[#0F3A3E] bg-[#F8F4EA]"
                : "border-[#E9E1D2] hover:border-[#B07B1E]"
            )}
          >
            <span className="absolute top-2 right-2 bg-[#1C6B4A] text-white text-[10px] px-2 py-0.5 font-semibold">
              5% OFF
            </span>
            <QrCode
              className={cn(
                "h-6 w-6 mb-3",
                selectedMethod === "pix" ? "text-[#0F3A3E]" : "text-[#75827E]"
              )}
            />
            <p className="font-medium text-[#0F3A3E]">PIX</p>
            <p className="text-sm text-[#75827E] mt-1">Aprovação instantânea</p>
          </button>

          {/* Boleto */}
          <button
            onClick={() => {
              setSelectedMethod("boleto");
              setPixData(null);
            }}
            className={cn(
              "p-4 border text-left transition-all",
              selectedMethod === "boleto"
                ? "border-[#0F3A3E] bg-[#F8F4EA]"
                : "border-[#E9E1D2] hover:border-[#B07B1E]"
            )}
          >
            <FileText
              className={cn(
                "h-6 w-6 mb-3",
                selectedMethod === "boleto"
                  ? "text-[#0F3A3E]"
                  : "text-[#75827E]"
              )}
            />
            <p className="font-medium text-[#0F3A3E]">Boleto</p>
            <p className="text-sm text-[#75827E] mt-1">Vence em 3 dias</p>
          </button>
        </div>
      </div>

      {/* Desconto PIX */}
      {selectedMethod === "pix" && pixDiscount > 0 && (
        <div className="bg-[#E8F5E9] border border-[#1C6B4A]/20 p-4 flex items-center justify-between">
          <p className="text-[#1C6B4A] font-medium">
            🎉 5% de desconto no PIX
          </p>
          <p className="text-[#1C6B4A] font-bold">-{formatPrice(pixDiscount)}</p>
        </div>
      )}

      {/* Formulário de Cartão */}
      {selectedMethod === "credit_card" && (
        <form onSubmit={handleSubmitCreditCard} className="bg-white border border-[#E9E1D2] p-6">
          <h4 className="font-medium text-[#0F3A3E] mb-4">Dados do Cartão</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#51635F] mb-1.5">
                Número do Cartão *
              </label>
              <input
                type="text"
                value={cardFormData.cardNumber}
                onChange={(e) =>
                  setCardFormData((prev) => ({
                    ...prev,
                    cardNumber: formatCardNumber(e.target.value),
                  }))
                }
                required
                maxLength={19}
                className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
                placeholder="0000 0000 0000 0000"
              />
            </div>

            <div>
              <label className="block text-sm text-[#51635F] mb-1.5">
                Nome no Cartão *
              </label>
              <input
                type="text"
                value={cardFormData.cardholderName}
                onChange={(e) =>
                  setCardFormData((prev) => ({
                    ...prev,
                    cardholderName: e.target.value.toUpperCase(),
                  }))
                }
                required
                className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors uppercase"
                placeholder="NOME COMO NO CARTÃO"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#51635F] mb-1.5">
                  Mês *
                </label>
                <select
                  value={cardFormData.expirationMonth}
                  onChange={(e) =>
                    setCardFormData((prev) => ({
                      ...prev,
                      expirationMonth: e.target.value,
                    }))
                  }
                  required
                  className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors bg-white"
                >
                  <option value="">MM</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                      {String(i + 1).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#51635F] mb-1.5">
                  Ano *
                </label>
                <select
                  value={cardFormData.expirationYear}
                  onChange={(e) =>
                    setCardFormData((prev) => ({
                      ...prev,
                      expirationYear: e.target.value,
                    }))
                  }
                  required
                  className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors bg-white"
                >
                  <option value="">AA</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() + i - 2000;
                    return (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#51635F] mb-1.5">
                  CVV *
                </label>
                <input
                  type="text"
                  value={cardFormData.securityCode}
                  onChange={(e) =>
                    setCardFormData((prev) => ({
                      ...prev,
                      securityCode: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  required
                  maxLength={4}
                  className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
                  placeholder="000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#51635F] mb-1.5">
                Parcelas *
              </label>
              <select
                value={cardFormData.installments}
                onChange={(e) =>
                  setCardFormData((prev) => ({
                    ...prev,
                    installments: e.target.value,
                  }))
                }
                required
                className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors bg-white"
              >
                {INSTALLMENTS_OPTIONS.map((opt) => (
                  <option key={opt.installments} value={opt.installments}>
                    {opt.installments}x de {formatPrice(total / opt.installments)}{" "}
                    {opt.label.includes("sem juros") ? "sem juros" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#51635F] mb-1.5">
                CPF do Titular *
              </label>
              <input
                type="text"
                value={cardFormData.identificationNumber}
                onChange={(e) =>
                  setCardFormData((prev) => ({
                    ...prev,
                    identificationNumber: e.target.value,
                  }))
                }
                required
                className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-[#0F3A3E] text-white py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#16504F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>Pagar {formatPrice(total)}</>
            )}
          </button>
        </form>
      )}

      {/* PIX */}
      {selectedMethod === "pix" && (
        <div className="bg-white border border-[#E9E1D2] p-6">
          {!pixData ? (
            <div className="text-center">
              <QrCode className="h-16 w-16 mx-auto text-[#0F3A3E] mb-4" />
              <p className="text-[#51635F] mb-6">
                Clique no botão abaixo para gerar o QR Code do PIX
              </p>
              <button
                onClick={handleSubmitPix}
                disabled={isLoading}
                className="w-full bg-[#0F3A3E] text-white py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#16504F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>Gerar PIX - {formatPrice(total)}</>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <h4 className="font-medium text-[#0F3A3E] mb-4">
                Escaneie o QR Code ou copie o código
              </h4>

              {/* QR Code placeholder */}
              <div className="w-48 h-48 mx-auto bg-[#F8F4EA] border border-[#E9E1D2] flex items-center justify-center mb-4">
                <QrCode className="h-32 w-32 text-[#0F3A3E]" />
              </div>

              {/* Código copia e cola */}
              <div className="bg-[#F8F4EA] p-4 mb-4">
                <p className="text-xs text-[#75827E] mb-2">Código PIX</p>
                <p className="text-sm text-[#0F3A3E] break-all font-mono">
                  {pixData.qrCode.slice(0, 50)}...
                </p>
                <button
                  onClick={() => handleCopy(pixData.qrCode)}
                  className="mt-3 flex items-center gap-2 mx-auto text-[#B07B1E] hover:text-[#8B5A00] transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {copied ? "Copiado!" : "Copiar código"}
                  </span>
                </button>
              </div>

              <p className="text-sm text-[#75827E] mb-6">
                O PIX expira em 30 minutos. Após o pagamento, você receberá a
                confirmação por e-mail.
              </p>

              <button
                onClick={handleConfirmPixBoleto}
                className="w-full bg-[#1C6B4A] text-white py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#155438] transition-colors"
              >
                Já fiz o pagamento
              </button>
            </div>
          )}
        </div>
      )}

      {/* Boleto */}
      {selectedMethod === "boleto" && (
        <div className="bg-white border border-[#E9E1D2] p-6">
          {!boletoData ? (
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto text-[#0F3A3E] mb-4" />
              <p className="text-[#51635F] mb-6">
                Clique no botão abaixo para gerar o boleto bancário
              </p>
              <p className="text-sm text-[#B07B1E] mb-6">
                ⚠️ O boleto vence em 3 dias úteis. O pedido será confirmado após
                a compensação (1-3 dias úteis).
              </p>
              <button
                onClick={handleSubmitBoleto}
                disabled={isLoading}
                className="w-full bg-[#0F3A3E] text-white py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#16504F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gerando Boleto...
                  </>
                ) : (
                  <>Gerar Boleto - {formatPrice(total)}</>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <h4 className="font-medium text-[#0F3A3E] mb-4">
                Boleto gerado com sucesso!
              </h4>

              {/* Código de barras */}
              <div className="bg-[#F8F4EA] p-4 mb-4">
                <p className="text-xs text-[#75827E] mb-2">Código de barras</p>
                <p className="text-sm text-[#0F3A3E] font-mono">
                  {boletoData.barcode}
                </p>
                <button
                  onClick={() => handleCopy(boletoData.barcode)}
                  className="mt-3 flex items-center gap-2 mx-auto text-[#B07B1E] hover:text-[#8B5A00] transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {copied ? "Copiado!" : "Copiar código"}
                  </span>
                </button>
              </div>

              <a
                href={boletoData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full bg-[#0F3A3E] text-white py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#16504F] transition-colors mb-4"
              >
                Visualizar Boleto
              </a>

              <p className="text-sm text-[#75827E] mb-6">
                Você também receberá o boleto por e-mail.
              </p>

              <button
                onClick={handleConfirmPixBoleto}
                className="w-full border border-[#0F3A3E] text-[#0F3A3E] py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#F8F4EA] transition-colors"
              >
                Concluir pedido
              </button>
            </div>
          )}
        </div>
      )}

      {/* Segurança */}
      <div className="flex items-center justify-center gap-6 text-[#75827E]">
        <div className="flex items-center gap-2 text-xs">
          <span>🔒</span>
          Ambiente seguro
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>💳</span>
          Dados criptografados
        </div>
      </div>
    </div>
  );
}
