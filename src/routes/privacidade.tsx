import { createFileRoute } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Fragranciaria" },
      { name: "description", content: "Política de privacidade e proteção de dados da Fragranciaria conforme LGPD." },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-12 max-w-4xl">
          <h1 className="font-serif text-4xl md:text-5xl mb-12 font-light text-[#1C302E]">
            Política de <span className="italic text-[#B07B1E]">Privacidade</span>
          </h1>

          <div className="prose prose-lg max-w-none text-[#1C302E]/70">
            <p className="text-sm leading-relaxed mb-8">
              Última atualização: {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <p className="text-sm leading-relaxed mb-8">
              Esta Política de Privacidade descreve como a Fragranciaria coleta, usa e protege
              suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">1. Dados que Coletamos</h2>
              <p className="text-sm leading-relaxed mb-4">Coletamos os seguintes dados:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li><strong>Dados de identificação:</strong> nome, e-mail, CPF, telefone</li>
                <li><strong>Dados de entrega:</strong> endereço completo</li>
                <li><strong>Dados de navegação:</strong> cookies, IP, páginas visitadas</li>
                <li><strong>Dados de compra:</strong> histórico de pedidos</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">2. Finalidade do Tratamento</h2>
              <p className="text-sm leading-relaxed mb-4">Usamos seus dados para:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Processar e entregar seus pedidos</li>
                <li>Comunicação sobre status do pedido</li>
                <li>Envio de newsletter (com seu consentimento)</li>
                <li>Melhorar nossos serviços</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">3. Base Legal (LGPD)</h2>
              <p className="text-sm leading-relaxed mb-4">O tratamento de dados é baseado em:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li><strong>Execução de contrato:</strong> para processar compras</li>
                <li><strong>Consentimento:</strong> para newsletter e marketing</li>
                <li><strong>Legítimo interesse:</strong> para melhorar serviços</li>
                <li><strong>Obrigação legal:</strong> para fins fiscais e contábeis</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">4. Compartilhamento de Dados</h2>
              <p className="text-sm leading-relaxed mb-4">Compartilhamos dados apenas com:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Transportadoras (para entrega)</li>
                <li>Processadores de pagamento</li>
                <li>Autoridades (quando exigido por lei)</li>
              </ul>
              <p className="text-sm leading-relaxed mt-4">
                Não vendemos ou alugamos seus dados pessoais a terceiros.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">5. Seus Direitos (LGPD)</h2>
              <p className="text-sm leading-relaxed mb-4">Você tem direito a:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Confirmar a existência de tratamento</li>
                <li>Acessar seus dados</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar anonimização ou bloqueio de dados desnecessários</li>
                <li>Solicitar eliminação de dados</li>
                <li>Revogar consentimento</li>
                <li>Solicitar portabilidade dos dados</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">6. Cookies</h2>
              <p className="text-sm leading-relaxed">
                Utilizamos cookies para melhorar sua experiência. Cookies são pequenos arquivos
                armazenados no seu dispositivo que nos ajudam a lembrar suas preferências e
                entender como você usa nosso site. Você pode desabilitar cookies nas configurações
                do seu navegador, mas isso pode afetar a funcionalidade do site.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">7. Segurança</h2>
              <p className="text-sm leading-relaxed">
                Implementamos medidas de segurança técnicas e organizacionais para proteger
                seus dados contra acesso não autorizado, alteração, divulgação ou destruição.
                Isso inclui criptografia, controles de acesso e monitoramento.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">8. Retenção de Dados</h2>
              <p className="text-sm leading-relaxed">
                Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas
                ou conforme exigido por lei (dados fiscais são mantidos por 5 anos, por exemplo).
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">9. Contato do Encarregado (DPO)</h2>
              <p className="text-sm leading-relaxed">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política,
                entre em contato através da nossa página de Contato.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-serif text-2xl text-[#1C302E] mb-4">10. Alterações</h2>
              <p className="text-sm leading-relaxed">
                Esta política pode ser atualizada periodicamente. Alterações significativas
                serão comunicadas no site ou por e-mail.
              </p>
            </section>
          </div>
        </div>
      </main>
      <FooterEditorial />
    </div>
  );
}
