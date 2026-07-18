import { useState, useRef } from "react";
import { Loader2, Truck, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { useCartStore } from "@/stores/cartStore";
import { cotarFrete } from "@/lib/payments.functions";

const STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

// Máscaras
const maskPhone = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

const maskCpf = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1-$2");

const maskCep = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");

import { validateCpf, validatePhone, validateCep } from "@/lib/customer-validation";

// Validações
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

type FieldErrors = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  cpf?: string;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  shipping?: string;
};

export function ShippingForm() {
  const {
    customer,
    shippingAddress,
    quoteStatus,
    quoteError,
    cotacaoId,
    servicoId,
    opcoes,
    setCustomer,
    setShippingAddress,
    setShippingPrice,
    setShippingQuote,
    setServicoId,
    clearShippingQuote,
    setStep,
  } = useCheckoutStore();
  const { items } = useCartStore();
  const cotarFreteFn = useServerFn(cotarFrete);

  const [c, setC] = useState(
    customer ?? { email: "", firstName: "", lastName: "", phone: "", cpf: "" },
  );
  const [a, setA] = useState(
    shippingAddress ?? {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  );
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstErrorRef = useRef<HTMLInputElement | null>(null);
  const quoteRequestRef = useRef(0);
  const hasFreeShipping = opcoes.some((opcao) => opcao.precoExibidoCentavos === 0);

  const lookupCep = async (cep: string, requestId: number) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    clearShippingQuote();
    void cotarFretePara(digits, requestId);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await r.json();
      if (requestId !== quoteRequestRef.current) return;
      if (data.erro) {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado" }));
        return;
      }
      setA((prev) => ({
        ...prev,
        cep: maskCep(digits),
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      setErrors((prev) => ({ ...prev, cep: undefined }));
      toast.success("Endereço preenchido!");
    } catch {
      if (requestId === quoteRequestRef.current) {
        setErrors((prev) => ({ ...prev, cep: "Erro ao buscar CEP" }));
      }
    } finally {
      if (requestId === quoteRequestRef.current) setCepLoading(false);
    }
  };

  const cotarFretePara = async (cepDigits: string, requestId: number) => {
    if (items.length === 0) return;
    setShippingQuote({ status: "loading", cep: cepDigits });
    try {
      const result = await cotarFreteFn({
        data: {
          cepDestino: cepDigits,
          items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        },
      });
      if (requestId !== quoteRequestRef.current) return;
      if (!result.ok) {
        const mensagem: Record<typeof result.erro, string> = {
          cep_invalido: "CEP inválido para cotação de frete.",
          sem_cobertura: "Não há cobertura de envio para o CEP informado.",
          api_indisponivel: "Serviço de cotação indisponível. Tente novamente.",
        };
        setShippingQuote({ status: "error", cep: cepDigits, error: mensagem[result.erro] });
        return;
      }
      const maisBarata = [...result.opcoes].sort(
        (x, y) => x.precoExibidoCentavos - y.precoExibidoCentavos,
      )[0];
      if (maisBarata) {
        setServicoId(maisBarata.servicoId);
        setShippingPrice(maisBarata.precoExibidoCentavos / 100);
      }
      setShippingQuote({
        status: "success",
        cep: cepDigits,
        cotacaoId: result.cotacaoId,
        opcoes: result.opcoes,
      });
    } catch {
      if (requestId === quoteRequestRef.current) {
        setShippingQuote({
          status: "error",
          cep: cepDigits,
          error: "Serviço de cotação indisponível. Tente novamente.",
        });
      }
    }
  };

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "email":
        if (!value) return "Email é obrigatório";
        if (!validateEmail(value)) return "Email inválido";
        break;
      case "firstName":
        if (!value) return "Nome é obrigatório";
        if (value.length < 2) return "Nome muito curto";
        break;
      case "lastName":
        if (!value) return "Sobrenome é obrigatório";
        if (value.length < 2) return "Sobrenome muito curto";
        break;
      case "phone":
        if (!value) return "Telefone é obrigatório";
        if (!validatePhone(value)) return "Telefone inválido";
        break;
      case "cpf":
        if (!value) return "CPF é obrigatório";
        if (!validateCpf(value)) return "CPF inválido";
        break;
      case "cep":
        if (!value) return "CEP é obrigatório";
        if (!validateCep(value)) return "CEP inválido";
        break;
      case "street":
        if (!value) return "Rua é obrigatória";
        break;
      case "number":
        if (!value) return "Número é obrigatório";
        break;
      case "neighborhood":
        if (!value) return "Bairro é obrigatório";
        break;
      case "city":
        if (!value) return "Cidade é obrigatória";
        break;
      case "state":
        if (!value) return "Estado é obrigatório";
        break;
    }
    return undefined;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateAll = (): boolean => {
    const newErrors: FieldErrors = {};

    // Dados pessoais
    newErrors.email = validateField("email", c.email);
    newErrors.firstName = validateField("firstName", c.firstName);
    newErrors.lastName = validateField("lastName", c.lastName);
    newErrors.phone = validateField("phone", c.phone);
    newErrors.cpf = validateField("cpf", c.cpf);

    // Endereço
    newErrors.cep = validateField("cep", a.cep);
    newErrors.street = validateField("street", a.street);
    newErrors.number = validateField("number", a.number);
    newErrors.neighborhood = validateField("neighborhood", a.neighborhood);
    newErrors.city = validateField("city", a.city);
    newErrors.state = validateField("state", a.state);

    // Frete
    if (quoteStatus !== "success" || !cotacaoId || servicoId === null) {
      newErrors.shipping = "Calcule e selecione uma opção de frete";
    }

    setErrors(newErrors);
    setTouched({
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      cpf: true,
      cep: true,
      street: true,
      number: true,
      neighborhood: true,
      city: true,
      state: true,
    });

    return !Object.values(newErrors).some(Boolean);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) {
      toast.error("Corrija os campos em vermelho");
      // Scroll para o primeiro erro
      setTimeout(() => {
        const firstError = document.querySelector('[data-error="true"]');
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }

    setIsSubmitting(true);

    // Simular pequeno delay para feedback visual
    await new Promise((r) => setTimeout(r, 300));

    setCustomer(c);
    setShippingAddress(a);
    setStep("payment");
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section title="Dados Pessoais">
        <Grid>
          <Field label="Email" full error={touched.email ? errors.email : undefined}>
            <input
              type="email"
              required
              value={c.email}
              onChange={(e) => setC({ ...c, email: e.target.value })}
              onBlur={() => handleBlur("email", c.email)}
              data-error={!!errors.email && touched.email}
              className={inputCls(touched.email ? errors.email : undefined)}
              placeholder="seu@email.com"
            />
          </Field>
          <Field label="Nome" error={touched.firstName ? errors.firstName : undefined}>
            <input
              required
              value={c.firstName}
              onChange={(e) => setC({ ...c, firstName: e.target.value })}
              onBlur={() => handleBlur("firstName", c.firstName)}
              data-error={!!errors.firstName && touched.firstName}
              className={inputCls(touched.firstName ? errors.firstName : undefined)}
              placeholder="João"
            />
          </Field>
          <Field label="Sobrenome" error={touched.lastName ? errors.lastName : undefined}>
            <input
              required
              value={c.lastName}
              onChange={(e) => setC({ ...c, lastName: e.target.value })}
              onBlur={() => handleBlur("lastName", c.lastName)}
              data-error={!!errors.lastName && touched.lastName}
              className={inputCls(touched.lastName ? errors.lastName : undefined)}
              placeholder="Silva"
            />
          </Field>
          <Field label="Telefone" error={touched.phone ? errors.phone : undefined}>
            <input
              required
              value={c.phone}
              onChange={(e) => setC({ ...c, phone: maskPhone(e.target.value) })}
              onBlur={() => handleBlur("phone", c.phone)}
              data-error={!!errors.phone && touched.phone}
              placeholder="(00) 00000-0000"
              className={inputCls(touched.phone ? errors.phone : undefined)}
            />
          </Field>
          <Field label="CPF" error={touched.cpf ? errors.cpf : undefined}>
            <input
              required
              value={c.cpf}
              onChange={(e) => setC({ ...c, cpf: maskCpf(e.target.value) })}
              onBlur={() => handleBlur("cpf", c.cpf)}
              data-error={!!errors.cpf && touched.cpf}
              placeholder="000.000.000-00"
              className={inputCls(touched.cpf ? errors.cpf : undefined)}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Endereço de Entrega">
        <Grid>
          <Field label="CEP" error={touched.cep ? errors.cep : undefined}>
            <div className="relative">
              <input
                required
                value={a.cep}
                onChange={(e) => {
                  const v = maskCep(e.target.value);
                  const digits = v.replace(/\D/g, "");
                  setA({ ...a, cep: v });
                  if (digits.length !== 8) {
                    clearShippingQuote();
                  }
                  if (digits.length === 8) {
                    quoteRequestRef.current += 1;
                    void lookupCep(v, quoteRequestRef.current);
                  }
                }}
                onBlur={() => handleBlur("cep", a.cep)}
                data-error={!!errors.cep && touched.cep}
                placeholder="00000-000"
                className={inputCls(touched.cep ? errors.cep : undefined)}
              />
              {cepLoading && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#B07B1E]" />
              )}
            </div>
          </Field>
          <div className="md:col-span-2 flex items-end">
            <a
              href="https://buscacepinter.correios.com.br/app/endereco/index.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#B07B1E] hover:underline flex items-center gap-1"
            >
              <Info className="w-3 h-3" /> Não sei meu CEP
            </a>
          </div>
          <Field label="Rua" full error={touched.street ? errors.street : undefined}>
            <input
              required
              value={a.street}
              onChange={(e) => setA({ ...a, street: e.target.value })}
              onBlur={() => handleBlur("street", a.street)}
              data-error={!!errors.street && touched.street}
              className={inputCls(touched.street ? errors.street : undefined)}
              placeholder="Rua, Avenida, etc."
            />
          </Field>
          <Field label="Número" error={touched.number ? errors.number : undefined}>
            <input
              required
              value={a.number}
              onChange={(e) => setA({ ...a, number: e.target.value })}
              onBlur={() => handleBlur("number", a.number)}
              data-error={!!errors.number && touched.number}
              className={inputCls(touched.number ? errors.number : undefined)}
              placeholder="123"
            />
          </Field>
          <Field label="Complemento">
            <input
              value={a.complement}
              onChange={(e) => setA({ ...a, complement: e.target.value })}
              className={inputCls()}
              placeholder="Apto, Bloco, etc. (opcional)"
            />
          </Field>
          <Field label="Bairro" error={touched.neighborhood ? errors.neighborhood : undefined}>
            <input
              required
              value={a.neighborhood}
              onChange={(e) => setA({ ...a, neighborhood: e.target.value })}
              onBlur={() => handleBlur("neighborhood", a.neighborhood)}
              data-error={!!errors.neighborhood && touched.neighborhood}
              className={inputCls(touched.neighborhood ? errors.neighborhood : undefined)}
              placeholder="Centro"
            />
          </Field>
          <Field label="Cidade" error={touched.city ? errors.city : undefined}>
            <input
              required
              value={a.city}
              onChange={(e) => setA({ ...a, city: e.target.value })}
              onBlur={() => handleBlur("city", a.city)}
              data-error={!!errors.city && touched.city}
              className={inputCls(touched.city ? errors.city : undefined)}
              placeholder="São Paulo"
            />
          </Field>
          <Field label="Estado" error={touched.state ? errors.state : undefined}>
            <select
              required
              value={a.state}
              onChange={(e) => setA({ ...a, state: e.target.value })}
              onBlur={() => handleBlur("state", a.state)}
              data-error={!!errors.state && touched.state}
              className={inputCls(touched.state ? errors.state : undefined)}
            >
              <option value="">Selecione</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Método de Envio">
        {hasFreeShipping && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-[#1C6B4A]/10 border border-[#1C6B4A]/20">
            <CheckCircle className="w-5 h-5 text-[#1C6B4A]" />
            <span className="text-sm text-[#1C6B4A] font-medium">
              Parabéns! Você ganhou frete grátis!
            </span>
          </div>
        )}
        {quoteStatus === "idle" && (
          <p className="text-sm text-[#51635F]">
            Informe um CEP válido para calcular opções de frete.
          </p>
        )}
        {quoteStatus === "loading" && (
          <div className="flex items-center gap-2 text-sm text-[#51635F]">
            <Loader2 className="w-4 h-4 animate-spin text-[#B07B1E]" />
            Calculando opções de frete...
          </div>
        )}
        {quoteStatus === "error" && quoteError && (
          <p className="text-sm text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {quoteError}
          </p>
        )}
        {quoteStatus === "success" && (
          <div className="space-y-3">
            {opcoes.map((opcao) => (
              <label
                key={opcao.servicoId}
                className={`flex items-center gap-4 border p-4 cursor-pointer transition-all ${
                  servicoId === opcao.servicoId
                    ? "border-[#B07B1E] bg-[#F3EEE3]"
                    : "border-[#E9E1D2] hover:border-[#B07B1E]/50"
                } ${errors.shipping && servicoId === null ? "border-red-300" : ""}`}
              >
                <input
                  type="radio"
                  name="shipping"
                  checked={servicoId === opcao.servicoId}
                  onChange={() => {
                    setServicoId(opcao.servicoId);
                    setShippingPrice(opcao.precoExibidoCentavos / 100);
                  }}
                  className="w-4 h-4 accent-[#B07B1E]"
                />
                <Truck className="w-5 h-5 text-[#0F3A3E]" />
                <div className="flex-1">
                  <div className="font-semibold text-[#0F3A3E] text-sm">
                    {opcao.transportadora} • {opcao.servico}
                  </div>
                  <div className="text-xs text-[#51635F]">
                    {opcao.prazoDias} {opcao.prazoDias === 1 ? "dia útil" : "dias úteis"}
                  </div>
                </div>
                <div className="font-serif text-[#0F3A3E]">
                  {opcao.precoExibidoCentavos === 0 ? (
                    <span className="text-[#1C6B4A] font-medium">Grátis</span>
                  ) : (
                    (opcao.precoExibidoCentavos / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
        {errors.shipping && servicoId === null && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.shipping}
          </p>
        )}
      </Section>

      <button
        type="submit"
        disabled={isSubmitting || quoteStatus !== "success"}
        className="w-full bg-[#0F3A3E] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processando...
          </>
        ) : (
          "Continuar para Pagamento"
        )}
      </button>
    </form>
  );
}

const inputCls = (error?: string) =>
  `w-full border bg-white px-4 py-3 text-sm text-[#0F3A3E] focus:outline-none transition-colors ${
    error ? "border-red-400 focus:border-red-500" : "border-[#E9E1D2] focus:border-[#B07B1E]"
  }`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#E9E1D2] p-6">
      <h3 className="font-serif text-lg text-[#0F3A3E] mb-5">{title}</h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>;
}

function Field({
  label,
  full,
  error,
  children,
}: {
  label: string;
  full?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-3" : ""}>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-[#51635F] font-semibold mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
