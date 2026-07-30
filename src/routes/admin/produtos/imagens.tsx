import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Check,
  Ban,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  listPendingImageSuggestions,
  syncImageDecisions,
} from "@/lib/product-image-suggestions.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/produtos/imagens")({
  component: RevisaoImagens,
});

type ProdutoPendente = {
  productId: string;
  name: string;
  brand: string | null;
  currentImages: string[];
  candidatas: Array<{ id: string; imageUrl: string }>;
};

// Uma decisão por produto: id da candidata escolhida, ou "nenhuma" para
// rejeitar todas. Só sai daqui para o banco no Sincronizar.
type Decisao = { tipo: "aprovar"; suggestionId: string } | { tipo: "nenhuma" };

// Teto por chamada de syncImageDecisions (SYNC_MAX_DECISOES no servidor). Aprovar
// custa fetch da imagem + upload pro Storage, ~1-2s por produto: mandar a página
// inteira numa chamada estouraria o proxy do Railway, que corta a conexão e
// devolve "upstream error" enquanto o servidor segue gravando.
const SYNC_CHUNK_SIZE = 15;

function fatiar<T>(itens: T[], tamanho: number): T[][] {
  const blocos: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    blocos.push(itens.slice(i, i + tamanho));
  }
  return blocos;
}

