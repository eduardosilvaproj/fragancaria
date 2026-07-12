import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { HairColorStudio } from "@/components/simulador/HairColorStudio";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de Cor | Fragranciaria" },
      {
        name: "description",
        content:
          "Experimente cores de cabelo na sua própria foto. Escolha o tom e veja o resultado antes de comprar.",
      },
    ],
  }),
  component: SimuladorPage,
});

function SimuladorPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-[#F3EEE3] font-sans">
      <NavbarEditorial />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-12 max-w-6xl">
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#B07B1E] font-bold mb-3">
              Simulador
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-light text-[#1C302E]">
              Experimente a sua <span className="italic text-[#B07B1E]">nova cor</span>
            </h1>
            <p className="mt-4 text-[#51635F] max-w-xl">
              Envie uma foto e veja como diferentes tons ficam no seu cabelo. Tudo acontece
              no seu navegador — sua foto não é enviada para lugar nenhum.
            </p>
          </div>

          {mounted ? (
            <HairColorStudio />
          ) : (
            <div className="min-h-[360px] md:min-h-[520px] bg-[#F8F4EA] border border-[#E0D8C7]" />
          )}
        </div>
      </main>
      <FooterEditorial />
    </div>
  );
}
