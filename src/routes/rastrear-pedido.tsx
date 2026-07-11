import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { toast } from "sonner";

export const Route = createFileRoute("/rastrear-pedido")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rastrear Pedido | Fragranciaria" },
      { name: "description", content: "Acompanhe o status do seu pedido." },
    ],
  }),
  component: TrackOrderPage,
});

// Normaliza o código digitado (remove hífens/espaços do formato XXXX-XXXX-...).
function normalizeToken(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

function TrackOrderPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = normalizeToken(query.trim());
    if (!token) return;

    setLoading(true);
    try {
      // A rota /pedido/$token valida o código via server fn segura.
      await navigate({ to: "/pedido/$token", params: { token } });
    } catch (err) {
      toast.error((err as Error).message || "Erro ao buscar pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />

      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border border-[#E9E1D2] p-8">
          <h1 className="font-serif text-2xl text-[#0F3A3E] mb-2">
            Rastrear Pedido
          </h1>
          <p className="text-sm text-[#51635F] mb-6">
            Digite o código de rastreio que você recebeu ao finalizar a compra.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#51635F] font-semibold mb-2">
                Código de rastreio
              </label>
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] text-sm bg-white font-mono tracking-wider"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F3A3E] text-white py-3.5 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" /> Buscar Pedido
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}