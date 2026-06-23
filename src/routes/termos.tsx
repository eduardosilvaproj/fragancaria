import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos e Condições | Fragranciaria" },
      { name: "description", content: "Termos e condições de uso do site Fragranciaria." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-12 max-w-4xl">
          <h1 className="font-serif text-4xl md:text-5xl mb-12 font-light text-[#1C302E]">
            Termos e <span className="italic text-[#B07B1E]">Condições</span>
          </h1>

          <div className="prose prose-lg max-w-none text-[#1C302E]/70">
            <p className="text-sm leading-relaxed mb-8">
              Última atualização: {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">1. Aceitação dos Termos</h2>
              <p className="text-sm leading-relaxed">
                Ao acessar e utilizar o site Fragranciaria, você concorda com estes termos e condições.
                Se não concordar com qualquer parte destes termos, não utilize nosso site.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">2. Produtos e Preços</h2>
              <p className="text-sm leading-relaxed mb-4">
                Todos os preços exibidos estão em Reais (BRL) e podem ser alterados sem aviso prévio.
                Nos esforçamos para manter informações precisas, mas erros podem ocorrer.
              </p>
              <p className="text-sm leading-relaxed">
                Reservamo-nos o direito de limitar quantidades e recusar pedidos a nosso critério.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">3. Pagamento</h2>
              <p className="text-sm leading-relaxed">
                Aceitamos as formas de pagamento exibidas no checkout. O processamento do pagamento
                é realizado através de plataformas seguras e criptografadas.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">4. Entrega</h2>
              <p className="text-sm leading-relaxed">
                Os prazos de entrega são estimativas e podem variar conforme a região.
                O frete é calculado no momento da compra com base no CEP de destino.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">5. Propriedade Intelectual</h2>
              <p className="text-sm leading-relaxed">
                Todo o conteúdo do site, incluindo textos, imagens, logos e design,
                é protegido por direitos autorais e não pode ser reproduzido sem autorização.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">6. Limitação de Responsabilidade</h2>
              <p className="text-sm leading-relaxed">
                A Fragranciaria não se responsabiliza por danos indiretos decorrentes do uso do site.
                Nossa responsabilidade é limitada ao valor do pedido realizado.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">7. Alterações nos Termos</h2>
              <p className="text-sm leading-relaxed">
                Podemos atualizar estes termos periodicamente. Alterações significativas serão
                comunicadas no site. O uso continuado após alterações constitui aceitação.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">8. Contato</h2>
              <p className="text-sm leading-relaxed">
                Para dúvidas sobre estes termos, entre em contato através da nossa página de Contato.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
