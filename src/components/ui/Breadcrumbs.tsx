import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  search?: Record<string, unknown>;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center flex-wrap gap-1.5 text-[12px] md:text-[13px]", className)}
    >
      {/* Home */}
      <Link
        to="/"
        className="flex items-center gap-1 text-[#75827E] hover:text-[#0F3A3E] transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Início</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-[#B8AFA0]" />
          {item.href && index < items.length - 1 ? (
            <Link
              to={item.href}
              search={item.search}
              className="text-[#75827E] hover:text-[#0F3A3E] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[#0F3A3E] font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// Helper to generate breadcrumbs from route
export function generateProductBreadcrumbs(product: {
  name: string;
  category?: string;
  brand?: string;
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: "Produtos", href: "/produtos" },
  ];

  if (product.category) {
    items.push({
      label: product.category,
      href: "/produtos",
      search: { productType: product.category },
    });
  }

  if (product.brand) {
    items.push({
      label: product.brand,
      href: "/produtos",
      search: { brand: product.brand },
    });
  }

  items.push({ label: product.name });

  return items;
}

export function generateCategoryBreadcrumbs(
  categoryName?: string,
  brandName?: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: "Produtos", href: "/produtos" },
  ];

  if (categoryName) {
    items.push({ label: categoryName });
  }

  if (brandName) {
    items.push({ label: brandName });
  }

  return items;
}
