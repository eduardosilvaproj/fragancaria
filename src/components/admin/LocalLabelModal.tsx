import { useRef, useEffect } from "react";
import JsBarcode from "jsbarcode";
import { Printer, X } from "lucide-react";

export function LocalLabelModal({
  data,
  onClose,
}: {
  data: {
    tracking_code: string;
    carrier: string;
    service: string;
    service_code: string;
    recipient: {
      name: string;
      address: string;
      number: string;
      complement: string;
      neighborhood: string;
      city: string;
      state: string;
      postal_code: string;
    };
    sender: {
      name: string;
      address?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      postal_code: string;
      phone?: string;
    };
    weight: number;
    order_number?: number | null;
    logoUrl?: string | null;
    tagline?: string | null;
    date: string;
  };
  onClose: () => void;
}) {
  const handlePrint = () => {
    window.print();
  };

  const formatCep = (cep: string) => {
    return (cep || "").replace(/^(\d{5})(\d{3})$/, "$1-$2");
  };

  const barcodeRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, data.tracking_code || "FRAGRANCIARIA", {
        format: "CODE128",
        width: 2.4,
        height: 72,
        margin: 0,
        displayValue: false,
      });
    } catch {
      // código inválido para CODE128 — deixa o SVG vazio
    }
  }, [data.tracking_code]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:bg-transparent print:p-0 print:static">
      <style>{`
        @media print {
          @page { size: 100mm 150mm; margin: 0; }
          body * { visibility: hidden; }
          #shipping-label, #shipping-label * { visibility: visible; }
          #shipping-label {
            position: absolute;
            top: 0;
            left: 0;
            margin: 0;
          }
        }
        #shipping-label { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[92vh] overflow-y-auto print:rounded-none print:max-w-none print:w-auto print:overflow-visible">
        {/* Header do modal (nao imprime) */}
        <div className="flex items-center justify-between p-4 border-b border-[#E9E1D2] print:hidden">
          <h2 className="text-lg font-serif text-[#0F3A3E] flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Etiqueta de Envio (100 × 150 mm)
          </h2>
          <button onClick={onClose} className="text-[#8A938E] hover:text-[#0F3A3E]">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* ETIQUETA 100 × 150 mm — monocromática (impressão térmica) */}
        <div className="flex justify-center p-6 print:p-0">
          <div
            id="shipping-label"
            style={{
              width: "100mm",
              height: "150mm",
              background: "#fff",
              color: "#000",
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              boxSizing: "border-box",
              padding: "5mm",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* HEADER — marca · transportadora/contrato · badge serviço */}
            <header
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr auto",
                alignItems: "center",
                columnGap: "3mm",
                paddingBottom: "2.5mm",
                borderBottom: "1.5px solid #000",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "2.5mm" }}>
                {data.logoUrl ? (
                  <img
                    src={data.logoUrl}
                    alt="Fragranciaria"
                    style={{
                      width: "26mm",
                      maxHeight: "16mm",
                      objectFit: "contain",
                      objectPosition: "left center",
                      display: "block",
                      filter: "grayscale(1) contrast(1.6)",
                    }}
                  />
                ) : (
                  <div>
                    <div
                      style={{
                        fontFamily: "'Fraunces', Georgia, serif",
                        fontSize: "17px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        lineHeight: 1,
                      }}
                    >
                      FRAGRANCIARIA
                    </div>
                    {data.tagline ? (
                      <div style={{ fontSize: "6.5px", marginTop: "1mm", letterSpacing: "0.06em" }}>
                        {data.tagline}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <div style={{ fontSize: "8px", lineHeight: 1.5 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", marginBottom: "1mm" }}>
                  {(data.carrier || "Correios").toUpperCase()}
                </div>
                {data.service_code ? (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>Contrato</span>
                    <span>{data.service_code}</span>
                  </div>
                ) : null}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>Postagem</span>
                  <span>{new Date(data.date).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <div
                style={{
                  background: "#000",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  padding: "2mm 3.5mm",
                  textAlign: "center",
                }}
              >
                {data.service}
              </div>
            </header>

            {/* REMETENTE — 2 colunas: dados + card de serviço */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "2.4fr 1fr",
                gap: "3mm",
                padding: "2.5mm 0",
                borderBottom: "1px solid #000",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.2em", marginBottom: "1.5mm" }}>
                  REMETENTE
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, lineHeight: 1.35 }}>{data.sender.name}</div>
                <div style={{ fontSize: "9.5px", fontWeight: 400, lineHeight: 1.4 }}>
                  {data.sender.address ? (
                    <>
                      {data.sender.address}
                      {data.sender.number ? `, ${data.sender.number}` : ""}
                      {data.sender.complement ? ` — ${data.sender.complement}` : ""}
                      <br />
                    </>
                  ) : null}
                  {data.sender.neighborhood ? <>{data.sender.neighborhood}<br /></> : null}
                  {data.sender.city ? <>{data.sender.city}{data.sender.state ? `/${data.sender.state}` : ""}<br /></> : null}
                  CEP {formatCep(data.sender.postal_code)}
                  {data.sender.phone ? <><br />Tel {data.sender.phone}</> : null}
                </div>
              </div>
              <div
                style={{
                  borderLeft: "1px solid #000",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  paddingLeft: "2mm",
                }}
              >
                <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.1em" }}>SERVIÇO</div>
                <div style={{ fontSize: "17px", fontWeight: 800, marginTop: "1.5mm" }}>{data.service}</div>
              </div>
            </section>

            {/* DESTINATÁRIO — maior destaque, absorve o espaço livre */}
            <section
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "2.5mm 0",
                borderBottom: "1px solid #000",
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", marginBottom: "2mm" }}>
                ENTREGAR PARA
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  lineHeight: 1.1,
                  marginBottom: "2mm",
                  wordBreak: "break-word",
                }}
              >
                {data.recipient.name}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 400, lineHeight: 1.4 }}>
                {data.recipient.address}
                {data.recipient.number ? `, ${data.recipient.number}` : ""}
                {data.recipient.complement ? ` — ${data.recipient.complement}` : ""}
                <br />
                {data.recipient.neighborhood ? <>{data.recipient.neighborhood}<br /></> : null}
                {data.recipient.city}{data.recipient.state ? `/${data.recipient.state}` : ""}
              </div>
              <div style={{ fontSize: "19px", fontWeight: 800, letterSpacing: "0.04em", marginTop: "2.5mm" }}>
                CEP {formatCep(data.recipient.postal_code)}
              </div>
            </section>

            {/* FAIXA DE DADOS — 5 colunas iguais, divisórias verticais 1px */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                borderBottom: "1px solid #000",
                flexShrink: 0,
              }}
            >
              {[
                { label: "CEP", value: formatCep(data.recipient.postal_code) },
                { label: "PESO", value: `${data.weight} g` },
                { label: "VOLUME", value: "1/1" },
                { label: "SERVIÇO", value: data.service },
                { label: "PEDIDO", value: data.order_number ? `#${data.order_number}` : "—" },
              ].map((c, i) => (
                <div
                  key={c.label}
                  style={{
                    borderLeft: i === 0 ? "none" : "1px solid #000",
                    padding: "2mm 1mm",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "1mm" }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 800 }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* CÓDIGO DE BARRAS — CODE128 real, escaneável */}
            <section
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2.5mm 0",
                borderBottom: "1px solid #000",
                flexShrink: 0,
              }}
            >
              <svg ref={barcodeRef} style={{ width: "88%", height: "16mm" }} aria-hidden="true" />
              <div
                style={{
                  fontFamily: "'Courier New', ui-monospace, monospace",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  marginTop: "1.5mm",
                }}
              >
                {data.tracking_code}
              </div>
            </section>

            {/* RODAPÉ */}
            <footer
              style={{
                paddingTop: "2mm",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
            >
              <span>fragranciaria.com</span>
              <span>@fragranciaria</span>
            </footer>
          </div>
        </div>

        {/* Actions (nao aparece na impressao) */}
        <div className="flex gap-3 p-4 border-t border-[#E9E1D2] print:hidden">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[#E9E1D2] hover:bg-[#F3EEE3]"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 bg-[#0F3A3E] text-white hover:bg-[#16504F] flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}
