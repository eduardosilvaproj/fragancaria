import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { CheckCircle, Clock, Mail, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/afiliado/cadastro-sucesso")({
  head: () => ({
    meta: [
      { title: "Cadastro Enviado | Fragranciaria" },
      { name: "description", content: "Seu cadastro de afiliado foi enviado com sucesso!" },
    ],
  }),
  component: CadastroSucessoPage,
});

function CadastroSucessoPage() {
  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />

      <main className="py-16 md:py-24 px-6 md:px-14">
        <div className="max-w-[560px] mx-auto text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-[#1C6B4A] rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="font-serif text-[28px] md:text-[40px] text-[#0F3A3E]">
            Cadastro Enviado!
          </h1>
          <p className="text-[16px] text-[#51635F] mt-4 leading-[1.7]">
            Obrigado por se cadastrar no Programa de Afiliados Fragranciaria.
            Seu cadastro foi recebido e está em análise.
          </p>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-4 mt-10">
            <div className="bg-white border border-[#E9E1D2] p-6 text-left">
              <div className="w-10 h-10 bg-[#F3EEE3] rounded-full flex items-center justify-center mb-4">
                <Clock className="h-5 w-5 text-[#B07B1E]" />
              </div>
              <h3 className="font-medium text-[#0F3A3E] mb-2">Prazo de Análise</h3>
              <p className="text-[13px] text-[#75827E] leading-[1.6]">
                Nossa equipe analisa cada cadastro individualmente.
                O prazo é de até <strong>48 horas úteis</strong>.
              </p>
            </div>

            <div className="bg-white border border-[#E9E1D2] p-6 text-left">
              <div className="w-10 h-10 bg-[#F3EEE3] rounded-full flex items-center justify-center mb-4">
                <Mail className="h-5 w-5 text-[#B07B1E]" />
              </div>
              <h3 className="font-medium text-[#0F3A3E] mb-2">Fique de Olho</h3>
              <p className="text-[13px] text-[#75827E] leading-[1.6]">
                Você receberá um e-mail quando seu cadastro for
                aprovado com instruções para acessar o portal.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-[#0F3A3E] p-6 md:p-8 mt-10 text-left">
            <h3 className="font-serif text-[18px] text-white mb-4">Enquanto isso...</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-[14px] text-white/80">
                <span className="text-[#E8C25A]">✓</span>
                Confira seu e-mail (inclusive spam) para o link de confirmação
              </li>
              <li className="flex items-start gap-3 text-[14px] text-white/80">
                <span className="text-[#E8C25A]">✓</span>
                Explore nossos produtos para conhecer o que você vai divulgar
              </li>
              <li className="flex items-start gap-3 text-[14px] text-white/80">
                <span className="text-[#E8C25A]">✓</span>
                Siga a Fragranciaria nas redes sociais para dicas e novidades
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              to="/produtos"
              className="inline-flex items-center justify-center gap-2 bg-[#B07B1E] hover:bg-[#C68C28] text-white px-8 py-4 text-[13px] tracking-[0.16em] uppercase font-medium transition-colors"
            >
              Explorar Produtos
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 border border-[#0F3A3E] text-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white px-8 py-4 text-[13px] tracking-[0.16em] uppercase font-medium transition-colors"
            >
              Voltar à Home
            </Link>
          </div>

          {/* Support */}
          <p className="text-[13px] text-[#75827E] mt-10">
            Dúvidas? Entre em contato:{" "}
            <a
              href="mailto:afiliados@fragranciaria.com.br"
              className="text-[#B07B1E] hover:underline"
            >
              afiliados@fragranciaria.com.br
            </a>
          </p>
        </div>
      </main>

      <FooterEditorial />
    </div>
  );
}
