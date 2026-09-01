import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  Eye,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  type SiteBanner,
} from "@/lib/site-banners.functions";

export const Route = createFileRoute("/admin/banners")({
  component: AdminBanners,
});

function AdminBanners() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<SiteBanner> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const getAdminBannersFn = useServerFn(getAdminBanners as any);
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => getAdminBannersFn(),
    refetchOnWindowFocus: false,
  });

  const banners: SiteBanner[] = queryResult?.success ? queryResult.data : [];

  const createBannerFn = useServerFn(createBanner as any);
  const updateBannerFn = useServerFn(updateBanner as any);
  const deleteBannerFn = useServerFn(deleteBanner as any);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return await updateBannerFn({ data });
      }
      return await createBannerFn({ data });
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Banner salvo com sucesso!");
        setShowModal(false);
        queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      } else {
        toast.error(res?.error || "Erro ao salvar banner");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar banner");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteBannerFn({ data: id });
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Banner excluído com sucesso!");
        setConfirmDelete(null);
        queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      } else {
        toast.error(res?.error || "Erro ao excluir banner");
      }
    },
  });

  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchSlot = selectedSlot === "all" || b.slot === selectedSlot;
      const matchQuery =
        !searchQuery ||
        (b.titulo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.kicker || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.subtitulo || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchSlot && matchQuery;
    });
  }, [banners, selectedSlot, searchQuery]);

  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((b) => b.ativo).length;
    const heroCount = banners.filter((b) => b.slot === "hero").length;
    return { total, active, heroCount };
  }, [banners]);

  const handleOpenCreate = () => {
    setEditingBanner({
      slot: "hero",
      ordem: 0,
      ativo: true,
      kicker: "",
      titulo: "",
      subtitulo: "",
      cta_texto: "",
      cta_url: "",
      imagem_url: "",
      imagem_mobile_url: "",
      imagem_alt: "",
      inicia_em: "",
      termina_em: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (banner: SiteBanner) => {
    setEditingBanner({ ...banner });
    setShowModal(true);
  };

  const slotLabels: Record<string, string> = {
    hero: "Hero (Topo da Home)",
    faixa_meio: "Faixa do Meio",
    ticker: "Ticker Promocional",
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ImageIcon className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Marketing & Vitrine
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Banners da Home</h1>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Banner
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Total de Banners</p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{isLoading ? "—" : stats.total}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Ativos</p>
          <p className="font-serif text-2xl text-emerald-600">{isLoading ? "—" : stats.active}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">No Hero Principal</p>
          <p className="font-serif text-2xl text-[#B07B1E]">{isLoading ? "—" : stats.heroCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
          <input
            type="text"
            placeholder="Buscar por título, kicker ou subtítulo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {["all", "hero", "faixa_meio", "ticker"].map((slot) => (
            <button
              key={slot}
              onClick={() => setSelectedSlot(slot)}
              className={cn(
                "px-3 py-1.5 text-xs whitespace-nowrap border transition-colors",
                selectedSlot === slot
                  ? "bg-[#0F3A3E] text-white border-[#0F3A3E]"
                  : "bg-white text-[#51635F] border-[#E9E1D2] hover:bg-[#F3EEE3]"
              )}
            >
              {slot === "all" ? "Todos os Slots" : slotLabels[slot] || slot}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#B07B1E]" />
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="text-center py-16 text-[#8A938E] bg-white border border-[#E9E1D2]">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Nenhum banner encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBanners.map((banner) => (
            <div
              key={banner.id}
              className={cn(
                "bg-white border border-[#E9E1D2] p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative",
                !banner.ativo && "opacity-60 bg-gray-50"
              )}
            >
              <div className="flex items-start md:items-center gap-4">
                {/* Imagem Preview */}
                <div className="w-24 h-16 bg-[#F5F3EE] border border-[#E9E1D2] flex items-center justify-center overflow-hidden shrink-0">
                  {banner.imagem_url ? (
                    <img
                      src={banner.imagem_url}
                      alt={banner.imagem_alt || "Banner"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-[#8A938E]" />
                  )}
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-medium px-2 py-0.5 bg-[#F8F4EA] text-[#B07B1E] border border-[#E9E1D2]">
                      {slotLabels[banner.slot] || banner.slot}
                    </span>
                    <span className="text-xs text-[#8A938E]">Ordem: {banner.ordem}</span>
                    {banner.ativo ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle className="h-3 w-3" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <XCircle className="h-3 w-3" /> Inativo
                      </span>
                    )}
                  </div>

                  {banner.kicker && (
                    <p className="text-xs text-[#B07B1E] font-medium uppercase tracking-wider mb-0.5">
                      {banner.kicker}
                    </p>
                  )}
                  <h3 className="font-serif text-lg text-[#0F3A3E]">
                    {banner.titulo || "(Sem título)"}
                  </h3>
                  {banner.subtitulo && (
                    <p className="text-xs text-[#51635F] line-clamp-1">{banner.subtitulo}</p>
                  )}
                </div>
              </div>

              {/* Actions & Dates */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#E9E1D2]">
                {(banner.inicia_em || banner.termina_em) && (
                  <div className="text-xs text-[#8A938E] hidden lg:block">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {banner.inicia_em ? new Date(banner.inicia_em).toLocaleDateString("pt-BR") : "Início livre"}
                      {" → "}
                      {banner.termina_em ? new Date(banner.termina_em).toLocaleDateString("pt-BR") : "Sem fim"}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(banner)}
                    className="p-2 hover:bg-[#F3EEE3] rounded border border-[#E9E1D2] text-[#51635F] transition-colors"
                    title="Editar Banner"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  {confirmDelete === banner.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate(banner.id)}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        {deleteMutation.isPending ? "Excluindo..." : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1.5 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(banner.id)}
                      className="p-2 hover:bg-red-50 rounded border border-[#E9E1D2] text-red-500 transition-colors"
                      title="Excluir Banner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && editingBanner && (
        <BannerModal
          banner={editingBanner}
          isSaving={saveMutation.isPending}
          onSave={async (data) => {
            saveMutation.mutate(data);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function BannerModal({
  banner,
  isSaving,
  onSave,
  onClose,
}: {
  banner: Partial<SiteBanner>;
  isSaving: boolean;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    slot: banner.slot || "hero",
    ordem: banner.ordem ?? 0,
    ativo: banner.ativo ?? true,
    kicker: banner.kicker || "",
    titulo: banner.titulo || "",
    subtitulo: banner.subtitulo || "",
    cta_texto: banner.cta_texto || "",
    cta_url: banner.cta_url || "",
    cta2_texto: banner.cta2_texto || "",
    cta2_url: banner.cta2_url || "",
    imagem_url: banner.imagem_url || "",
    imagem_mobile_url: banner.imagem_mobile_url || "",
    imagem_alt: banner.imagem_alt || "",
    inicia_em: banner.inicia_em ? String(banner.inicia_em).slice(0, 16) : "",
    termina_em: banner.termina_em ? String(banner.termina_em).slice(0, 16) : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...(banner.id ? { id: banner.id } : {}),
      slot: form.slot,
      ordem: Number(form.ordem),
      ativo: form.ativo,
      kicker: form.kicker.trim() || null,
      titulo: form.titulo.trim() || null,
      subtitulo: form.subtitulo.trim() || null,
      cta_texto: form.cta_texto.trim() || null,
      cta_url: form.cta_url.trim() || null,
      cta2_texto: form.cta2_texto.trim() || null,
      cta2_url: form.cta2_url.trim() || null,
      imagem_url: form.imagem_url.trim() || null,
      imagem_mobile_url: form.imagem_mobile_url.trim() || null,
      imagem_alt: form.imagem_alt.trim() || null,
      inicia_em: form.inicia_em ? new Date(form.inicia_em).toISOString() : null,
      termina_em: form.termina_em ? new Date(form.termina_em).toISOString() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#E9E1D2] shadow-xl">
        <div className="p-6 border-b border-[#E9E1D2] flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-serif text-xl text-[#0F3A3E]">
            {banner.id ? "Editar Banner" : "Novo Banner"}
          </h2>
          <button onClick={onClose} className="p-1 text-[#8A938E] hover:text-[#0F3A3E]">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Slot de Exibição</label>
              <select
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value as any })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              >
                <option value="hero">Hero (Topo da Home)</option>
                <option value="faixa_meio">Faixa do Meio</option>
                <option value="ticker">Ticker Promocional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Ordem (Exibição)</label>
              <input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Kicker (Destaque Superior)</label>
              <input
                type="text"
                placeholder="Ex: LANÇAMENTO EXCLUSIVO"
                value={form.kicker}
                onChange={(e) => setForm({ ...form, kicker: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Título Principal</label>
              <input
                type="text"
                placeholder="Ex: Essências que Marcam Época"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Subtítulo / Descrição</label>
            <textarea
              rows={2}
              placeholder="Texto descritivo do banner..."
              value={form.subtitulo}
              onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Texto do Botão (CTA principal)</label>
              <input
                type="text"
                placeholder="Ex: Comprar Agora"
                value={form.cta_texto}
                onChange={(e) => setForm({ ...form, cta_texto: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">URL do Botão (CTA Link)</label>
              <input
                type="text"
                placeholder="Ex: /produto/123 ou https://..."
                value={form.cta_url}
                onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Texto do Segundo Botão (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Ver mais"
                value={form.cta2_texto}
                onChange={(e) => setForm({ ...form, cta2_texto: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">URL do Segundo Botão (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: /colecao/outono ou https://..."
                value={form.cta2_url}
                onChange={(e) => setForm({ ...form, cta2_url: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Texto Alternativo da Imagem (Alt) *Obrigatório se houver imagem</label>
            <input
              type="text"
              placeholder="Ex: Frasco de perfume em fundo dourado"
              value={form.imagem_alt}
              onChange={(e) => setForm({ ...form, imagem_alt: e.target.value })}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Início da Exibição (Opcional)</label>
              <input
                type="datetime-local"
                value={form.inicia_em}
                onChange={(e) => setForm({ ...form, inicia_em: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Fim da Exibição (Opcional)</label>
              <input
                type="datetime-local"
                value={form.termina_em}
                onChange={(e) => setForm({ ...form, termina_em: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="rounded border-[#E9E1D2]"
              />
              <span className="text-sm text-[#0F3A3E] font-medium">Banner Ativo (Visível na loja)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#E9E1D2]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {banner.id ? "Salvar Alterações" : "Criar Banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
