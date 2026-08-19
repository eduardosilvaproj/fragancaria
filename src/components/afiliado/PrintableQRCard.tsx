import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2, QrCode } from "lucide-react";

// QR do link de indicação → https://fragranciaria.com/?ref={affiliate_code}
// Arte impressa em A5 (medidas travadas em mm para sair no tamanho certo em
// qualquer impressora). QR com nível de correção Q para resistir a desgaste.

const QR_DARK = "#0E3B32";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function PrintableQRCard({
  affiliateCode,
  defaultEstablishment,
}: {
  affiliateCode: string;
  defaultEstablishment: string;
}) {
  const [establishment, setEstablishment] = useState(defaultEstablishment);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const generatedFor = useRef<string | null>(null);

  const refUrl = `https://fragranciaria.com/?ref=${affiliateCode}`;

  useEffect(() => {
    QRCode.toDataURL(refUrl, {
      errorCorrectionLevel: "Q",
      margin: 1,
      width: 600,
      color: { dark: QR_DARK, light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [refUrl]);

  // Reseta o nome do estabelecimento quando o afiliado carrega (default tardio).
  useEffect(() => {
    if (defaultEstablishment && generatedFor.current !== affiliateCode) {
      setEstablishment(defaultEstablishment);
      generatedFor.current = affiliateCode;
    }
  }, [defaultEstablishment, affiliateCode]);

  async function handleDownload() {
    setGenerating(true);
    try {
      // jspdf é pesado: só carrega quando o afiliado clica em baixar.
      const { jsPDF } = await import("jspdf");

      // QR em alta resolução só para a impressão.
      const qr = await QRCode.toDataURL(refUrl, {
        errorCorrectionLevel: "Q",
        margin: 1,
        width: 1200,
        color: { dark: QR_DARK, light: "#FFFFFF" },
      });

      // A5 retrato: 148 x 210 mm. Unidade em mm — nada de pixels/escala.
      const doc = new jsPDF({ unit: "mm", format: "a5" });
      const W = 148;
      const cx = W / 2;

      // Fundo creme
      doc.setFillColor(245, 241, 232);
      doc.rect(0, 0, 148, 210, "F");

      // Logo real, centralizado no topo
      try {
        const logo = await loadImage("/images/logo-compact@2x.png");
        const logoW = 42;
        const logoH = (logo.height / logo.width) * logoW;
        doc.addImage(logo, "PNG", cx - logoW / 2, 16, logoW, logoH);
      } catch {
        // logo é opcional: se falhar, a arte segue sem ela
      }

      // Headline (serifa aproximada: times)
      doc.setFont("times", "normal");
      doc.setFontSize(19);
      doc.setTextColor(18, 63, 53);
      const headline = doc.splitTextToSize("Leve pra casa o que a gente usa aqui", 116);
      doc.text(headline, cx, 52, { align: "center" });

      // Subtítulo
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(107, 107, 99);
      const sub = doc.splitTextToSize(
        "Os mesmos produtos profissionais, entregues na sua porta.",
        112,
      );
      doc.text(sub, cx, 66, { align: "center" });

      // Caixa branca do QR (margem branca obrigatória para leitura)
      const boxSize = 58;
      const boxY = 78;
      const boxX = cx - boxSize / 2;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(216, 208, 189);
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, boxY, boxSize, boxSize, 3, 3, "FD");
      // QR ≥ 30mm: aqui 46mm com 6mm de padding branco
      const qrSize = 46;
      doc.addImage(qr, "PNG", cx - qrSize / 2, boxY + (boxSize - qrSize) / 2, qrSize, qrSize);

      // Instrução
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(18, 63, 53);
      doc.text("Aponte a câmera do celular", cx, boxY + boxSize + 12, { align: "center" });

      doc.setFontSize(9.5);
      doc.setTextColor(138, 133, 122);
      doc.text("Frete para todo o Brasil", cx, boxY + boxSize + 19, { align: "center" });

      // Divisória
      doc.setDrawColor(216, 208, 189);
      doc.setLineWidth(0.3);
      doc.line(cx - 32, 168, cx + 32, 168);

      // "INDICADO POR"
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(180, 134, 44);
      doc.text("INDICADO POR", cx, 176, { align: "center", charSpace: 0.4 });

      // Nome do estabelecimento
      const name = establishment.trim();
      if (name) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(18, 63, 53);
        doc.text(name, cx, 183, { align: "center" });
      }

      const safeCode = affiliateCode.replace(/[^a-zA-Z0-9]/g, "") || "afiliado";
      doc.save(`fragranciaria-qr-${safeCode}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="bg-white border border-[#E9E1D2] mb-6">
      <div className="p-4 md:p-6 border-b border-[#E9E1D2]">
        <h2 className="font-serif text-[18px] text-[#0F3A3E]">Cartaz para o salão</h2>
        <p className="text-[12px] text-[#75827E] mt-1">
          Gere uma arte com seu QR code para imprimir e deixar no balcão. Quando a
          cliente aponta a câmera, cai na loja já com sua indicação.
        </p>
      </div>

      <div className="p-4 md:p-6 grid md:grid-cols-2 gap-6 items-start">
        {/* Preview da arte */}
        <div className="mx-auto w-full max-w-[320px]">
          <div
            className="flex flex-col items-center text-center"
            style={{
              backgroundColor: "#F5F1E8",
              border: "0.5px solid #D8D0BD",
              borderRadius: 12,
              padding: "28px 26px",
              aspectRatio: "148 / 210",
              justifyContent: "space-between",
            }}
          >
            <img src="/images/logo-compact@2x.png" alt="Fragranciaria" className="h-9 w-auto object-contain" />

            <div>
              <p className="font-serif text-[19px] leading-tight" style={{ color: "#123F35" }}>
                Leve pra casa o que a gente usa aqui
              </p>
              <p className="text-[11px] mt-2" style={{ color: "#6B6B63" }}>
                Os mesmos produtos profissionais, entregues na sua porta.
              </p>
            </div>

            <div className="bg-white p-2.5 border" style={{ borderColor: "#D8D0BD", borderRadius: 8 }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code do seu link" className="w-[112px] h-[112px]" />
              ) : (
                <div className="w-[112px] h-[112px] flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-[#D8D0BD]" />
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px]" style={{ color: "#123F35" }}>
                Aponte a câmera do celular
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "#8A857A" }}>
                Frete para todo o Brasil
              </p>
            </div>

            <div className="w-full">
              <div className="mx-auto w-16 border-t" style={{ borderColor: "#D8D0BD" }} />
              <p
                className="text-[10px] mt-2 font-medium"
                style={{ color: "#B4862C", letterSpacing: "0.1em" }}
              >
                INDICADO POR
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: "#123F35" }}>
                {establishment.trim() || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] uppercase tracking-[0.1em] text-[#75827E] mb-1.5">
              Nome do estabelecimento
            </label>
            <input
              type="text"
              value={establishment}
              onChange={(e) => setEstablishment(e.target.value)}
              placeholder="Ex: Salão da Fran"
              className="w-full px-4 py-3 bg-[#F8F4EA] border border-[#E0D8C7] text-[14px] text-[#0F3A3E] placeholder:text-[#8A938E] focus:border-[#B07B1E] outline-none"
            />
            <p className="text-[11px] text-[#8A938E] mt-1.5">
              É o nome que aparece no rodapé da arte — a cliente reconhece o salão.
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={generating || !qrDataUrl}
            className="flex items-center justify-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] text-white px-6 py-3.5 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Baixar arte em PDF (A5)
          </button>

          <p className="text-[11px] text-[#8A938E] leading-relaxed">
            O PDF sai no tamanho A5 (148 × 210 mm), pronto para imprimir. O QR tem
            46 mm de lado — a margem branca em volta é o que garante a leitura, não
            recorte.
          </p>
        </div>
      </div>
    </div>
  );
}
