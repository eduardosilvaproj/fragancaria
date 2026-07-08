import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import {
  TrendingUp,
  Link as LinkIcon,
  DollarSign,
  BarChart3,
  Users,
  Gift,
  CheckCircle,
  ArrowRight,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/seja-afiliado")({
  head: () => ({
    meta: [
      { title: "Seja Afiliado | Fragranciaria" },
      {
        name: "description",
        content:
          "Ganhe dinheiro divulgando produtos profissionais para cabelos. Comissões de até 15%, links rastreáveis e pagamentos garantidos.",
      },
    ],
  }),
  component: SejaAfiliadoPage,
});

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Comissões Atrativas",
    description: "Ganhe de 8% a 15% em cada venda. Quanto mais você vende, maior sua comissão.",
  },
  {
    icon: LinkIcon,
    title: "Links Personalizados",
    description: "Gere links únicos para cada produto e acompanhe seus resultados em tempo real.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Completo",
    description: "Painel exclusivo com métricas de cliques, conversões, vendas e comissões.",
  },
  {
    icon: Gift,
    title: "Programa de Metas",
    description: "Suba de nível e desbloqueie benefícios exclusivos como produtos grátis e bônus.",
  },
];

const TIERS = [
  {
    name: "Bronze",
    icon: "🥉",
    color: "#CD7F32",
    commission: "8%",
    minSales: "R$ 0",
    benefits: ["Acesso ao portal", "Links ilimitados", "Relatórios básicos"],
  },
  {
    name: "Prata",
    icon: "🥈",
    color: "#C0C0C0",
    commission: "10%",
    minSales: "R$ 2.000/mês",
    benefits: ["Todos benefícios Bronze", "Badge exclusivo", "Suporte prioritário"],
  },
  {
    name: "Ouro",
    icon: "🥇",
    color: "#FFD700",
    commission: "12%",
    minSales: "R$ 5.000/mês",
    benefits: ["Todos benefícios Prata", "Produtos para teste", "Materiais exclusivos"],
    popular: true,
  },
  {
    name: "Diamante",
    icon: "💎",
    color: "#B9F2FF",
    commission: "15%",
    minSales: "R$ 15.000/mês",
    benefits: ["Todos benefícios Ouro", "Comissão premium", "Gerente dedicado", "Bônus trimestral"],
  },
];

const STEPS = [
  {
    num: "01",
    title: "Cadastre-se",
    description: "Preencha o formulário com seus dados. É rápido e gratuito.",
  },
  {
    num: "02",
    title: "Aguarde Aprovação",
    description: "Nossa equipe analisa seu cadastro em até 48h úteis.",
  },
  {
    num: "03",
    title: "Gere seus Links",
    description: "Acesse o portal e crie links para qualquer produto da loja.",
  },
  {
    num: "04",
    title: "Divulgue e Ganhe",
    description: "Compartilhe nas redes sociais e receba comissão por cada venda.",
  },
];

const TESTIMONIALS = [
  {
    name: "Carla Mendes",
    role: "Influenciadora de Beleza",
    image: "/images/testimonial-1.jpg",
    text: "Em 3 meses já consegui uma renda extra de R$2.500 só indicando os produtos que eu já usava!",
    stars: 5,
  },
  {
    name: "Juliana Costa",
    role: "Cabeleireira",
    image: "/images/testimonial-2.jpg",
    text: "Indico para minhas clientes e ganho comissão. Melhor programa de afiliados que já participei.",
    stars: 5,
  },
  {
    name: "Fernanda Lima",
    role: "Criadora de Conteúdo",
    image: "/images/testimonial-3.jpg",
    text: "O dashboard é muito fácil de usar e os pagamentos sempre caem certinho na data.",
    stars: 5,
  },
];

const FAQ = [
  {
    question: "Quanto custa para participar?",
    answer: "O programa é 100% gratuito. Não há taxas de adesão ou mensalidades.",
  },
  {
    question: "Como recebo minha comissão?",
    answer:
      "Pagamentos são feitos via Pix até o dia 15 de cada mês, referente às vendas do mês anterior confirmadas.",
  },
  {
    question: "Qual o valor mínimo para saque?",
    answer: "O valor mínimo para solicitar pagamento é de R$100,00 em comissões acumuladas.",
  },
  {
    question: "Por quanto tempo o link fica válido?",
    answer:
      "Quando alguém clica no seu link, você tem direito à comissão se a compra for realizada em até 30 dias.",
  },
  {
    question: "Posso divulgar em qualquer canal?",
    answer:
      "Sim! Redes sociais, blog, YouTube, WhatsApp, e-mail... você escolhe onde divulgar. Não permitimos apenas spam ou práticas antiéticas.",
  },
];

