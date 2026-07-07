import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  accent = "#B07B1E",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5 flex items-start gap-4">
      {icon && (
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}20`, color: accent }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[#8A938E] font-semibold">
          {label}
        </p>
        <p className="text-2xl font-semibold text-[#0F3A3E] mt-1">{value}</p>
        {hint && <p className="text-xs text-[#51635F] mt-1">{hint}</p>}
      </div>
    </div>
  );
}

export function PointsProgress({
  points,
  tier,
  tierMin,
  nextTier,
  nextMin,
}: {
  points: number;
  tier: string;
  tierMin: number;
  nextTier: string | null;
  nextMin: number | null;
}) {
  const target = nextMin ?? tierMin + 1000;
  const pct = nextMin
    ? Math.min(100, Math.max(0, ((points - tierMin) / (nextMin - tierMin)) * 100))
    : 100;
  return (
    <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] font-semibold">
            Programa de pontos
          </p>
          <p className="text-base font-semibold text-[#0F3A3E] mt-1">
            Nivel {tier}
          </p>
        </div>
        <p className="text-2xl font-bold text-[#B07B1E]">{points} pts</p>
      </div>
      <div className="mt-3 h-2 bg-[#F5F3EE] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg,#B07B1E,#0F3A3E)",
          }}
        />
      </div>
      <p className="text-xs text-[#51635F] mt-2">
        {nextTier && nextMin
          ? `Faltam ${Math.max(0, nextMin - points)} pontos para ${nextTier}`
          : "Voce esta no nivel mais alto!"}
      </p>
    </div>
  );
}

export default StatCard;
