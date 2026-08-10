import { createFileRoute } from "@tanstack/react-router";
import { NfeSection } from "@/components/admin/NfeSection";

export const Route = createFileRoute("/admin/nfe")({
  component: AdminNfePage,
});

function AdminNfePage() {
  return (
    <div className="p-6">
      <NfeSection />
    </div>
  );
}
