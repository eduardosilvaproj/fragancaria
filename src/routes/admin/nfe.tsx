import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/admin/nfe")({
  component: NfePage,
});

function NfePage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-[#F5F3EE] rounded-lg text-[#0F3A3E]">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#0F3A3E] font-serif">Nota Fiscal</h1>
          <p className="text-sm text-[#51635F]">Gerenciamento e configurações fiscais da loja.</p>
        </div>
      </div>
      <div className="bg-white border border-[#E9E1D2] p-6 text-center">
        <p className="text-[#51635F]">Área em consolidação. As configurações fiscais podem ser encontradas nas Configurações da Loja.</p>
      </div>
    </div>
  );
}
