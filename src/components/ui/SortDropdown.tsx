import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption = {
  value: string;
  label: string;
};

const SORT_OPTIONS: SortOption[] = [
  { value: "relevance", label: "Mais relevantes" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
  { value: "name-asc", label: "A - Z" },
  { value: "name-desc", label: "Z - A" },
  { value: "newest", label: "Mais recentes" },
  { value: "discount", label: "Maiores descontos" },
];

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SortDropdown({ value, onChange, className }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 border border-[#E9E1D2] bg-white text-[13px] text-[#0F3A3E] hover:border-[#0F3A3E] transition-colors"
      >
        <span className="text-[#75827E]">Ordenar:</span>
        <span className="font-medium">{selectedOption.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[#75827E] transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-[#E9E1D2] shadow-lg z-20">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-[13px] transition-colors",
                  option.value === value
                    ? "bg-[#0F3A3E] text-white"
                    : "text-[#0F3A3E] hover:bg-[#F8F4EA]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Sort function to use with products
export function sortProducts<T extends { name: string; price: number; originalPrice?: number }>(
  products: T[],
  sortBy: string
): T[] {
  const sorted = [...products];

  switch (sortBy) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
    case "discount":
      return sorted.sort((a, b) => {
        const discountA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const discountB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return discountB - discountA;
      });
    case "newest":
    case "relevance":
    default:
      return sorted; // Keep original order
  }
}
