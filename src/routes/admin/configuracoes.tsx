import { createFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Settings,
  Store,
  Palette,
  Bell,
  Shield,
  Globe,
  CreditCard,
  Truck,
  Mail,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  LayoutGrid,
  Package,
  Info,
  FileText,
  AlertCircle,
  CheckCircle,
  Upload,
  Users,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VitrineManager } from "@/components/admin/VitrineManager";
import { NfeSection } from "@/components/admin/NfeSection";
import {
  getShippingSettings,
  updateShippingSetting,
  type ShippingSettings,
} from "@/lib/shipping-settings.functions";
import {
  getNfeSettings,
  saveNfeSettings,
  type NfeSettings,
  type NfeEndereco,
} from "@/lib/nfe.functions";
import {
  getAffiliateSettings,
  saveAffiliateSettings,
} from "@/lib/affiliate-settings.functions";
import {
  getStoreSettings,
  updateStoreSettings,
  type UpdateStoreSettingsInput,
} from "@/lib/store-settings.functions";
import { STORE_CONFIG_QUERY_KEY } from "@/lib/use-store-config";
import { sendTestEmail } from "@/lib/email-test.functions";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminConfiguracoes,
});

function AdminConfiguracoes() {
  const [activeSection, setActiveSection] = useState<string>("loja");
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const listFn = useServerFn(getShippingSettings);
  const settingsQuery = useQuery({
    queryKey: ["shipping-settings"],
    queryFn: () => listFn({}),
    enabled: activeSection === "frete",
  });

  const settings: ShippingSettings | null = settingsQuery.data?.success
    ? settingsQuery.data.data
    : null;

  const updateFn = useServerFn(updateShippingSetting);
  const updateMutation = useMutation({
    mutationFn: async (payload: { key: string; value: unknown }) => updateFn({ data: payload }),
    onSuccess: () => {
      toast.success("Configuração salva!");
      queryClient.invalidateQueries({ queryKey: ["shipping-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (error: any) => toast.error(error?.message || "Erro ao salvar"),
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleShippingSetting = (key: string, value: unknown) => {
    updateMutation.mutate({ key, value });
  };

  const sections = [
    { id: "loja", label: "Dados da Loja", icon: Store },
    { id: "aparencia", label: "Aparência", icon: Palette },
    { id: "notificacoes", label: "Notificações", icon: Bell },
    { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
    { id: "frete", label: "Frete", icon: Truck },
    { id: "email", label: "Email", icon: Mail },
    { id: "seguranca", label: "Segurança", icon: Shield },
    { id: "vitrine", label: "Vitrine da Home", icon: LayoutGrid },
    { id: "nfe", label: "Nota Fiscal", icon: FileText },
    { id: "afiliados", label: "Afiliados", icon: Users },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">Sistema</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">Configurações</h1>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors",
            saved ? "bg-emerald-500 text-white" : "bg-[#0F3A3E] text-white hover:bg-[#16504F]"
          )}
        >
          {saved ? (
            <><Check className="h-4 w-4" /> Salvo!</>
          ) : (
            <><Save className="h-4 w-4" /> Salvar Alterações</>
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-[250px_1fr] gap-6">
        <nav className="bg-white border border-[#E9E1D2] p-2 h-fit">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                activeSection === section.id ? "bg-[#0F3A3E] text-white" : "text-[#51635F] hover:bg-[#F5F3EE]"
              )}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {activeSection === "loja" && <LojaSection />}
          {activeSection === "aparencia" && <AppearanceSection />}
          {activeSection === "notificacoes" && <NotificationsSection />}
          {activeSection === "pagamentos" && <PaymentsSection />}
          {activeSection === "frete" && <ShippingSection settings={settings} onChange={handleShippingSetting} />}
          {activeSection === "email" && <EmailSettingsSection />}
          {activeSection === "vitrine" && <VitrineManager />}
          {activeSection === "nfe" && <NfeSection />}
          {activeSection === "afiliados" && <AfiliadosSection />}
        </div>
      </div>
    </div>
  );
}

function EmailSettingsSection() {
  const [testEmail, setTestEmail] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sendTestFn = useServerFn(sendTestEmail);

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSending(true);
    setResult("Enviando...");
    try {
      const res = await sendTestFn({ data: { destination: testEmail } });
      setResult(res.success ? `Sucesso! ${JSON.stringify(res.data)}` : `Erro: ${res.error}`);
    } catch (e: any) {
      setResult(`Erro inesperado: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-[#E9E1D2] p-6 space-y-6">
      <h3 className="font-serif text-lg text-[#0F3A3E]">Configurações de Email</h3>
      <div className="p-4 bg-[#F9F7F3] border border-[#E9E1D2] rounded-lg">
        <h4 className="font-medium text-[#0F3A3E] mb-3 flex items-center gap-2"><Mail className="h-4 w-4" /> Testar envio</h4>
        <div className="flex gap-2">
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="seu-email@teste.com" className="flex-1 bg-white border border-[#E9E1D2] rounded-lg px-4 py-2 text-sm outline-none" />
          <button onClick={handleSendTest} disabled={sending || !testEmail} className="px-4 py-2 bg-[#0F3A3E] text-white text-sm rounded-lg hover:bg-[#16504F] disabled:opacity-50 flex items-center gap-2">
            {sending ? "Enviando..." : <><Send className="h-4 w-4" /> Enviar</>}
          </button>
        </div>
        {result && <p className={cn("mt-3 text-sm", result.startsWith("Erro") ? "text-red-600" : "text-emerald-600")}>{result}</p>}
      </div>
    </div>
  );
}

function ShippingSection({ settings, onChange }: { settings: ShippingSettings | null; onChange: (key: string, value: unknown) => void }) {
  return <div className="bg-white border border-[#E9E1D2] p-6"><h3 className="font-serif text-lg text-[#0F3A3E] mb-6">Frete</h3><p className="text-sm text-[#51635F]">{settings ? "Configurações carregadas." : "Carregando..."}</p></div>;
}
function AppearanceSection() { return <div className="bg-white border border-[#E9E1D2] p-6"><h3 className="font-serif text-lg text-[#0F3A3E]">Aparência</h3></div>; }
function NotificationsSection() {
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestWhatsApp = async () => {
    if (!testPhone.trim()) {
      toast.error("Informe um número de WhatsApp para teste");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { sendTestWhatsApp } = await import("@/lib/whatsapp-test.functions");
      const res = await sendTestWhatsApp({ data: { phone: testPhone, templateName: "pedido_aprovado" } });
      setTestResult(res);
      if (res.success) {
        toast.success("Teste de WhatsApp disparado com sucesso!");
      } else {
        toast.error("Falha no disparo do WhatsApp (verifique a resposta)");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao testar WhatsApp");
      setTestResult({ success: false, error: e?.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white border border-[#E9E1D2] p-6 space-y-6">
      <h3 className="font-serif text-lg text-[#0F3A3E]">Notificações & WhatsApp (Zernio)</h3>
      <p className="text-sm text-[#51635F]">
        Dispare uma mensagem de teste via WhatsApp para validar a integração com a Zernio.
      </p>

      <div className="border border-[#E9E1D2] p-4 bg-[#FAF7F0] space-y-4">
        <h4 className="font-medium text-sm text-[#0F3A3E]">Teste de Disparo WhatsApp</h4>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ex: 5511999999999"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="flex-1 border border-[#E9E1D2] bg-white px-3 py-2 text-sm text-[#0F3A3E] focus:outline-none focus:border-[#B07B1E]"
          />
          <button
            onClick={handleTestWhatsApp}
            disabled={testing}
            className="bg-[#0F3A3E] text-white px-4 py-2 text-sm font-medium rounded hover:bg-[#16504F] disabled:opacity-50"
          >
            {testing ? "Enviando..." : "Testar WhatsApp"}
          </button>
        </div>

        {testResult && (
          <div className="mt-4 p-3 bg-white border border-[#E9E1D2] rounded text-xs font-mono space-y-1">
            <p className="font-bold text-[#0F3A3E]">Resposta Literal da Zernio:</p>
            <pre className="whitespace-pre-wrap overflow-x-auto text-[11px] text-[#51635F]">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
function PaymentsSection() { return <div className="bg-white border border-[#E9E1D2] p-6"><h3 className="font-serif text-lg text-[#0F3A3E]">Pagamentos</h3></div>; }
function AfiliadosSection() { return <div className="bg-white border border-[#E9E1D2] p-6"><h3 className="font-serif text-lg text-[#0F3A3E]">Afiliados</h3></div>; }
function LojaSection() { return <div className="bg-white border border-[#E9E1D2] p-6"><h3 className="font-serif text-lg text-[#0F3A3E]">Dados da Loja</h3></div>; }

export default AdminConfiguracoes;
