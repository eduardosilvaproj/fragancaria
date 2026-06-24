import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

function TrackOrderPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;

    setLoading(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      let { data, error } = isUuid
        ? await supabase.from("orders").select("id").eq("id", value).maybeSingle()
        : await supabase
            .from("orders")
            .select("id")
            .eq("customer_email", value)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Pedido não encontrado.");
        return;
      }
      navigate({ to: "/pedido/$id", params: { id: data.id } });
    } catch (err) {
      toast.error((err as Error).message || "Erro ao buscar pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <header className="bg-white border-b border-[#E9E1D2]">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-[#51635F] hover:text-[#0F3A3E]"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border border-[#E9E1D2] p-8">
          <h1 className="font-serif text-2xl text-[#0F3A3E] mb-2">
            Rastrear Pedido
          </h1>
          <p className="text-sm text-[#51635F] mb-6">
            Digite o número do pedido ou o e-mail usado na compra.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#51635F] font-semibold mb-2">
                Pedido ou e-mail
              </label>
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ID do pedido ou seu@email.com"
                className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] text-sm bg-white"
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