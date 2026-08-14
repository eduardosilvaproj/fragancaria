import { cn } from "@/lib/utils";

type BrandLogoVariant = "horizontal" | "compact" | "full" | "mark";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
};

const SRC: Record<BrandLogoVariant, string> = {
  horizontal: "/images/logo-horizontal.svg",
  compact: "/images/logo-compact.svg",
  full: "/images/logo-full.svg",
  mark: "/images/logo-mark.svg",
};

const SIZE: Record<BrandLogoVariant, string> = {
  horizontal: "h-10 w-auto",
  compact: "h-10 w-auto",
  full: "h-16 w-auto",
  mark: "h-8 w-8",
};

export function BrandLogo({ variant = "compact", className }: BrandLogoProps) {
  return <img src={SRC[variant]} alt="Fragranciaria" className={cn(SIZE[variant], className)} />;
}
