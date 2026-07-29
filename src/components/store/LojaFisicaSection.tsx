// Secao de divulgacao da LOJA FISICA. Usada na home e na pagina de Contato.
//
// Os dados vem de store_settings via getPublicStoreConfig. O endereco daqui e
// o da loja fisica (Av. Queiroz Filho 1402) — NAO o fiscal (nfe_settings) nem
// a origem do frete (MELHOR_ENVIO_FROM_CEP), que sao o CD e nao atendem
// publico.
//
// TODO estado depende do banco, nada e hardcoded: se o admin mudar o horario
// ou virar o toggle, esta secao muda. Se `config` for null (migration nao
// aplicada, query falhou), a secao NAO renderiza e a pagina segue de pe.
import { MapPin, Clock, Store, ArrowRight, MessageCircle } from "lucide-react";
import type { StoreConfig } from "@/lib/store-settings.functions";
import { whatsappLink } from "@/lib/store-contact";

type LojaFisicaSectionProps = {
  /** null = nao renderiza. Quem chama passa null quando a query falhou. */
  config: StoreConfig | null;
  /** Envolve numa <section> com padding e fundo (home). Off na pagina de Contato. */
  comoSecao?: boolean;
  className?: string;
};

/** "Av. Queiroz Filho, 1402" — o numero so entra se existir. */
function formatarRua(endereco: StoreConfig["endereco"]): string {
  if (!endereco.rua) return "";
  return endereco.numero ? `${endereco.rua}, ${endereco.numero}` : endereco.rua;
}

/** "Vila Harmonia · Araraquara/SP · CEP 14801-000" — pula o que estiver vazio. */
function formatarLocalidade(endereco: StoreConfig["endereco"]): string {
  const cidadeUf = [endereco.cidade, endereco.uf].filter(Boolean).join("/");
  return [endereco.bairro, cidadeUf, endereco.cep ? `CEP ${endereco.cep}` : ""]
    .filter(Boolean)
    .join(" · ");
}

/**
 * URL de busca do Google Maps a partir das partes preenchidas.
 *
 * Funciona sem CEP de proposito: rua + numero + bairro + cidade/UF ja
 * identificam o lugar, e o CEP da loja ainda nao foi informado. Devolve null
 * quando nao ha endereco suficiente — assim o link nao aparece apontando para
 * uma busca vazia.
 */
