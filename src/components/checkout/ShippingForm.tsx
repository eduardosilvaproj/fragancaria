import { useState } from "react";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { cn } from "@/lib/utils";
import { Truck, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShippingFormProps {
  onNext: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// Opções de frete simuladas
const SHIPPING_OPTIONS = [
  { id: "pac", name: "PAC", price: 18.9, estimatedDays: 8 },
  { id: "sedex", name: "SEDEX", price: 32.5, estimatedDays: 3 },
  { id: "express", name: "SEDEX 10", price: 45.0, estimatedDays: 1 },
];

export function ShippingForm({ onNext, isLoading, setIsLoading }: ShippingFormProps) {
  const {
    customer,
    setCustomer,
    shippingAddress,
    setShippingAddress,
    shippingMethod,
    setShippingMethod,
  } = useCheckoutStore();

  const [formData, setFormData] = useState({
    email: customer?.email || "",
    firstName: customer?.firstName || "",
    lastName: customer?.lastName || "",
    phone: customer?.phone || "",
    cpf: customer?.cpf || "",
    zipCode: shippingAddress?.zipCode || "",
    street: shippingAddress?.street || "",
    number: shippingAddress?.number || "",
    complement: shippingAddress?.complement || "",
    neighborhood: shippingAddress?.neighborhood || "",
    city: shippingAddress?.city || "",
    state: shippingAddress?.state || "",
  });

  const [selectedShipping, setSelectedShipping] = useState(shippingMethod?.id || "");
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Buscar CEP na API ViaCEP
  const handleCepBlur = async () => {
    const cep = formData.zipCode.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Formatar CPF
  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  // Formatar telefone
  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  // Formatar CEP
  const formatCep = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{3})\d+?$/, "$1");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast.error("Preencha os dados pessoais");
      return;
    }

    if (!formData.cpf || formData.cpf.replace(/\D/g, "").length !== 11) {
      toast.error("CPF inválido");
      return;
    }

    if (!formData.zipCode || !formData.street || !formData.number || !formData.city) {
      toast.error("Preencha o endereço completo");
      return;
    }

    if (!selectedShipping) {
      toast.error("Selecione o método de envio");
      return;
    }

    setIsLoading(true);

    // Salvar dados
    setCustomer({
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      cpf: formData.cpf.replace(/\D/g, ""),
    });

    setShippingAddress({
      zipCode: formData.zipCode.replace(/\D/g, ""),
      street: formData.street,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
    });

    const shipping = SHIPPING_OPTIONS.find((s) => s.id === selectedShipping);
    if (shipping) {
      setShippingMethod(shipping);
    }

    setTimeout(() => {
      setIsLoading(false);
      onNext();
    }, 500);
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Dados pessoais */}
      <div className="bg-white border border-[#E9E1D2] p-6">
        <h3 className="font-serif text-xl text-[#0F3A3E] mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-[#0F3A3E] text-white rounded-full flex items-center justify-center text-sm">
            1
          </span>
          Dados Pessoais
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-[#51635F] mb-1.5">
              E-mail *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              Nome *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="Nome"
            />
          </div>

          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              Sobrenome *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="Sobrenome"
            />
          </div>

          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              Telefone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  phone: formatPhone(e.target.value),
                }))
              }
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              CPF *
            </label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  cpf: formatCpf(e.target.value),
                }))
              }
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-white border border-[#E9E1D2] p-6">
        <h3 className="font-serif text-xl text-[#0F3A3E] mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-[#0F3A3E] text-white rounded-full flex items-center justify-center text-sm">
            2
          </span>
          Endereço de Entrega
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              CEP *
            </label>
            <div className="relative">
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    zipCode: formatCep(e.target.value),
                  }))
                }
                onBlur={handleCepBlur}
                required
                className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors pr-10"
                placeholder="00000-000"
                maxLength={9}
              />
              {isLoadingCep && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#B07B1E] animate-spin" />
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-[#51635F] mb-1.5">
              Rua *
            </label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="Nome da rua"
            />
          </div>

          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              Número *
            </label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="123"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-[#51635F] mb-1.5">
              Complemento
            </label>
            <input
              type="text"
              name="complement"
              value={formData.complement}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="Apto, bloco, etc."
            />
          </div>

          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              Bairro *
            </label>
            <input
              type="text"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="Bairro"
            />
          </div>

          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              Cidade *
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors"
              placeholder="Cidade"
            />
          </div>

          <div>
            <label className="block text-sm text-[#51635F] mb-1.5">
              Estado *
            </label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] transition-colors bg-white"
            >
              <option value="">Selecione</option>
              <option value="AC">Acre</option>
              <option value="AL">Alagoas</option>
              <option value="AP">Amapá</option>
              <option value="AM">Amazonas</option>
              <option value="BA">Bahia</option>
              <option value="CE">Ceará</option>
              <option value="DF">Distrito Federal</option>
              <option value="ES">Espírito Santo</option>
              <option value="GO">Goiás</option>
              <option value="MA">Maranhão</option>
              <option value="MT">Mato Grosso</option>
              <option value="MS">Mato Grosso do Sul</option>
              <option value="MG">Minas Gerais</option>
              <option value="PA">Pará</option>
              <option value="PB">Paraíba</option>
              <option value="PR">Paraná</option>
              <option value="PE">Pernambuco</option>
              <option value="PI">Piauí</option>
              <option value="RJ">Rio de Janeiro</option>
              <option value="RN">Rio Grande do Norte</option>
              <option value="RS">Rio Grande do Sul</option>
              <option value="RO">Rondônia</option>
              <option value="RR">Roraima</option>
              <option value="SC">Santa Catarina</option>
              <option value="SP">São Paulo</option>
              <option value="SE">Sergipe</option>
              <option value="TO">Tocantins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Método de envio */}
      <div className="bg-white border border-[#E9E1D2] p-6">
        <h3 className="font-serif text-xl text-[#0F3A3E] mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-[#0F3A3E] text-white rounded-full flex items-center justify-center text-sm">
            3
          </span>
          Método de Envio
        </h3>

        <div className="space-y-3">
          {SHIPPING_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex items-center justify-between p-4 border cursor-pointer transition-all",
                selectedShipping === option.id
                  ? "border-[#0F3A3E] bg-[#F8F4EA]"
                  : "border-[#E9E1D2] hover:border-[#B07B1E]"
              )}
            >
              <div className="flex items-center gap-4">
                <input
                  type="radio"
                  name="shipping"
                  value={option.id}
                  checked={selectedShipping === option.id}
                  onChange={(e) => setSelectedShipping(e.target.value)}
                  className="w-5 h-5 text-[#0F3A3E] border-[#E9E1D2] focus:ring-[#B07B1E]"
                />
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-[#75827E]" />
                  <div>
                    <p className="font-medium text-[#0F3A3E]">{option.name}</p>
                    <p className="text-sm text-[#75827E]">
                      {option.estimatedDays === 1
                        ? "Entrega em 1 dia útil"
                        : `Entrega em até ${option.estimatedDays} dias úteis`}
                    </p>
                  </div>
                </div>
              </div>
              <span className="font-medium text-[#0F3A3E]">
                {formatPrice(option.price)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#0F3A3E] text-white py-4 text-sm uppercase tracking-wider font-semibold hover:bg-[#16504F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processando...
          </>
        ) : (
          "Continuar para Pagamento"
        )}
      </button>
    </form>
  );
}
