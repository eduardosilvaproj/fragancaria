import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
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
      <NavbarEditorial />
      <header className="bg-white border-b border-[#E9E1D2]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-center">
          <h1 className="font-serif text-xl text-[#0F3A3E]">Finalizar Compra</h1>
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