import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Upload, Loader2, ShoppingBag, RefreshCw, Download, AlertCircle } from "lucide-react";

// Paleta baseada nos tons Igora Royal (Schwarzkopf). O hex é uma aproximação
// visual do sistema nível-tom; o tom real é escolhido na lista de produtos.
const GROUP_ORDER = [
  "Naturais",
  "Acinzentados",
  "Beges & Dourados",
  "Chocolates",
  "Cobres & Vermelhos",
  "Claríssimos & Pastéis",
] as const;

const PALETTE: { code: string; label: string; hex: string; group: string }[] = [
  { code: "1-0", label: "Preto Natural", hex: "#1a1512", group: "Naturais" },
  { code: "3-0", label: "Castanho Escuro", hex: "#2c2019", group: "Naturais" },
  { code: "5-0", label: "Castanho Claro", hex: "#574029", group: "Naturais" },
  { code: "6-0", label: "Louro Escuro", hex: "#6f4f33", group: "Naturais" },
  { code: "7-0", label: "Louro Médio", hex: "#8a6741", group: "Naturais" },
  { code: "8-0", label: "Louro Claro", hex: "#a8814f", group: "Naturais" },
  { code: "9-0", label: "Louro Extra Claro", hex: "#c39d66", group: "Naturais" },

  { code: "6-1", label: "Louro Escuro Cendré", hex: "#5c5240", group: "Acinzentados" },
  { code: "7-1", label: "Louro Médio Cendré", hex: "#7b6f55", group: "Acinzentados" },
  { code: "8-11", label: "Louro Claro Cendré Extra", hex: "#9a8c6f", group: "Acinzentados" },
  { code: "9-1", label: "Louro Extra Claro Cendré", hex: "#b9a888", group: "Acinzentados" },

  { code: "8-4", label: "Louro Claro Bege", hex: "#ac7e4b", group: "Beges & Dourados" },
  { code: "9-4", label: "Louro Extra Claro Bege", hex: "#caa168", group: "Beges & Dourados" },
  { code: "8-55", label: "Louro Claro Dourado Extra", hex: "#b6823d", group: "Beges & Dourados" },
  { code: "9-55", label: "Louro Extra Claro Dourado Extra", hex: "#cd9b4a", group: "Beges & Dourados" },

  { code: "4-6", label: "Castanho Médio Chocolate", hex: "#3a281d", group: "Chocolates" },
  { code: "6-63", label: "Louro Escuro Chocolate Mate", hex: "#5b3b28", group: "Chocolates" },
  { code: "6-68", label: "Louro Escuro Chocolate Vermelho", hex: "#5f3323", group: "Chocolates" },

  { code: "7-77", label: "Louro Médio Cobre Extra", hex: "#a34e20", group: "Cobres & Vermelhos" },
  { code: "8-77", label: "Louro Claro Cobre Extra", hex: "#ba642a", group: "Cobres & Vermelhos" },
  { code: "6-88", label: "Louro Escuro Vermelho Extra", hex: "#7e3023", group: "Cobres & Vermelhos" },
  { code: "6-99", label: "Louro Escuro Violeta Extra", hex: "#6b3443", group: "Cobres & Vermelhos" },

  { code: "10-0", label: "Louro Claríssimo", hex: "#d5b985", group: "Claríssimos & Pastéis" },
  { code: "9,5-1", label: "Louro Pastel Cendré", hex: "#d9ceb5", group: "Claríssimos & Pastéis" },
];

const MAX_DIM = 720;
const HAIR_CLASS = 1; // selfie_multiclass_256x256: 0 fundo, 1 cabelo, 2 pele-corpo, 3 pele-rosto, 4 roupa, 5 outros
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