export function buildMapsUrl(endereco: StoreConfig["endereco"]): string | null {
  const partes = [
    formatarRua(endereco),
    endereco.bairro,
    endereco.cidade,
    endereco.uf,
    endereco.cep,
  ].filter(Boolean);

  // Rua ou cidade: sem um dos dois a busca cai em qualquer lugar do Brasil.
  if (!endereco.rua && !endereco.cidade) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(", "))}`;
}

export function LojaFisicaSection({ config, comoSecao = true, className }: LojaFisicaSectionProps) {
  if (!config) return null;

  const { lojaAberta, endereco, horarios, fotoUrl, contato } = config;
  const rua = formatarRua(endereco);
  const localidade = formatarLocalidade(endereco);
  const temEndereco = Boolean(rua || localidade);
  const mapsUrl = buildMapsUrl(endereco);

  // Horarios so quando a loja abriu: antes disso, divulgar horario de
  // funcionamento de loja fechada faria cliente ir na porta.
  const mostrarHorarios = lojaAberta && Boolean(horarios.semana || horarios.sabado);

  // Botao de WhatsApp so com numero de verdade. Vazio = ausente, nunca um
  // wa.me quebrado. A regra vive em whatsappLink() e e a MESMA do rodape, do
  // chat da Fran e do botao flutuante — inclusive o cuidado de nao prefixar 55
  // num numero que ja venha com o codigo do pais.
  const waLink = whatsappLink(contato.whatsapp);

  const conteudo = (
    <div className="max-w-[1280px] mx-auto">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-stretch">
        {/* ===== COLUNA ESQUERDA: bloco visual ===== */}
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={`Fachada da loja Fragranciaria${endereco.cidade ? ` em ${endereco.cidade}` : ""}`}
            className="w-full h-[260px] md:h-full md:min-h-[380px] object-cover border border-[#D8D0BD]"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full min-h-[260px] md:min-h-[380px] bg-[#0F3A3E] border border-[#D8D0BD] flex flex-col items-center justify-center text-center px-6 py-12"
            // Decorativo: o texto ao lado ja diz tudo, entao o leitor de tela
            // nao ganha nada lendo "Inauguração / em breve" duas vezes.
            aria-hidden="true"
          >
            <Store className="h-10 w-10 md:h-12 md:w-12 text-[#B07B1E]" strokeWidth={1.25} />
            {!lojaAberta && (
              <>
                <span className="font-serif text-[26px] md:text-[34px] text-white mt-6 leading-tight">
                  Inauguração
                </span>
                <span className="text-[11px] md:text-[12px] tracking-[0.25em] uppercase text-[#B07B1E] mt-2">
                  em breve
                </span>
              </>
            )}
          </div>
        )}

        {/* ===== COLUNA DIREITA: texto ===== */}
        <div className="flex flex-col justify-center">
          <span className="text-[11px] md:text-[12px] tracking-[0.25em] md:tracking-[0.3em] text-[#B07B1E] uppercase">
            Loja física
          </span>

          <h2 className="font-serif font-medium text-[28px] md:text-[42px] text-[#0F3A3E] mt-2 md:mt-3 leading-[1.1]">
            {lojaAberta ? (
              <>
                Venha nos <em className="text-[#B07B1E]">conhecer</em>
              </>
            ) : (
              <>
                Nossa loja está <em className="text-[#B07B1E]">chegando</em>
              </>
            )}
          </h2>

          <p className="text-[14px] md:text-[15px] text-[#1C302E]/70 mt-4 leading-[1.6] max-w-[46ch]">
            {lojaAberta
              ? "A mesma curadoria profissional do site, agora para você ver, sentir e escolher com o nosso atendimento por perto."
              : "Estamos preparando um espaço para você conhecer de perto a curadoria que já atende profissionais em todo o Brasil."}
          </p>

          {/* Endereço */}
          {temEndereco && (
            <div className="flex items-start gap-3 mt-7">
              <MapPin className="h-[18px] w-[18px] text-[#B07B1E] mt-[3px] flex-shrink-0" />
              <div className="text-[14px] md:text-[15px] text-[#1C302E] leading-[1.5]">
                {rua && <div>{rua}</div>}
                {localidade && <div className="text-[#1C302E]/60 mt-0.5">{localidade}</div>}
              </div>
            </div>
          )}

          {/* Horários — só com a loja aberta */}
          {mostrarHorarios && (
            <div className="flex items-start gap-3 mt-4">
              <Clock className="h-[18px] w-[18px] text-[#B07B1E] mt-[3px] flex-shrink-0" />
              <div className="text-[14px] md:text-[15px] text-[#1C302E] leading-[1.5]">
                {horarios.semana && (
                  <div>
                    <span className="text-[#1C302E]/60">Seg a sex</span> {horarios.semana}
                  </div>
                )}
                {horarios.sabado && (
                  <div className="mt-0.5">
                    <span className="text-[#1C302E]/60">Sábado</span> {horarios.sabado}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ações */}
          {(mapsUrl || waLink) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-[12px] md:text-[13px] tracking-[0.16em] md:tracking-[0.18em] text-[#0F3A3E] uppercase border-b border-[#B07B1E] pb-[5px] hover:text-[#B07B1E] transition-colors"
                >
                  Como chegar
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
              )}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[12px] md:text-[13px] tracking-[0.16em] md:tracking-[0.18em] text-[#0F3A3E] uppercase border-b border-[#B07B1E] pb-[5px] hover:text-[#B07B1E] transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!comoSecao) return <div className={className}>{conteudo}</div>;

  return (
    <section className={className ?? "py-16 md:py-[110px] px-6 md:px-14 bg-[#F3EEE3]"}>
      {conteudo}
    </section>
  );
}
