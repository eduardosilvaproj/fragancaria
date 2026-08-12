import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listZernioAccounts,
  upsertZernioAccount,
  deleteZernioAccount,
  type ZernioAccount,
} from "@/lib/zernio-accounts.functions";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Globe, BarChart3, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/integracoes")({
  component: AdminIntegracoes,
});

function AdminIntegracoes() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listZernioAccounts);
  const upsertFn = useServerFn(upsertZernioAccount);
  const deleteFn = useServerFn(deleteZernioAccount);

  // ... rest of the code ...

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="font-serif text-3xl text-[#0F3A3E] mb-8">Integrações</h1>

      {/* Seção Zernio */}
      <h2 className="text-xl font-serif text-[#0F3A3E] mb-6">Contas Conectadas (Zernio)</h2>
      <div className="bg-white border border-[#E9E1D2] p-6 mb-8">
        {/* ... formulário Zernio ... */}
      </div>

      <div className="bg-white border border-[#E9E1D2] mb-12">
        {/* ... tabela Zernio ... */}
      </div>

      {/* Seção Analytics */}
      <h2 className="text-xl font-serif text-[#0F3A3E] mb-6">Analytics</h2>
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-[#E9E1D2] rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-[#0F3A3E] flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Google Analytics</p>
              <p className={cn("text-sm", import.meta.env.VITE_GA_MEASUREMENT_ID ? "text-emerald-600" : "text-[#8A938E]")}>
                {import.meta.env.VITE_GA_MEASUREMENT_ID ? "✓ Configurado" : "Não configurado"}
              </p>
            </div>
          </div>
          <div className="border border-[#E9E1D2] rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-[#0F3A3E] flex items-center gap-2"><Target className="h-4 w-4" /> Meta Pixel</p>
              <p className={cn("text-sm", import.meta.env.VITE_META_PIXEL_ID ? "text-emerald-600" : "text-[#8A938E]")}>
                {import.meta.env.VITE_META_PIXEL_ID ? "✓ Configurado" : "Não configurado"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
