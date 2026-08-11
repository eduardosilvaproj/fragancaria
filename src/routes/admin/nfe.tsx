import { createFileRoute } from "@tanstack/react-router";
import { NfeSection } from "@/components/admin/NfeSection";

export const Route = createFileRoute("/admin/nfe")({
  component: NfePage,
});

function NfePage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-[#0F3A3E] font-serif">Nota Fiscal</h1>
      </div>
      <NfeSection />
    </div>
  );
}
