import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  className?: string;
}

export function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 10,
  className,
}: PriceRangeSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState<"min" | "max" | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue[0] !== value[0] || localValue[1] !== value[1]) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  const getPercentage = useCallback(
    (val: number) => ((val - min) / (max - min)) * 100,
    [min, max]
  );

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), localValue[1] - step);
    setLocalValue([newMin, localValue[1]]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), localValue[0] + step);
    setLocalValue([localValue[0], newMax]);
  };

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Price Display */}
      <div className="flex items-center justify-between text-[13px] text-[#51635F]">
        <span>{formatPrice(localValue[0])}</span>
        <span className="text-[#B8AFA0]">—</span>
        <span>{formatPrice(localValue[1])}</span>
      </div>

      {/* Slider Track */}
      <div className="relative h-2 mt-2">
        {/* Background track */}
        <div className="absolute inset-0 bg-[#E9E1D2] rounded-full" />

        {/* Active track */}
        <div
          className="absolute h-full bg-[#0F3A3E] rounded-full"
          style={{
            left: `${getPercentage(localValue[0])}%`,
            right: `${100 - getPercentage(localValue[1])}%`,
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={handleMinChange}
          onMouseDown={() => setIsDragging("min")}
          onMouseUp={() => setIsDragging(null)}
          onTouchStart={() => setIsDragging("min")}
          onTouchEnd={() => setIsDragging(null)}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0F3A3E] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0F3A3E] [&::-moz-range-thumb]:cursor-pointer"
          aria-label="Preço mínimo"
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={handleMaxChange}
          onMouseDown={() => setIsDragging("max")}
          onMouseUp={() => setIsDragging(null)}
          onTouchStart={() => setIsDragging("max")}
          onTouchEnd={() => setIsDragging(null)}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0F3A3E] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0F3A3E] [&::-moz-range-thumb]:cursor-pointer"
          aria-label="Preço máximo"
        />
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2 mt-3">
        {[
          { label: "Até R$50", range: [min, 50] as [number, number] },
          { label: "R$50 - R$100", range: [50, 100] as [number, number] },
          { label: "R$100 - R$200", range: [100, 200] as [number, number] },
          { label: "Acima de R$200", range: [200, max] as [number, number] },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => setLocalValue(preset.range)}
            className={cn(
              "px-2.5 py-1 text-[11px] border transition-colors",
              localValue[0] === preset.range[0] && localValue[1] === preset.range[1]
                ? "border-[#0F3A3E] bg-[#0F3A3E] text-white"
                : "border-[#E9E1D2] text-[#51635F] hover:border-[#0F3A3E]"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
