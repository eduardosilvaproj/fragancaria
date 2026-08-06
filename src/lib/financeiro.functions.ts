import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- Tipos ----------

export type FinanceiroPeriodo = {
  dateFrom: string;
  dateTo: string;
};

export type ProdutoRanking = {
  id: string;
  title: string;
  quantity: number;
  revenue: number;
  cost: number | null;
  margin: number | null; // null se sem custo
  marginPercent: number | null;
};

export type FinanceiroResult = {
  receita: number;
  custo: number;
  margemBruta: number;
  margemPercentual: number | null;
  totalPedidos: number;
  ticketMedio: number;
  // Cobertura de custo
  totalItensVendidos: number;
  itensComCusto: number;
  itensSemCusto: number;
  // Data de início dos dados (pedido mais antigo com cost no snapshot)
  dataInicio: string;
  // Ranking
  ranking: ProdutoRanking[];
  // Avisos
  avisos: string[];
};

// ---------- Agregação pura (testável) ----------

type OrderRow = {
  id: string;
  created_at: string | null;
  items: unknown;
};

export function agregarFinanceiro(
  orders: OrderRow[],
  opts?: { dataInicio?: string; dataInicioMotivo?: string },
): Omit<FinanceiroResult, "avisos"> {
  const dataInicio =
    opts?.dataInicio ?? orders?.[0]?.created_at?.slice(0, 10) ?? "";

  let receita = 0;
  let custo = 0;
  let totalItensVendidos = 0;
  let itensComCusto = 0;
  let itensSemCusto = 0;
  const produtoMap = new Map<
    string,
    { title: string; quantity: number; revenue: number; cost: number | null }
  >();

  for (const order of orders ?? []) {
    const items = Array.isArray(order.items) ? (order.items as any[]) : [];
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const itemRevenue = price * qty;
      receita += itemRevenue;

      const hasCost = item.cost != null && Number(item.cost) > 0;
      if (hasCost) {
        custo += Number(item.cost) * qty;
        itensComCusto += qty;
      } else {
        itensSemCusto += qty;
      }
      totalItensVendidos += qty;

      // Ranking por produto
      const pid = item.id || item.productId || `unknown-${Math.random()}`;
      const existing = produtoMap.get(pid);
      if (existing) {
        existing.quantity += qty;
        existing.revenue += itemRevenue;
        if (hasCost) {
          existing.cost = (existing.cost ?? 0) + Number(item.cost) * qty;
        }
      } else {
        produtoMap.set(pid, {
          title: item.title || item.name || "Produto",
          quantity: qty,
          revenue: itemRevenue,
          cost: hasCost ? Number(item.cost) * qty : null,
        });
      }
    }
  }

  const totalPedidos = orders?.length ?? 0;
  const ticketMedio = totalPedidos > 0 ? receita / totalPedidos : 0;
  const margemBruta = receita - custo;
  const margemPercentual =
    receita > 0 && itensComCusto > 0
      ? (margemBruta / receita) * 100
      : null;

  // Ranking ordenado por receita
  const ranking: ProdutoRanking[] = [...produtoMap.entries()]
    .map(([id, p]) => ({
      id,
      title: p.title,
      quantity: p.quantity,
      revenue: p.revenue,
      cost: p.cost,
      margin: p.cost != null ? p.revenue - p.cost : null,
      marginPercent:
        p.cost != null && p.revenue > 0
          ? ((p.revenue - p.cost) / p.revenue) * 100
          : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 50);

  return {
    receita,
    custo,
    margemBruta,
    margemPercentual,
    totalPedidos,
    ticketMedio,
    totalItensVendidos,
    itensComCusto,
    itensSemCusto,
    dataInicio,
    ranking,
  };
}

// ---------- Server function ----------

export const getFinanceiro = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    const schema = z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    });
    return schema.parse(d ?? {});
  })
  .handler(async ({ data }): Promise<FinanceiroResult> => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Data de início derivada do banco: pedido mais antigo que tenha cost no
    // snapshot de items. Nada chumbado no código — valor fixo já divergiu
    // três vezes neste projeto.
    const { data: inicioRows, error: inicioErr } = await supabaseAdmin
      .from("orders")
      .select("created_at, items")
      .in("payment_status", ["approved"])
      .in("status", ["paid", "processing", "shipped", "delivered"])
      .not("items", "is", null)
      .order("created_at", { ascending: true })
      .limit(500);

    if (inicioErr) {
      throw new Error("Erro ao buscar início dos dados: " + inicioErr.message);
    }

    let dataInicio: string | undefined;
    for (const row of inicioRows ?? []) {
      if (!row.created_at) continue;
      const items = Array.isArray(row.items) ? (row.items as any[]) : [];
      const hasCost = items.some(
        (it) => it?.cost != null && Number(it.cost) > 0,
      );
      if (hasCost) {
        dataInicio = row.created_at.slice(0, 10);
        break;
      }
    }

    // Período padrão: da data de início até hoje. Se o usuário não enviar
    // datas, o servidor não encaminha undefined/"" para o filtro do banco.
    const dateFrom = data.dateFrom || dataInicio;
    const dateTo = data.dateTo || new Date().toISOString().split("T")[0];

    // Busca pedidos pagos/aprovados no período
    let query = supabaseAdmin
      .from("orders")
      .select("id, items, created_at")
      .in("payment_status", ["approved"])
      .in("status", ["paid", "processing", "shipped", "delivered"]);

    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59.999Z");

    const { data: orders, error } = await query;

    if (error) {
      throw new Error("Erro ao buscar pedidos: " + error.message);
    }

    const agregado = agregarFinanceiro(orders ?? [], {
      dataInicio,
      dataInicioMotivo: "pedido mais antigo com cost no snapshot",
    });

    // Avisos
    const avisos: string[] = [];
    if (agregado.itensSemCusto > 0) {
      avisos.push(
        `Calculado sobre ${agregado.itensComCusto} de ${agregado.totalItensVendidos} itens vendidos — ${agregado.itensSemCusto} sem custo cadastrado.`,
      );
    }
    avisos.push(
      `Dados disponíveis a partir de ${agregado.dataInicio || "—"} (pedido mais antigo com custo no snapshot).`,
    );
    avisos.push(
      "O frete está fora desta conta. A receita considerada é apenas de produtos, não de frete cobrado do cliente nem de frete pago pela loja.",
    );

    return { ...agregado, avisos };
  });
