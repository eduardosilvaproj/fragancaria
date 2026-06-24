import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { SHIPPING_METHODS, type ShippingMethodId } from "@/config/mercadopago";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const maskPhone = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

const maskCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1-$2");

const maskCep = (v: string) =>
  v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

export function ShippingForm() {
  const { customer, shippingAddress, shippingMethod, setCustomer, setShippingAddress, setShippingMethod, setStep } = useCheckoutStore();

  const [c, setC] = useState(
    customer ?? { email: "", firstName: "", lastName: "", phone: "", cpf: "" }
  );
  const [a, setA] = useState(
    shippingAddress ?? { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }
  );
  const [method, setMethod] = useState<ShippingMethodId | null>(shippingMethod);
  const [cepLoading, setCepLoading] = useState(false);

  const lookupCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await r.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
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
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) {
      toast.error("Selecione um método de envio");
      return;
    }
    setCustomer(c);
    setShippingAddress(a);
    setShippingMethod(method);
    setStep("payment");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section title="Dados Pessoais">
        <Grid>
          <Field label="Email" full>
            <input type="email" required value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Nome">
            <input required value={c.firstName} onChange={(e) => setC({ ...c, firstName: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Sobrenome">
            <input required value={c.lastName} onChange={(e) => setC({ ...c, lastName: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Telefone">
            <input required value={c.phone} onChange={(e) => setC({ ...c, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" className={inputCls} />
          </Field>
          <Field label="CPF">
            <input required value={c.cpf} onChange={(e) => setC({ ...c, cpf: maskCpf(e.target.value) })} placeholder="000.000.000-00" className={inputCls} />
          </Field>
        </Grid>
      </Section>

      <Section title="Endereço de Entrega">
        <Grid>
          <Field label="CEP">
            <div className="relative">
              <input
                required
                value={a.cep}
                onChange={(e) => {
                  const v = maskCep(e.target.value);
                  setA({ ...a, cep: v });
                  if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                }}
                placeholder="00000-000"
                className={inputCls}
              />
              {cepLoading && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#B07B1E]" />
              )}
            </div>
          </Field>
          <div className="md:col-span-2" />
          <Field label="Rua" full>
            <input required value={a.street} onChange={(e) => setA({ ...a, street: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Número">
            <input required value={a.number} onChange={(e) => setA({ ...a, number: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Complemento">
            <input value={a.complement} onChange={(e) => setA({ ...a, complement: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Bairro">
            <input required value={a.neighborhood} onChange={(e) => setA({ ...a, neighborhood: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Cidade">
            <input required value={a.city} onChange={(e) => setA({ ...a, city: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Estado">
            <select required value={a.state} onChange={(e) => setA({ ...a, state: e.target.value })} className={inputCls}>
              <option value="">UF</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Método de Envio">
        <div className="space-y-3">
          {SHIPPING_METHODS.map((s) => (
            <label
              key={s.id}
              className={`flex items-center gap-4 border p-4 cursor-pointer transition-all ${
                method === s.id ? "border-[#B07B1E] bg-[#F3EEE3]" : "border-[#E9E1D2] hover:border-[#B07B1E]/50"
              }`}
            >
              <input
                type="radio"
                name="shipping"
                checked={method === s.id}
                onChange={() => setMethod(s.id)}
                className="w-4 h-4 accent-[#B07B1E]"
              />
              <Truck className="w-5 h-5 text-[#0F3A3E]" />
              <div className="flex-1">
                <div className="font-semibold text-[#0F3A3E] text-sm">{s.name}</div>
                <div className="text-xs text-[#51635F]">{s.days}</div>
              </div>
              <div className="font-serif text-[#0F3A3E]">
                {s.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </label>
          ))}
        </div>
      </Section>

      <button
        type="submit"
        className="w-full bg-[#0F3A3E] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] transition-colors"
      >
        Continuar para Pagamento
      </button>
    </form>
  );
}

const inputCls =
  "w-full border border-[#E9E1D2] bg-white px-4 py-3 text-sm text-[#0F3A3E] focus:outline-none focus:border-[#B07B1E] transition-colors";

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

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-3" : ""}>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-[#51635F] font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}