import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/trocas")({
  head: () => ({
    meta: [
      { title: "Trocas e Devoluções | Fragranciaria" },
      { name: "description", content: "Política de trocas e devoluções da Fragranciaria. Saiba como trocar ou devolver seu produto." },
    ],
  }),
  component: TrocasPage,
});

function TrocasPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-12 max-w-4xl">
          <h1 className="font-serif text-4xl md:text-5xl mb-12 font-light text-[#1C302E]">
            Trocas e <span className="italic text-[#B07B1E]">Devoluções</span>
          </h1>

          <div className="prose prose-lg max-w-none text-[#1C302E]/70">
            <p className="text-sm leading-relaxed mb-8">
              Última atualização: {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">Direito de Arrependimento</h2>
              <p className="text-sm leading-relaxed">
                Conforme o Código de Defesa do Consumidor (Art. 49), você pode desistir da compra
                em até <strong>7 dias corridos</strong> após o recebimento do produto, sem necessidade
                de justificativa. O produto deve estar lacrado, sem uso e na embalagem original.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">Condições para Troca ou Devolução</h2>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Produto lacrado e sem uso</li>
                <li>Embalagem original em perfeito estado</li>
                <li>Acompanhado da nota fiscal</li>
                <li>Dentro do prazo de 7 dias (arrependimento) ou 30 dias (defeito)</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">Produtos com Defeito</h2>
              <p className="text-sm leading-relaxed mb-4">
                Se o produto apresentar defeito de fabricação, você tem até <strong>30 dias</strong> para
                solicitar troca ou devolução. Envie fotos e descrição do problema para análise.
              </p>
              <p className="text-sm leading-relaxed">
                Após confirmação do defeito, oferecemos:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm mt-4">
                <li>Troca por produto idêntico</li>
                <li>Reembolso integral</li>
                <li>Crédito na loja</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">Produtos Não Elegíveis</h2>
              <p className="text-sm leading-relaxed mb-4">
                Por questões sanitárias, <strong>não aceitamos</strong> troca ou devolução de:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Produtos com lacre violado ou abertos</li>
                <li>Produtos usados, mesmo que parcialmente</li>
                <li>Produtos sem embalagem original</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">Como Solicitar</h2>
              <ol className="list-decimal pl-6 space-y-3 text-sm">
                <li>Entre em contato através da nossa página de Contato informando o número do pedido</li>
                <li>Descreva o motivo da solicitação</li>
                <li>Aguarde instruções para envio do produto</li>
                <li>Envie o produto conforme orientado</li>
                <li>Após recebimento e análise, processaremos a troca ou reembolso</li>
              </ol>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">Frete de Devolução</h2>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li><strong>Arrependimento:</strong> frete por conta do cliente</li>
                <li><strong>Defeito ou erro nosso:</strong> frete por nossa conta</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">Prazo de Reembolso</h2>
              <p className="text-sm leading-relaxed">
                Após recebimento e aprovação da devolução, o reembolso será processado em até
                <strong> 10 dias úteis</strong>. O prazo para o valor aparecer na sua conta depende
                da operadora do cartão ou banco.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">Dúvidas</h2>
              <p className="text-sm leading-relaxed">
                Para qualquer dúvida sobre trocas e devoluções, entre em contato através da
                nossa página de Contato.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