function RevisaoImagens() {
  const listFn = useServerFn(listPendingImageSuggestions);
  const syncFn = useServerFn(syncImageDecisions);

  const [decisoes, setDecisoes] = useState<Record<string, Decisao>>({});
  // URLs cujo <img> falhou: candidata some da grade em vez de ocupar espaço
  // como caixa vazia, fingindo ser uma opção clicável.
  const [urlsQuebradas, setUrlsQuebradas] = useState<Record<string, true>>({});
  const [sincronizando, setSincronizando] = useState(false);
  const [progresso, setProgresso] = useState<{ bloco: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{
    aprovados: number;
    rejeitados: number;
    jaFeitos: number;
    errors: string[];
    blocosOk: number;
    blocosTotal: number;
    interrompido: string | null;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-image-suggestions"],
    queryFn: async () => {
      const res = await listFn({ data: {} });
      if (!res.success) throw new Error(res.error || "Erro ao carregar");
      return res.produtos;
    },
    refetchOnWindowFocus: false,
  });

  const produtos: ProdutoPendente[] = data ?? [];

  const decididos = useMemo(
    () => produtos.filter((p) => decisoes[p.productId]).length,
    [produtos, decisoes],
  );

  const escolher = (productId: string, decisao: Decisao) => {
    setDecisoes((prev) => {
      const atual = prev[productId];
      // Clicar na mesma coisa desmarca.
      const igual =
        atual &&
        ((atual.tipo === "nenhuma" && decisao.tipo === "nenhuma") ||
          (atual.tipo === "aprovar" &&
            decisao.tipo === "aprovar" &&
            atual.suggestionId === decisao.suggestionId));

      const proximo = { ...prev };
      if (igual) {
        delete proximo[productId];
      } else {
        // Uma seleção por produto: escolher outra substitui.
        proximo[productId] = decisao;
      }
      return proximo;
    });
  };

  const sincronizar = async () => {
    const lista = produtos
      .filter((p) => decisoes[p.productId])
      .map((p) => {
        const d = decisoes[p.productId];
        return {
          productId: p.productId,
          suggestionId: d.tipo === "aprovar" ? d.suggestionId : null,
        };
      });

    if (lista.length === 0) {
      toast.info("Nenhuma decisão marcada");
      return;
    }

    const blocos = fatiar(lista, SYNC_CHUNK_SIZE);

    setSincronizando(true);
    setResultado(null);
    setProgresso({ bloco: 1, total: blocos.length });

    // Acumuladores fora do loop: bloco que já gravou não se perde se um
    // posterior falhar.
    let aprovados = 0;
    let rejeitados = 0;
    let jaFeitos = 0;
    let blocosOk = 0;
    const errors: string[] = [];
    let interrompido: string | null = null;
    const idsSincronizados: string[] = [];

    for (let i = 0; i < blocos.length; i++) {
      setProgresso({ bloco: i + 1, total: blocos.length });
      try {
        const res = await syncFn({ data: { decisoes: blocos[i] } });
        if (res?.success) {
          aprovados += res.aprovados;
          rejeitados += res.rejeitados;
          jaFeitos += res.jaFeitos ?? 0;
          if (res.errors?.length) errors.push(...res.errors);
          blocosOk++;
          idsSincronizados.push(...blocos[i].map((d) => d.productId));
        } else {
          const motivo = res?.errors?.join("; ") || "Erro desconhecido";
          errors.push(`Bloco ${i + 1}: ${motivo}`);
          interrompido = motivo;
          break;
        }
      } catch (e: any) {
        const motivo = e?.message || "Erro desconhecido";
        errors.push(`Bloco ${i + 1}: ${motivo}`);
        interrompido = motivo;
        break;
      }
    }

    // Limpa só o que foi de fato sincronizado: se parou no meio, as decisões
    // dos produtos restantes continuam marcadas na tela e o operador reenvia
    // sem remarcar (e o servidor pula o que já gravou).
    setDecisoes((prev) => {
      const proximo = { ...prev };
      for (const id of idsSincronizados) delete proximo[id];
      return proximo;
    });

    setResultado({
      aprovados,
      rejeitados,
      jaFeitos,
      errors,
      blocosOk,
      blocosTotal: blocos.length,
      interrompido,
    });
    setSincronizando(false);
    setProgresso(null);

    if (interrompido) {
      toast.error(
        `Interrompido no bloco ${blocosOk + 1} de ${blocos.length}. ` +
          `${aprovados} confirmada(s); o bloco que falhou pode ter gravado sem responder. ` +
          `Sincronize de novo — o que já entrou não é refeito.`,
        { description: interrompido, duration: 30000 },
      );
    } else {
      toast.success(
        `${aprovados} aprovada(s), ${rejeitados} rejeitada(s).` +
          (jaFeitos > 0 ? ` ${jaFeitos} já estavam feitas.` : ""),
      );
    }

    await refetch();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-28">
      <Link
        to="/admin/produtos"
        className="inline-flex items-center gap-2 text-sm text-[#51635F] hover:text-[#0F3A3E] mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para produtos
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <ImageIcon className="h-6 w-6 text-[#B07B1E]" />
        <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
          Catálogo
        </span>
      </div>
      <h1 className="font-serif text-3xl text-[#0F3A3E] mb-2">Revisão de imagens</h1>
      <p className="text-sm text-[#51635F] mb-8 max-w-2xl">
        Candidatas buscadas na web para produtos sem foto. Clique na imagem correta para
        marcá-la, ou em "Nenhuma serve" se nenhuma presta. Nada é gravado até você clicar
        em <strong>Sincronizar</strong> no rodapé.
      </p>

      {resultado && (
        <div
          className={cn(
            "mb-6 border rounded p-4",
            resultado.interrompido
              ? "bg-red-50 border-red-200"
              : "bg-emerald-50 border-emerald-200",
          )}
        >
          <div className="flex items-start gap-3">
            {resultado.interrompido ? (
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1C302E]">
                {resultado.interrompido
                  ? `Interrompido no bloco ${resultado.blocosOk + 1} de ${resultado.blocosTotal}`
                  : "Sincronização concluída"}
              </p>
              <p className="text-sm text-[#51635F] mt-1">
                {resultado.aprovados} imagem(ns) gravada(s), {resultado.rejeitados}{" "}
                produto(s) marcado(s) como sem imagem adequada.
                {resultado.jaFeitos > 0 &&
                  ` ${resultado.jaFeitos} já estavam feitas (não reprocessadas).`}
              </p>
              {resultado.interrompido && (
                <p className="text-sm text-[#51635F] mt-1">
                  Esses números contam só os blocos que responderam. O bloco que falhou{" "}
                  <strong>pode ter gravado sem responder</strong> — é o que acontece quando
                  o servidor conclui e a conexão cai no caminho. Sincronize de novo: o que
                  já entrou não é refeito, e as decisões que faltaram continuam marcadas.
                </p>
              )}
              {resultado.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-[#8A938E] cursor-pointer">
                    {resultado.errors.length} aviso(s)
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto bg-white/60 rounded p-2">
                    {resultado.errors.slice(0, 50).map((err, i) => (
                      <p key={i} className="text-[11px] text-[#51635F] break-words">
                        {err}
                      </p>
                    ))}
                    {resultado.errors.length > 50 && (
                      <p className="text-[11px] text-[#8A938E] mt-1">
                        ...e outros {resultado.errors.length - 50}
                      </p>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-[#B07B1E] animate-spin mb-4" />
          <p className="text-sm text-[#8A938E]">Carregando candidatas...</p>
        </div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#E9E1D2] rounded">
          <ImageIcon className="h-10 w-10 text-[#D8D0BD] mx-auto mb-4" />
          <p className="text-[#51635F]">Nenhuma candidata pendente.</p>
          <p className="text-xs text-[#8A938E] mt-2">
            Use "Buscar imagens em lote" na tela de produtos para gerar sugestões.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {produtos.map((produto) => {
            const decisao = decisoes[produto.productId];
            const rejeitado = decisao?.tipo === "nenhuma";
            const visiveis = produto.candidatas.filter((c) => !urlsQuebradas[c.imageUrl]);
            const escondidas = produto.candidatas.length - visiveis.length;

            return (
              <div
                key={produto.productId}
                className={cn(
                  "bg-white border rounded p-4 transition-colors",
                  decisao ? "border-[#B07B1E] bg-[#FDFBF6]" : "border-[#D8D0BD]",
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1C302E] truncate">{produto.name}</p>
                    {produto.brand && (
                      <p className="text-xs text-[#8A938E]">{produto.brand}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => escolher(produto.productId, { tipo: "nenhuma" })}
                    className={cn(
                      "flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-xs border transition-colors",
                      rejeitado
                        ? "border-[#B07B1E] bg-[#B07B1E] text-white"
                        : "border-[#E9E1D2] text-[#51635F] hover:bg-[#F3EEE3]",
                    )}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Nenhuma serve
                  </button>
                </div>

                {visiveis.length === 0 ? (
                  <p className="text-xs text-[#8A938E] italic">
                    Nenhuma candidata carregou (as {produto.candidatas.length} URLs
                    falharam). Marque "Nenhuma serve".
                  </p>
                ) : (
                  <div
                    className={cn(
                      "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 transition-opacity",
                      rejeitado && "opacity-40",
                    )}
                  >
                    {visiveis.map((c, index) => {
                      const selecionada =
                        decisao?.tipo === "aprovar" && decisao.suggestionId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            escolher(produto.productId, {
                              tipo: "aprovar",
                              suggestionId: c.id,
                            })
                          }
                          className={cn(
                            "relative aspect-square rounded border-2 overflow-hidden transition-all group",
                            selecionada
                              ? "border-[#B07B1E] ring-2 ring-[#B07B1E]/40"
                              : "border-[#E9E1D2] hover:border-[#B07B1E] focus:border-[#B07B1E] focus:outline-none",
                          )}
                          title={
                            selecionada
                              ? "Clique para desmarcar"
                              : `Marcar imagem ${index + 1}`
                          }
                        >
                          <img
                            src={c.imageUrl}
                            alt={`Candidata ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() =>
                              setUrlsQuebradas((prev) => ({ ...prev, [c.imageUrl]: true }))
                            }
                          />
                          <div
                            className={cn(
                              "absolute inset-0 flex items-center justify-center transition-colors",
                              selecionada
                                ? "bg-[#0F3A3E]/40"
                                : "bg-[#0F3A3E]/0 group-hover:bg-[#0F3A3E]/30",
                            )}
                          >
                            <Check
                              className={cn(
                                "h-6 w-6 text-white transition-opacity",
                                selecionada
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100",
                              )}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {escondidas > 0 && visiveis.length > 0 && (
                  <p className="text-[11px] text-[#8A938E] mt-2">
                    {escondidas} candidata(s) indisponível(is) (a imagem não carregou).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barra fixa de sincronização. Só aparece quando há algo para gravar. */}
      {produtos.length > 0 && (decididos > 0 || sincronizando) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D8D0BD] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-40">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-[#1C302E]">
                <strong>{decididos}</strong> de {produtos.length} produto(s) decidido(s)
              </p>
              {progresso ? (
                <p className="text-xs text-[#8A938E] mt-0.5">
                  Gravando bloco {progresso.bloco} de {progresso.total}...
                </p>
              ) : (
                <p className="text-xs text-[#8A938E] mt-0.5">
                  Nada foi gravado ainda. Blocos de {SYNC_CHUNK_SIZE}.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!sincronizando && decididos > 0 && (
                <button
                  type="button"
                  onClick={() => setDecisoes({})}
                  className="px-4 py-2 text-sm border border-[#E9E1D2] text-[#51635F] hover:bg-[#F3EEE3] transition-colors"
                >
                  Limpar seleção
                </button>
              )}
              <button
                type="button"
                onClick={sincronizar}
                disabled={sincronizando || decididos === 0}
                className="flex items-center gap-2 px-6 py-2 bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sincronizando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Sincronizar {decididos} selecionado{decididos === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
