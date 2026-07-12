import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  GripVertical,
  RotateCcw,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listManualFeatured,
  listProductsForAdmin,
  addFeatured,
  removeFeatured,
  reorderFeatured,
  resetFeatured,
  SLOT_LABELS,
  type Slot,
} from "@/lib/home-featured.functions";
import type { Product } from "@/data/products";

interface SimplifiedProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  isNew: boolean;
  isOnSale: boolean;
  isKit: boolean;
}

interface VitrineManagerProps {
  // Sem props. O componente faz fetch via server functions.
}

// Painel "Vitrine da Home" dentro de /admin/configuracoes.
// 4 abas (best, novos, promo, kits). Cada aba:
// - Lista os produtos atualmente selecionados (drag-up/down via botoes
//   discretos para nao precisar de lib drag&drop).
// - Busca no catalogo para adicionar.
// - Reset para o padrao (vazio).
// Esta primeira versao e funcional mas sem drag visual: cada linha tem
// botoes "subir" / "descer" (ordem = posicao no carrossel).
export function VitrineManager(_: VitrineManagerProps) {
  const [activeSlot, setActiveSlot] = useState<Slot>("bestsellers");

  return (
    <div className="bg-white border border-[#E9E1D2] p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-serif text-lg text-[#0F3A3E]">
          Vitrine da Home
        </h3>
        <p className="text-sm text-[#8A938E] mt-1">
          Escolha ate 20 produtos por secao para destacar na pagina inicial.
          Cada secao aparece como um carrossel horizontal independente.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E9E1D2] mb-6">
        {(Object.keys(SLOT_LABELS) as Slot[]).map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setActiveSlot(slot)}
            className={cn(
              "px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px",
              activeSlot === slot
                ? "border-[#0F3A3E] text-[#0F3A3E] font-medium"
                : "border-transparent text-[#8A938E] hover:text-[#0F3A3E]",
            )}
          >
            {SLOT_LABELS[slot]}
          </button>
        ))}
      </div>

      {/* Slot ativo */}
      <SlotPanel key={activeSlot} slot={activeSlot} />
    </div>
  );
}

// Painel de um slot especifico (busca + lista + acoes).
function SlotPanel({ slot }: { slot: Slot }) {
  const [featured, setFeatured] = useState<Product[] | null>(null);
  const [catalog, setCatalog] = useState<SimplifiedProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Carrega lista do slot + catalogo (para busca).
  const refresh = async () => {
    setError(null);
    setCatalogLoading(true);
    try {
      const [slotData, catalogData] = await Promise.all([
        listManualFeatured({ data: { slot } }),
        listProductsForAdmin(),
      ]);
      if (!slotData.success) throw new Error(slotData.error || "Erro ao carregar");
      setFeatured(slotData.data);
      setCatalog(catalogData.success ? catalogData.data : []);
    } catch (e: any) {
      setError(e?.message || "Erro de conexão");
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [slot]);

  // Toast efêmero.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // Filtra o catálogo pela busca (excluindo os que ja estao no slot).
  const filteredCatalog = useMemo(() => {
    if (!catalog || !featured) return [];
    const featuredIds = new Set(featured.map((p) => p.id));
    const term = search.trim().toLowerCase();
    return catalog
      .filter((p) => !featuredIds.has(p.id))
      .filter((p) => {
        if (!term) return true;
        return (
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term)
        );
      })
      .slice(0, 50); // limite pra nao renderizar 400 itens
  }, [catalog, featured, search]);

  async function handleAdd(productId: string) {
    setBusy(true);
    try {
      const res = await addFeatured({ data: { slot, productId } });
      if (!res.success) throw new Error(res.error);
      setToast("Produto adicionado");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Erro ao adicionar");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(productId: string) {
    setBusy(true);
    try {
      const res = await removeFeatured({ data: { slot, productId } });
      if (!res.success) throw new Error(res.error);
      setToast("Produto removido");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Erro ao remover");
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(productId: string, direction: "up" | "down") {
    if (!featured) return;
    const idx = featured.findIndex((p) => p.id === productId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= featured.length) return;

    setBusy(true);
    try {
      const newOrder = [...featured];
      [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
      setFeatured(newOrder);
      const res = await reorderFeatured({
        data: { slot, productIds: newOrder.map((p) => p.id) },
      });
      if (!res.success) {
        // rollback
        await refresh();
        throw new Error(res.error);
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao reordenar");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!confirm("Limpar todos os produtos desta secao?")) return;
    setBusy(true);
    try {
      const res = await resetFeatured({ data: { slot } });
      if (!res.success) throw new Error(res.error);
      setToast("Secao limpa");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Erro ao limpar");
    } finally {
      setBusy(false);
    }
  }

  if (featured === null) {
    return (
      <div className="flex items-center justify-center py-12 text-[#8A938E]">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Coluna esquerda: produtos selecionados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-[#0F3A3E]">
            Selecionados ({featured.length}/20)
          </h4>
          {featured.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={busy}
              className="text-xs text-[#8A938E] hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar secao
            </button>
          )}
        </div>

        {featured.length === 0 ? (
          <div className="border border-dashed border-[#E9E1D2] p-6 text-center text-sm text-[#8A938E]">
            Nenhum produto nesta secao. Use o buscador ao lado para adicionar.
          </div>
        ) : (
          <ul className="space-y-2">
            {featured.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-3 border border-[#E9E1D2] p-2 bg-[#FAF8F3]"
              >
                <GripVertical className="h-4 w-4 text-[#C4BBA8] flex-shrink-0" />
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="w-12 h-12 object-contain bg-white border border-[#E9E1D2] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#0F3A3E] truncate">{p.name}</p>
                  <p className="text-[11px] text-[#8A938E] truncate">{p.brand}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(p.id, "up")}
                    disabled={busy || i === 0}
                    className="p-1 text-[#8A938E] hover:text-[#0F3A3E] disabled:opacity-30"
                    aria-label="Subir"
                    title="Subir"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(p.id, "down")}
                    disabled={busy || i === featured.length - 1}
                    className="p-1 text-[#8A938E] hover:text-[#0F3A3E] disabled:opacity-30"
                    aria-label="Descer"
                    title="Descer"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(p.id)}
                    disabled={busy}
                    className="p-1 text-[#8A938E] hover:text-red-600"
                    aria-label="Remover"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Coluna direita: catalogo */}
      <div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto por nome ou marca..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E9E1D2] outline-none focus:border-[#0F3A3E]"
          />
        </div>

        <ul className="space-y-1 max-h-[480px] overflow-y-auto border border-[#E9E1D2] p-2">
          {filteredCatalog.length === 0 ? (
            <li className="text-center text-sm text-[#8A938E] py-6">
              {catalogLoading
                ? "Carregando catalogo..."
                : "Nenhum produto encontrado"}
            </li>
          ) : (
            filteredCatalog.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 p-2 hover:bg-[#F5F3EE] transition-colors"
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-10 h-10 object-contain bg-white border border-[#E9E1D2] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#0F3A3E] truncate">{p.name}</p>
                  <p className="text-[11px] text-[#8A938E] truncate">
                    {p.brand} · R$ {p.price.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(p.id)}
                  disabled={busy}
                  className="p-1.5 bg-[#0F3A3E] text-white hover:bg-[#16504F] disabled:opacity-50"
                  aria-label="Adicionar"
                  title="Adicionar a secao"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Feedback: error toast */}
      {error && (
        <div className="md:col-span-2 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-xs underline"
          >
            fechar
          </button>
        </div>
      )}
      {toast && (
        <div className="md:col-span-2 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}