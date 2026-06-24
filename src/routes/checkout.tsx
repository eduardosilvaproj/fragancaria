import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { ShippingForm } from "@/components/checkout/ShippingForm";
import { PaymentForm } from "@/components/checkout/PaymentForm";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar Compra | Fragranciaria" },
      { name: "description", content: "Finalize sua compra com segurança." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const { step } = useCheckoutStore();

  useEffect(() => {
    if (items.length === 0 && step !== "confirmation") {
      navigate({ to: "/" });
    }
  }, [items.length, step, navigate]);

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <header className="bg-white border-b border-[#E9E1D2]">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-[#51635F] hover:text-[#0F3A3E]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline uppercase tracking-wider text-[11px] font-semibold">Voltar</span>
          </Link>
          <h1 className="font-serif text-2xl text-[#0F3A3E] flex-1 text-center">Finalizar Compra</h1>
          <div className="w-16" />
        </div>
        <CheckoutSteps current={step} />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {step === "confirmation" ? (
          <OrderConfirmation />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {step === "shipping" && <ShippingForm />}
              {step === "payment" && <PaymentForm />}
            </div>
            <div className="lg:col-span-1">
              <CheckoutSummary />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}