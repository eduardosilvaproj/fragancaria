import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-[#E9E1D2] via-[#F8F4EA] to-[#E9E1D2] bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  );
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-[#E9E1D2]">
      {/* Image */}
      <div className="relative bg-[#F8F4EA] p-4 md:p-8">
        <Skeleton className="w-full h-[140px] md:h-[190px]" />
      </div>

      {/* Content */}
      <div className="p-4 md:p-[22px]">
        {/* Brand */}
        <Skeleton className="h-3 w-20 mb-2" />

        {/* Title */}
        <Skeleton className="h-5 w-full mb-1" />
        <Skeleton className="h-5 w-3/4 mb-3" />

        {/* Price */}
        <Skeleton className="h-6 w-24 mb-2" />

        {/* Installments */}
        <Skeleton className="h-3 w-32 mb-4" />

        {/* Button */}
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function CategoryCardSkeleton() {
  return (
    <div className="bg-white border border-[#E6DECE] overflow-hidden">
      <Skeleton className="w-full h-[120px] md:h-[180px]" />
      <div className="p-4 md:p-7">
        <Skeleton className="h-4 w-8 mb-3" />
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-3 w-full hidden sm:block" />
      </div>
    </div>
  );
}

export { Skeleton, ProductCardSkeleton, ProductGridSkeleton, CategoryCardSkeleton };