function SejaAfiliadoPage() {
  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />

      <main>
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 px-6 md:px-14 overflow-hidden">
          {/* Background decoration */}
          <div
            className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30"
            style={{
              background:
                "radial-gradient(circle at center, rgba(176,123,30,0.2) 0%, transparent 70%)",
            }}
          />

          <div className="max-w-[1280px] mx-auto relative z-10">
            <div className="max-w-3xl">
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-5">
                <span className="w-10 h-[1px] bg-[#B07B1E]" />
                <span className="text-[11px] tracking-[0.25em] text-[#B07B1E] uppercase">
                  Programa de Afiliados
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-serif font-medium text-[36px] md:text-[56px] lg:text-[72px] leading-[1.05] text-[#0F3A3E]">
                Ganhe dinheiro <br />
                indicando <em className="italic text-[#B07B1E]">beleza</em>.
              </h1>

              {/* Subheadline */}
              <p className="text-[17px] md:text-[19px] text-[#51635F] mt-6 leading-[1.7] max-w-[540px]">
                Divulgue os melhores produtos profissionais para cabelos e receba comissões de até{" "}
                <strong className="text-[#0F3A3E]">15%</strong> em cada venda. Sem investimento
                inicial, sem complicação.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <Link
                  to="/afiliado/cadastro"
                  className="inline-flex items-center justify-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] text-white px-8 py-4 text-[13px] tracking-[0.18em] uppercase font-medium transition-colors"
                >
                  Quero ser Afiliado
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/afiliado/login"
                  className="inline-flex items-center justify-center gap-2 border border-[#0F3A3E] text-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white px-8 py-4 text-[13px] tracking-[0.18em] uppercase font-medium transition-colors"
                >
                  Já sou Afiliado
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 md:gap-12 mt-12 pt-8 border-t border-[#E0D8C7]">
                <div>
                  <div className="font-serif text-[32px] md:text-[40px] text-[#0F3A3E]">500+</div>
                  <div className="text-[12px] tracking-[0.1em] text-[#75827E] uppercase">
                    Afiliados Ativos
                  </div>
                </div>
                <div>
                  <div className="font-serif text-[32px] md:text-[40px] text-[#0F3A3E]">R$180k</div>
                  <div className="text-[12px] tracking-[0.1em] text-[#75827E] uppercase">
                    Pagos em Comissões
                  </div>
                </div>
                <div>
                  <div className="font-serif text-[32px] md:text-[40px] text-[#0F3A3E]">15%</div>
                  <div className="text-[12px] tracking-[0.1em] text-[#75827E] uppercase">
                    Comissão Máxima
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 px-6 md:px-14 bg-white">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="text-[11px] tracking-[0.25em] text-[#B07B1E] uppercase">
                Por que ser afiliado
              </span>
              <h2 className="font-serif font-medium text-[28px] md:text-[42px] text-[#0F3A3E] mt-3">
                Vantagens <em className="italic text-[#B07B1E]">exclusivas</em>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {BENEFITS.map((benefit, i) => (
                <div
                  key={i}
                  className="p-6 md:p-8 border border-[#E9E1D2] bg-[#FDFCFA] hover:border-[#B07B1E] transition-colors group"
                >
                  <div className="w-12 h-12 bg-[#0F3A3E] text-white flex items-center justify-center mb-5 group-hover:bg-[#B07B1E] transition-colors">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif text-[20px] text-[#0F3A3E] mb-2">{benefit.title}</h3>
                  <p className="text-[14px] text-[#75827E] leading-[1.6]">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tiers Section */}
        <section className="py-16 md:py-24 px-6 md:px-14 bg-[#F3EEE3]">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="text-[11px] tracking-[0.25em] text-[#B07B1E] uppercase">
                Níveis de Comissão
              </span>
              <h2 className="font-serif font-medium text-[28px] md:text-[42px] text-[#0F3A3E] mt-3">
                Quanto mais vende, mais <em className="italic text-[#B07B1E]">ganha</em>
              </h2>
              <p className="text-[15px] text-[#75827E] mt-4 max-w-[600px] mx-auto">
                Seu nível é calculado automaticamente com base nas suas vendas do mês anterior.
                Atinja as metas e desbloqueie comissões maiores.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {TIERS.map((tier, i) => (
                <div
                  key={i}
                  className={`relative p-6 md:p-8 bg-white border ${
                    tier.popular ? "border-[#B07B1E] ring-1 ring-[#B07B1E]" : "border-[#E9E1D2]"
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B07B1E] text-white text-[10px] tracking-[0.1em] uppercase px-3 py-1">
                      Mais Popular
                    </div>
                  )}

                  <div className="text-center">
                    <div className="text-4xl mb-3">{tier.icon}</div>
                    <h3 className="font-serif text-[22px] text-[#0F3A3E]">{tier.name}</h3>
                    <div
                      className="font-serif text-[36px] md:text-[42px] mt-2"
                      style={{ color: tier.color === "#C0C0C0" ? "#6B7280" : tier.color }}
                    >
                      {tier.commission}
                    </div>
                    <div className="text-[12px] text-[#75827E] uppercase tracking-[0.1em] mt-1">
                      {tier.minSales}
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {tier.benefits.map((benefit, j) => (
                      <li key={j} className="flex items-start gap-2 text-[13px] text-[#51635F]">
                        <CheckCircle className="h-4 w-4 text-[#1C6B4A] flex-shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-16 md:py-24 px-6 md:px-14 bg-[#0F3A3E]">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="text-[11px] tracking-[0.25em] text-[#E8C25A] uppercase">
                Como Funciona
              </span>
              <h2 className="font-serif font-medium text-[28px] md:text-[42px] text-white mt-3">
                Simples assim
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {STEPS.map((step, i) => (
                <div key={i} className="relative">
                  <div className="font-serif text-[48px] text-[#B07B1E] opacity-50 leading-none">
                    {step.num}
                  </div>
                  <h3 className="font-serif text-[20px] text-white mt-3">{step.title}</h3>
                  <p className="text-[14px] text-white/70 leading-[1.6] mt-2">{step.description}</p>

                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-8 -right-4 w-8 text-[#B07B1E]">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/afiliado/cadastro"
                className="inline-flex items-center justify-center gap-2 bg-[#B07B1E] hover:bg-[#C68C28] text-white px-8 py-4 text-[13px] tracking-[0.18em] uppercase font-medium transition-colors"
              >
                Começar Agora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 px-6 md:px-14 bg-white">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="text-[11px] tracking-[0.25em] text-[#B07B1E] uppercase">
                Depoimentos
              </span>
              <h2 className="font-serif font-medium text-[28px] md:text-[42px] text-[#0F3A3E] mt-3">
                Quem já <em className="italic text-[#B07B1E]">ganha</em> com a gente
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((testimonial, i) => (
                <div key={i} className="p-6 md:p-8 bg-[#F8F4EA] border border-[#E9E1D2]">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.stars)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-[#E8C25A] text-[#E8C25A]" />
                    ))}
                  </div>
                  <p className="text-[15px] text-[#51635F] leading-[1.7] italic">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[#E0D8C7]">
                    <div className="w-12 h-12 bg-[#0F3A3E] rounded-full flex items-center justify-center text-white font-serif text-lg">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-[#0F3A3E]">{testimonial.name}</div>
                      <div className="text-[12px] text-[#75827E]">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-24 px-6 md:px-14 bg-[#F3EEE3]">
          <div className="max-w-[800px] mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] tracking-[0.25em] text-[#B07B1E] uppercase">
                Dúvidas Frequentes
              </span>
              <h2 className="font-serif font-medium text-[28px] md:text-[42px] text-[#0F3A3E] mt-3">
                Perguntas & Respostas
              </h2>
            </div>

            <div className="space-y-4">
              {FAQ.map((item, i) => (
                <details
                  key={i}
                  className="group bg-white border border-[#E9E1D2] p-5 md:p-6 cursor-pointer"
                >
                  <summary className="flex items-center justify-between font-medium text-[#0F3A3E] list-none">
                    {item.question}
                    <span className="text-[#B07B1E] group-open:rotate-45 transition-transform text-xl">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-[14px] text-[#75827E] leading-[1.7]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24 px-6 md:px-14 bg-[#0F3A3E]">
          <div className="max-w-[800px] mx-auto text-center">
            <h2 className="font-serif font-medium text-[28px] md:text-[42px] text-white">
              Pronto para começar a <em className="italic text-[#E8C25A]">ganhar</em>?
            </h2>
            <p className="text-[16px] text-white/70 mt-4 max-w-[500px] mx-auto">
              Cadastre-se gratuitamente e comece a divulgar os melhores produtos profissionais para
              cabelos.
            </p>
            <Link
              to="/afiliado/cadastro"
              className="inline-flex items-center justify-center gap-2 bg-[#B07B1E] hover:bg-[#C68C28] text-white px-10 py-5 text-[13px] tracking-[0.18em] uppercase font-medium transition-colors mt-8"
            >
              Quero ser Afiliado
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <FooterEditorial />
    </div>
  );
}
