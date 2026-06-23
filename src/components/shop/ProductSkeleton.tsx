import { cn } from "@/lib/utils";

interface ProductSkeletonProps {
  className?: string;
}

export const ProductSkeleton = ({ className }: ProductSkeletonProps) => {
  return (
    <div className={cn("group relative bg-white overflow-hidden animate-pulse", className)}>
      {/* Image skeleton */}
      <div className="aspect-[3/4] bg-gradient-to-br from-[#F3EEE3] to-[#E8E4DE]" />

      {/* Content skeleton */}
      <div className="p-6 space-y-3">
        {/* Brand */}
        <div className="h-3 w-20 bg-[#B07B1E]/20 rounded" />

        {/* Title */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-[#0F3A3E]/10 rounded" />
          <div className="h-4 w-2/3 bg-[#0F3A3E]/10 rounded" />
        </div>

        {/* Price */}
        <div className="h-5 w-24 bg-[#0F3A3E]/15 rounded mt-2" />
      </div>
    </div>
  );
};

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

export const ProductGridSkeleton = ({ count = 4, className }: ProductGridSkeletonProps) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8", className)}>
      {[...Array(count)].map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
};
