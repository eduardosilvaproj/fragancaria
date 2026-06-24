import { cn } from "@/lib/utils";
import { Check, Truck, CreditCard, Package } from "lucide-react";

interface CheckoutStepsProps {
  currentStep: 'cart' | 'shipping' | 'payment' | 'confirmation';
}

const steps = [
  { id: 'shipping', label: 'Entrega', icon: Truck },
  { id: 'payment', label: 'Pagamento', icon: CreditCard },
  { id: 'confirmation', label: 'Confirmação', icon: Package },
];

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center gap-4 md:gap-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all",
                  isCompleted && "bg-[#1C6B4A] text-white",
                  isCurrent && "bg-[#0F3A3E] text-white",
                  !isCompleted && !isCurrent && "bg-[#E9E1D2] text-[#75827E]"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 md:h-6 md:w-6" />
                ) : (
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs md:text-sm font-medium",
                  isCurrent ? "text-[#0F3A3E]" : "text-[#75827E]"
                )}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-12 md:w-24 h-0.5 mx-2 md:mx-4",
                  index < currentIndex ? "bg-[#1C6B4A]" : "bg-[#E9E1D2]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
