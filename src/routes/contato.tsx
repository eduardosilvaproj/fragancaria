import { createFileRoute } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { Mail, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato | Fragranciaria" },
      { name: "description", content: "Entre em contato com a Fragranciaria. Tire suas dúvidas sobre produtos, pedidos e mais." },
    ],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    assunto: "",
    mensagem: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Integrar com backend real (Shopify/Formspree/etc)
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success("Mensagem enviada!", {
      description: "Responderemos em até 24 horas úteis."
    });

    setFormData({ nome: "", email: "", assunto: "", mensagem: "" });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-12 max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="font-serif text-4xl md:text-5xl mb-6 font-light text-[#1C302E]">
              Fale <span className="italic text-[#B07B1E]">Conosco</span>
            </h1>
            <p className="text-[#1C302E]/60 text-sm max-w-xl mx-auto">
              Estamos aqui para ajudar. Envie sua mensagem e responderemos o mais breve possível.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Info Cards */}
            <div className="space-y-6">
              <div className="bg-[#F8F6F2] p-8">
                <Mail className="h-6 w-6 text-[#B07B1E] mb-4" />
                <h3 className="font-serif text-lg text-[#1C302E] mb-2">E-mail</h3>
                <p className="text-sm text-[#1C302E]/60">
                  Resposta em até 24h úteis
                </p>
              </div>

              <div className="bg-[#F8F6F2] p-8">
                <Clock className="h-6 w-6 text-[#B07B1E] mb-4" />
                <h3 className="font-serif text-lg text-[#1C302E] mb-2">Horário</h3>
                <p className="text-sm text-[#1C302E]/60">
                  Segunda a Sexta: 9h às 18h
                </p>
              </div>

              <div className="bg-[#F8F6F2] p-8">
                <MapPin className="h-6 w-6 text-[#B07B1E] mb-4" />
                <h3 className="font-serif text-lg text-[#1C302E] mb-2">Localização</h3>
                <p className="text-sm text-[#1C302E]/60">
                  São Paulo - SP
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-[#1C302E]/60 mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full border border-[#1C302E]/10 h-14 px-6 text-sm outline-none focus:border-[#B07B1E] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-[#1C302E]/60 mb-2">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-[#1C302E]/10 h-14 px-6 text-sm outline-none focus:border-[#B07B1E] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-[#1C302E]/60 mb-2">
                    Assunto *
                  </label>
                  <select
                    required
                    value={formData.assunto}
                    onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                    className="w-full border border-[#1C302E]/10 h-14 px-6 text-sm outline-none focus:border-[#B07B1E] transition-colors bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="duvida-produto">Dúvida sobre produto</option>
                    <option value="pedido">Dúvida sobre pedido</option>
                    <option value="troca-devolucao">Troca ou devolução</option>
                    <option value="parceria">Parceria comercial</option>
                    <option value="outro">Outro assunto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-[#1C302E]/60 mb-2">
                    Mensagem *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.mensagem}
                    onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                    className="w-full border border-[#1C302E]/10 p-6 text-sm outline-none focus:border-[#B07B1E] transition-colors resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0F3A3E] hover:bg-[#B07B1E] text-white h-14 px-12 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <FooterEditorial />
    </div>
  );
}
