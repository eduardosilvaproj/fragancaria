import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { PaymentForm } from "@/components/checkout/PaymentForm";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { items } = useCartStore();
  const { step, setStep, clearCheckout } = useCheckoutStore();
  const [isLoading, setIsLoading] = useState(false);

  // Se carrinho vazio e não está na confirmação, volta para home
  useEffect(() => {
    if (items.length === 0 && step !== 'confirmation') {
      navigate({ to: "/" });
    }
  }, [items.length, step, navigate]);

  // Iniciar na etapa de shipping quando entrar no checkout
  useEffect(() => {
    if (items.length > 0 && step === 'cart') {
      setStep('shipping');
    }
  }, [items.length, step, setStep]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="min-h-screen bg-[#F3EEE3] flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-[#B07B1E] mb-4" />
          <h2 className="font-serif text-2xl text-[#0F3A3E] mb-2">Carrinho vazio</h2>
          <p className="text-[#51635F] mb-6">Adicione produtos para continuar</p>
          <Link
            to="/produtos"
            className="inline-block bg-[#0F3A3E] text-white px-8 py-3 text-sm uppercase tracking-wider hover:bg-[#16504F] transition-colors"
          >
            Ver produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />

      <main className="py-8 md:py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/produtos"
              className="inline-flex items-center gap-2 text-[#51635F] hover:text-[#0F3A3E] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Continuar comprando</span>
            </Link>
            <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
              Finalizar Compra
            </h1>
          </div>

          {/* Progress Steps */}
          <CheckoutSteps currentStep={step} />

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {step === 'shipping' && (
                <ShippingForm
                  onNext={() => setStep('payment')}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              )}

              {step === 'payment' && (
                <PaymentForm
                  onBack={() => setStep('shipping')}
                  onSuccess={() => setStep('confirmation')}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  subtotal={subtotal}
                />
              )}

              {step === 'confirmation' && (
                <OrderConfirmation onNewOrder={clearCheckout} />
              )}
            </div>

            {/* Sidebar - Order Summary */}
            {step !== 'confirmation' && (
              <div className="lg:col-span-1">
                <CheckoutSummary />
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterEditorial />
    </div>
  );
}

export default CheckoutPage;