type Status = "idle" | "loading-model" | "segmenting" | "ready" | "error";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  const hp = h * 6;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function HairColorStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const segmenterRef = useRef<any>(null);
  const baseImageRef = useRef<ImageData | null>(null);
  const maskRef = useRef<{ data: Uint8Array; w: number; h: number } | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  async function ensureSegmenter() {
    if (segmenterRef.current) return segmenterRef.current;
    setStatus("loading-model");
    const { ImageSegmenter, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "IMAGE",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
    segmenterRef.current = segmenter;
    return segmenter;
  }

  function applyColor(hex: string) {
    const canvas = canvasRef.current;
    const base = baseImageRef.current;
    const mask = maskRef.current;
    if (!canvas || !base || !mask) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const out = ctx.createImageData(base.width, base.height);
    out.data.set(base.data);
    const [tr, tg, tb] = hexToRgb(hex);
    const [th, ts] = rgbToHsl(tr, tg, tb);
    const W = base.width;
    const H = base.height;
    const { data: md, w: mw, h: mh } = mask;
    const alpha = 0.82;

    for (let y = 0; y < H; y++) {
      const my = Math.min(mh - 1, (y * mh / H) | 0);
      for (let x = 0; x < W; x++) {
        const mx = Math.min(mw - 1, (x * mw / W) | 0);
        if (md[my * mw + mx] !== HAIR_CLASS) continue;
        const i = (y * W + x) * 4;
        const r = base.data[i];
        const g = base.data[i + 1];
        const b = base.data[i + 2];
        const l = rgbToHsl(r, g, b)[2];
        const [nr, ng, nb] = hslToRgb(th, ts, l);
        out.data[i] = r + (nr - r) * alpha;
        out.data[i + 1] = g + (ng - g) * alpha;
        out.data[i + 2] = b + (nb - b) * alpha;
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    setErrorMsg("");
    setSelected(null);

    let segmenter: any;
    try {
      segmenter = await ensureSegmenter();
    } catch {
      setStatus("error");
      setErrorMsg("Não foi possível carregar o simulador. Verifique sua conexão e tente de novo.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = canvasRef.current!;
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const W = Math.round(img.width * scale);
        const H = Math.round(img.height * scale);
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, W, H);
        URL.revokeObjectURL(url);

        baseImageRef.current = ctx.getImageData(0, 0, W, H);

        setStatus("segmenting");
        const result = segmenter.segment(canvas);
        const catMask = result.categoryMask;
        const raw = catMask.getAsUint8Array();
        const mw = catMask.width;
        const mh = catMask.height;
        let hairCount = 0;
        for (let k = 0; k < raw.length; k++) if (raw[k] === HAIR_CLASS) hairCount++;
        maskRef.current = { data: new Uint8Array(raw), w: mw, h: mh };
        catMask.close();

        if (hairCount / (mw * mh) < 0.01) {
          setStatus("error");
          setErrorMsg(
            "Não detectamos cabelo nessa foto. Use uma foto de frente, com o cabelo bem visível e boa iluminação.",
          );
          return;
        }

        const first = PALETTE[6]; // Loiro Claro, contraste visível na maioria
        setSelected(first.hex);
        applyColor(first.hex);
        setStatus("ready");
      } catch {
        setStatus("error");
        setErrorMsg("Algo deu errado ao processar a foto. Tente outra imagem.");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus("error");
      setErrorMsg("Não foi possível abrir essa imagem. Tente um arquivo JPG ou PNG.");
    };
    img.src = url;
  }

  function selectColor(hex: string) {
    setSelected(hex);
    applyColor(hex);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "simulacao-cor.png";
    a.click();
  }

  const busy = status === "loading-model" || status === "segmenting";
  const hasImage = status === "ready";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFile}
        className="hidden"
      />

      {/* Canvas / placeholder */}
      <div className="relative flex items-center justify-center bg-[#F8F4EA] border border-[#E0D8C7] min-h-[360px] md:min-h-[520px]">
        <canvas
          ref={canvasRef}
          className={hasImage ? "max-w-full max-h-[70vh]" : "hidden"}
        />

        {status === "idle" && (
          <div className="text-center px-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F3A3E]/5">
              <Upload className="h-7 w-7 text-[#0F3A3E]" />
            </div>
            <p className="font-serif text-2xl text-[#1C302E] mb-2">Envie uma foto sua</p>
            <p className="text-sm text-[#75827E] max-w-xs mx-auto">
              De frente, com o cabelo visível e boa luz. A foto não sai do seu navegador.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 inline-flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#B07B1E] text-white h-12 px-8 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-colors"
            >
              <Upload className="h-4 w-4" />
              Enviar foto
            </button>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8F4EA]/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#0F3A3E]" />
            <p className="mt-3 text-sm text-[#51635F]">
              {status === "loading-model" ? "Carregando o simulador..." : "Analisando o cabelo..."}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center px-6 max-w-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-[#51635F] mb-6">{errorMsg}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#B07B1E] text-white h-12 px-8 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar outra foto
            </button>
          </div>
        )}
      </div>

      {/* Painel de cores */}
      <div className="flex flex-col">
        <h2 className="font-serif text-2xl text-[#1C302E] mb-1">Escolha um tom</h2>
        <p className="text-sm text-[#75827E] mb-5">
          Toque numa cor para ver no seu cabelo.
        </p>

        <div className="space-y-5 max-h-[52vh] overflow-y-auto pr-1">
          {GROUP_ORDER.map((group) => (
            <div key={group}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#B07B1E] font-bold mb-2">
                {group}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {PALETTE.filter((c) => c.group === group).map((c) => (
                  <button
                    key={c.code}
                    onClick={() => selectColor(c.hex)}
                    disabled={!hasImage}
                    title={`${c.code} · ${c.label}`}
                    className={`group flex flex-col items-center gap-1 ${
                      hasImage ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                    }`}
                  >
                    <span
                      className={`h-11 w-11 rounded-full border-2 transition-transform ${
                        selected === c.hex
                          ? "border-[#0F3A3E] scale-110"
                          : "border-[#E0D8C7] group-hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[10px] font-semibold text-[#1C302E]">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8 space-y-3">
          <Link
            to="/produtos"
            search={{ productType: "coloracao" }}
            className="flex items-center justify-center gap-2 bg-[#0F3A3E] hover:bg-[#B07B1E] text-white h-14 px-8 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Comprar coloração
          </Link>

          {hasImage && (
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 border border-[#E0D8C7] hover:border-[#0F3A3E] text-[#51635F] h-11 rounded-none text-[11px] uppercase tracking-[0.2em] transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Trocar foto
              </button>
              <button
                onClick={download}
                className="flex-1 flex items-center justify-center gap-2 border border-[#E0D8C7] hover:border-[#0F3A3E] text-[#51635F] h-11 rounded-none text-[11px] uppercase tracking-[0.2em] transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
