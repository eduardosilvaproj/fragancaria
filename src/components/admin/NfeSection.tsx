import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getNfeSettings,
  saveNfeSettings,
  type NfeSettings,
} from "@/lib/nfe.functions";
import { backfillOrdersIbge } from "@/lib/orders-backfill.functions";

export function NfeSection() {
  const queryClient = useQueryClient();

  const getFn = useServerFn(getNfeSettings);
  const saveFn = useServerFn(saveNfeSettings);

  const { data: nfeData, isLoading } = useQuery({
    queryKey: ["nfe-settings"],
    queryFn: () => getFn({}),
  });

  const settings: NfeSettings | null = nfeData?.success ? nfeData.data : null;

  const [form, setForm] = useState({
    cnpj: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    razao_social: "",
    nome_fantasia: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado_uf: "",
    cep: "",
    telefone: "",
    nfe_serie: 15,
    ambiente_sefaz: "homologacao" as "homologacao" | "producao",
    webservice_url: "",
    certificado_path: "",
    ncm_padrao: "",
    cfop_padrao: "",
    cst_icms_padrao: "",
    csosn_padrao: "",
    origem_padrao: "",
    icms_aliquota: "" as string | number,
    pis_aliquota: "" as string | number,
    cofins_aliquota: "" as string | number,
    cst_pis_cofins_padrao: "",
    unidade_padrao: "",
    cest_padrao: "",
    modalidade_frete: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        cnpj: settings.cnpj || "",
        inscricao_estadual: settings.inscricao_estadual || "",
        inscricao_municipal: settings.inscricao_municipal || "",
        razao_social: settings.razao_social || "",
        nome_fantasia: settings.nome_fantasia || "",
        logradouro: settings.endereco?.logradouro || "",
        numero: settings.endereco?.numero || "",
        complemento: settings.endereco?.complemento || "",
        bairro: settings.endereco?.bairro || "",
        cidade: settings.endereco?.cidade || "",
        estado_uf: settings.endereco?.uf || settings.estado_uf || "",
        cep: settings.endereco?.cep || "",
        telefone: settings.endereco?.telefone || "",
        nfe_serie: settings.nfe_serie ?? 15,
        ambiente_sefaz: settings.ambiente_sefaz || "homologacao",
        webservice_url: settings.webservice_url || "",
        certificado_path: settings.certificado_path || "",
        ncm_padrao: settings.ncm_padrao || "",
        cfop_padrao: settings.cfop_padrao || "",
        cst_icms_padrao: settings.cst_icms_padrao || "",
        csosn_padrao: settings.csosn_padrao || "",
        origem_padrao: settings.origem_padrao !== undefined && settings.origem_padrao !== null ? String(settings.origem_padrao) : "",
        icms_aliquota: settings.icms_aliquota ?? "",
        pis_aliquota: settings.pis_aliquota ?? "",
        cofins_aliquota: settings.cofins_aliquota ?? "",
        cst_pis_cofins_padrao: settings.cst_pis_cofins_padrao || "",
        unidade_padrao: settings.unidade_padrao || "",
        cest_padrao: settings.cest_padrao || "",
        modalidade_frete: settings.modalidade_frete !== undefined && settings.modalidade_frete !== null ? String(settings.modalidade_frete) : "",
      });
    }
  }, [settings]);

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => saveFn({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Configurações de NF-e salvas com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["nfe-settings"] });
      } else {
        toast.error(res.error || "Erro ao salvar configurações");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar configurações");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      cnpj: form.cnpj,
      inscricao_estadual: form.inscricao_estadual,
      inscricao_municipal: form.inscricao_municipal,
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia,
      estado_uf: form.estado_uf,
      nfe_serie: Number(form.nfe_serie) || 1,
      ambiente_sefaz: form.ambiente_sefaz,
      webservice_url: form.webservice_url,
      certificado_path: form.certificado_path,
      endereco: {
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        uf: form.estado_uf,
        cep: form.cep,
        telefone: form.telefone,
      },
      ncm_padrao: form.ncm_padrao,
      cfop_padrao: form.cfop_padrao,
      cst_icms_padrao: form.cst_icms_padrao,
      csosn_padrao: form.csosn_padrao,
      origem_padrao: form.origem_padrao !== "" ? Number(form.origem_padrao) : null,
      icms_aliquota: form.icms_aliquota !== "" ? Number(form.icms_aliquota) : null,
      pis_aliquota: form.pis_aliquota !== "" ? Number(form.pis_aliquota) : null,
      cofins_aliquota: form.cofins_aliquota !== "" ? Number(form.cofins_aliquota) : null,
      cst_pis_cofins_padrao: form.cst_pis_cofins_padrao,
      unidade_padrao: form.unidade_padrao,
      cest_padrao: form.cest_padrao,
      modalidade_frete: form.modalidade_frete === "" ? null : Number(form.modalidade_frete),
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="h-5 w-40 bg-[#F5F3EE] animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[#0F3A3E]" />
            <div>
              <h3 className="font-serif text-lg text-[#0F3A3E]">Configurações de Nota Fiscal (NF-e)</h3>
              <p className="text-sm text-[#8A938E]">
                Parâmetros do emitente, ambiente SEFAZ e valores fiscais padrão para integração com a Notaas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const toastId = toast.loading("Sincronizando IBGE dos pedidos...");
              const res = await backfillOrdersIbge({});
              if (res.success) {
                toast.success(`Sucesso: ${res.updatedCount} pedidos atualizados.`, { id: toastId });
              } else {
                toast.error(res.error || "Erro ao sincronizar", { id: toastId });
              }
            }}
            className="text-xs px-3 py-2 bg-[#F5F3EE] hover:bg-[#E9E1D2] text-[#0F3A3E] rounded border border-[#E9E1D2] transition-colors"
          >
            Sincronizar IBGE dos Pedidos
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E9E1D2] p-6 space-y-6">
        {/* Dados do Emitente */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-4">
            Dados do Emitente
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                CNPJ *
              </label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setField("cnpj", e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Inscrição Estadual *
              </label>
              <input
                type="text"
                value={form.inscricao_estadual}
                onChange={(e) => setField("inscricao_estadual", e.target.value)}
                placeholder="000.000.000.000"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Inscrição Municipal
              </label>
              <input
                type="text"
                value={form.inscricao_municipal}
                onChange={(e) => setField("inscricao_municipal", e.target.value)}
                placeholder="Opcional"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Razão Social *
              </label>
              <input
                type="text"
                value={form.razao_social}
                onChange={(e) => setField("razao_social", e.target.value)}
                placeholder="Empresa LTDA"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={form.nome_fantasia}
                onChange={(e) => setField("nome_fantasia", e.target.value)}
                placeholder="Nome da Loja"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
          </div>
        </div>

        {/* Endereço do Emitente */}
        <div className="border-t border-[#E9E1D2] pt-6">
          <h4 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-4">
            Endereço do Emitente
          </h4>
          <div className="grid md:grid-cols-6 gap-4">
            <div className="md:col-span-4">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Logradouro *
              </label>
              <input
                type="text"
                value={form.logradouro}
                onChange={(e) => setField("logradouro", e.target.value)}
                placeholder="Rua Exemplo"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Número *
              </label>
              <input
                type="text"
                value={form.numero}
                onChange={(e) => setField("numero", e.target.value)}
                placeholder="123"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Bairro *
              </label>
              <input
                type="text"
                value={form.bairro}
                onChange={(e) => setField("bairro", e.target.value)}
                placeholder="Centro"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Complemento
              </label>
              <input
                type="text"
                value={form.complemento}
                onChange={(e) => setField("complemento", e.target.value)}
                placeholder="Sala 101"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Cidade *
              </label>
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => setField("cidade", e.target.value)}
                placeholder="São Paulo"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                UF *
              </label>
              <input
                type="text"
                value={form.estado_uf}
                onChange={(e) => setField("estado_uf", e.target.value.toUpperCase())}
                placeholder="SP"
                maxLength={2}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                CEP *
              </label>
              <input
                type="text"
                value={form.cep}
                onChange={(e) => setField("cep", e.target.value)}
                placeholder="01001-000"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
                required
              />
            </div>
          </div>
        </div>

        {/* Parâmetros SEFAZ e Série */}
        <div className="border-t border-[#E9E1D2] pt-6">
          <h4 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-4">
            Emissão e SEFAZ
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Ambiente SEFAZ
              </label>
              <select
                value={form.ambiente_sefaz}
                onChange={(e) => setField("ambiente_sefaz", e.target.value)}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              >
                <option value="homologacao">Homologação (Testes)</option>
                <option value="producao">Produção (Validade Fiscal)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Série da NF-e
              </label>
              <input
                type="number"
                value={form.nfe_serie}
                onChange={(e) => setField("nfe_serie", e.target.value)}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
          </div>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <strong>Ambiente de Homologação:</strong> use para testar a emissão sem custo. As notas não são válidas fiscalmente.
            Após validar, mude para Produção.
          </div>
        </div>

        {/* Parâmetros Fiscais Padrão */}
        <div className="border-t border-[#E9E1D2] pt-6">
          <h4 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-1">
            Parâmetros Fiscais Padrão
          </h4>
          <p className="text-xs text-[#8A938E] mb-4">
            Valores aplicados aos itens da NF-e quando o produto não tem o campo preenchido na ficha.
            Preencha para habilitar a emissão.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                NCM Padrão *
              </label>
              <input
                type="text"
                value={form.ncm_padrao}
                onChange={(e) => setField("ncm_padrao", e.target.value)}
                placeholder="3304.99.90"
                maxLength={10}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                CFOP Padrão *
              </label>
              <input
                type="text"
                value={form.cfop_padrao}
                onChange={(e) => setField("cfop_padrao", e.target.value)}
                placeholder="5102"
                maxLength={4}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                CST ICMS Padrão *
              </label>
              <input
                type="text"
                value={form.cst_icms_padrao}
                onChange={(e) => setField("cst_icms_padrao", e.target.value)}
                placeholder="00"
                maxLength={3}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                CSOSN Padrão
              </label>
              <input
                type="text"
                value={form.csosn_padrao}
                onChange={(e) => setField("csosn_padrao", e.target.value)}
                placeholder="101"
                maxLength={4}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Origem da Mercadoria (0-8)
              </label>
              <input
                type="number"
                value={form.origem_padrao}
                onChange={(e) => setField("origem_padrao", e.target.value)}
                placeholder="0"
                min={0}
                max={8}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Alíquota ICMS (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.icms_aliquota}
                onChange={(e) => setField("icms_aliquota", e.target.value)}
                placeholder="18"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Alíquota PIS (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.pis_aliquota}
                onChange={(e) => setField("pis_aliquota", e.target.value)}
                placeholder="1.65"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Alíquota COFINS (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.cofins_aliquota}
                onChange={(e) => setField("cofins_aliquota", e.target.value)}
                placeholder="7.6"
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                CST PIS/COFINS Padrão
              </label>
              <input
                type="text"
                value={form.cst_pis_cofins_padrao}
                onChange={(e) => setField("cst_pis_cofins_padrao", e.target.value)}
                placeholder="01"
                maxLength={3}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Unidade Padrão
              </label>
              <input
                type="text"
                value={form.unidade_padrao}
                onChange={(e) => setField("unidade_padrao", e.target.value)}
                placeholder="UN"
                maxLength={6}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                CEST Padrão
              </label>
              <input
                type="text"
                value={form.cest_padrao}
                onChange={(e) => setField("cest_padrao", e.target.value)}
                placeholder="Ex.: 0000000"
                maxLength={7}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
                Modalidade de Frete
              </label>
              <select
                value={form.modalidade_frete}
                onChange={(e) => setField("modalidade_frete", e.target.value)}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
              >
                <option value={0}>0 - CIF (remetente paga)</option>
                <option value={1}>1 - FOB (destinatário paga)</option>
              </select>
            </div>
          </div>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>Como funcionam os padrões:</strong> a NF-e usa o valor do produto (na ficha do produto) quando preenchido, e cai para estes padrões quando o produto está em branco. Os campos marcados com <strong>*</strong> são obrigatórios para habilitar a emissão.
          </div>
        </div>

        {/* Certificado */}
        <div className="border-t border-[#E9E1D2] pt-6">
          <h4 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-4">
            Certificado Digital
          </h4>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1.5">
              Caminho do Arquivo (.pfx)
            </label>
            <input
              type="text"
              value={form.certificado_path}
              onChange={(e) => setField("certificado_path", e.target.value)}
              placeholder="certs/certificado A1 2025.pfx"
              className="w-full bg-[#F5F3EE] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B07B1E]"
            />
          </div>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>Como obter:</strong> Solicite um certificado digital A1 (arquivo .pfx) junto a uma Autoridade Certificadora credenciada pela ICP-Brasil (Serpro, Certisign, Safeweb, etc.).
            O arquivo deve ser armazenado no servidor e o caminho configurado acima. A senha do certificado deve ser configurada na variável de ambiente <code className="bg-blue-100 px-1 rounded">NFE_CERT_PASSWORD</code>.
          </div>
        </div>

        {/* Submit */}
        <div className="border-t border-[#E9E1D2] pt-6 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0F3A3E] text-white text-sm rounded-lg hover:bg-[#16504F] disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
}
