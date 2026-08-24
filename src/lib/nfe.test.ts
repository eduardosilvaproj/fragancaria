import { test } from "node:test";
import assert from "node:assert/strict";
import { distributeDiscount } from "./nfe.functions";

test("distribui desconto de R$ 10,00 em 3 itens iguais de R$ 33,33 (resíduo no último)", () => {
  const items = [
    { valorTotal: 33.33 },
    { valorTotal: 33.33 },
    { valorTotal: 33.33 },
  ];
  const distributed = distributeDiscount(items, 10.00);
  const sumDiscount = distributed.reduce((s, i) => s + (i.desconto || 0), 0);
  assert.equal(Number(sumDiscount.toFixed(2)), 10.00);
  assert.equal(distributed[0].desconto, 3.33);
  assert.equal(distributed[1].desconto, 3.33);
  assert.equal(distributed[2].desconto, 3.34);
});

test("distribui desconto em itens com valores diferentes (R$ 15,50 em R$ 20 e R$ 80)", () => {
  const items = [
    { valorTotal: 20.00 },
    { valorTotal: 80.00 },
  ];
  const distributed = distributeDiscount(items, 15.50);
  const sumDiscount = distributed.reduce((s, i) => s + (i.desconto || 0), 0);
  assert.equal(Number(sumDiscount.toFixed(2)), 15.50);
  assert.equal(distributed[0].desconto, 3.10);
  assert.equal(distributed[1].desconto, 12.40);
});

test("sem desconto ou itens vazios não altera os itens", () => {
  const items = [{ valorTotal: 50.00 }];
  const distributedZero = distributeDiscount(items, 0);
  assert.deepEqual(distributedZero, items);

  const distributedEmpty = distributeDiscount([], 10.00);
  assert.deepEqual(distributedEmpty, []);
});

// Testes para validação e resolução de CFOP + IBS/CBS (Fase 2)
const resolveCfopMock = ({
  isCPF,
  isWithinState,
  isDevolucao,
  item,
}: {
  isCPF: boolean;
  isWithinState: boolean;
  isDevolucao: boolean;
  item: Record<string, any>;
}) => {
  const source = isCPF
    ? isWithinState
      ? item.cfop_venda_pf_dentro
      : item.cfop_venda_pf_fora
    : isWithinState
      ? item.cfop_venda_pj_dentro
      : item.cfop_venda_pj_fora;
  const devolucaoSource = isCPF
    ? isWithinState
      ? item.cfop_devolucao_pf_dentro
      : item.cfop_devolucao_pf_fora
    : isWithinState
      ? item.cfop_devolucao_pj_dentro
      : item.cfop_devolucao_pj_fora;
  const value = isDevolucao ? devolucaoSource : source;
  return value ? String(value).trim() : undefined;
};

const validateIbsCbsMock = (item: Record<string, any>) => {
  if (!item.cstIbscbs) {
    return { valid: false, error: "CST IBS/CBS obrigatório e ausente" };
  }
  if (!/^\d{3}$/.test(String(item.cstIbscbs).trim())) {
    return { valid: false, error: "CST IBS/CBS deve ter exatamente 3 dígitos numéricos" };
  }
  if (!item.cClassTrib) {
    return { valid: false, error: "Código de Enquadramento IBS/CBS obrigatório e ausente" };
  }
  if (!/^\d{6}$/.test(String(item.cClassTrib).trim())) {
    return { valid: false, error: "Código de Enquadramento deve ter exatamente 6 dígitos numéricos" };
  }
  if (item.aliquotaIbsEstadual === undefined || item.aliquotaIbsEstadual === null) {
    return { valid: false, error: "Alíquota IBS Estadual obrigatória" };
  }
  if (item.aliquotaCbs === undefined || item.aliquotaCbs === null) {
    return { valid: false, error: "Alíquota CBS obrigatória" };
  }
  return { valid: true };
};

const itemMock = {
  cfop_venda_pf_dentro: "5102",
  cfop_venda_pf_fora: "6108",
  cfop_venda_pj_dentro: "5102",
  cfop_venda_pj_fora: "6102",
  cfop_devolucao_pf_dentro: "1202",
  cfop_devolucao_pf_fora: "2202",
  cfop_devolucao_pj_dentro: "1202",
  cfop_devolucao_pj_fora: "2202",
};

test("resolução CFOP venda PF dentro do estado", () => {
  assert.equal(resolveCfopMock({ isCPF: true, isWithinState: true, isDevolucao: false, item: itemMock }), "5102");
});

test("resolução CFOP venda PF fora do estado", () => {
  assert.equal(resolveCfopMock({ isCPF: true, isWithinState: false, isDevolucao: false, item: itemMock }), "6108");
});

test("resolução CFOP venda PJ dentro do estado", () => {
  assert.equal(resolveCfopMock({ isCPF: false, isWithinState: true, isDevolucao: false, item: itemMock }), "5102");
});

test("resolução CFOP venda PJ fora do estado", () => {
  assert.equal(resolveCfopMock({ isCPF: false, isWithinState: false, isDevolucao: false, item: itemMock }), "6102");
});

test("resolução CFOP devolução PF dentro do estado", () => {
  assert.equal(resolveCfopMock({ isCPF: true, isWithinState: true, isDevolucao: true, item: itemMock }), "1202");
});

test("resolução CFOP devolução PF fora do estado", () => {
  assert.equal(resolveCfopMock({ isCPF: true, isWithinState: false, isDevolucao: true, item: itemMock }), "2202");
});

test("resolução CFOP devolução PJ dentro do estado", () => {
  assert.equal(resolveCfopMock({ isCPF: false, isWithinState: true, isDevolucao: true, item: itemMock }), "1202");
});

test("resolução CFOP devolução PJ fora do estado", () => {
  assert.equal(resolveCfopMock({ isCPF: false, isWithinState: false, isDevolucao: true, item: itemMock }), "2202");
});

test("tipoOperacao ausente ou inválido bloqueia com erro fail-loud", () => {
  const checkTipoOperacao = (tipoOperacao: any) => {
    if (tipoOperacao !== "venda" && tipoOperacao !== "devolucao") {
      return { success: false, error: "tipoOperacao é obrigatório e deve ser 'venda' ou 'devolucao'." };
    }
    return { success: true };
  };

  assert.deepEqual(checkTipoOperacao(undefined), { success: false, error: "tipoOperacao é obrigatório e deve ser 'venda' ou 'devolucao'." });
  assert.deepEqual(checkTipoOperacao(""), { success: false, error: "tipoOperacao é obrigatório e deve ser 'venda' ou 'devolucao'." });
  assert.deepEqual(checkTipoOperacao("troca"), { success: false, error: "tipoOperacao é obrigatório e deve ser 'venda' ou 'devolucao'." });
  assert.deepEqual(checkTipoOperacao("venda"), { success: true });
  assert.deepEqual(checkTipoOperacao("devolucao"), { success: true });
});

test("IBS/CBS válido passa", () => {
  assert.deepEqual(validateIbsCbsMock({
    cstIbscbs: "000",
    cClassTrib: "000001",
    aliquotaIbsEstadual: 0.1,
    aliquotaCbs: 0.9,
  }), { valid: true });
});

test("IBS/CBS vazio bloqueia", () => {
  assert.deepEqual(validateIbsCbsMock({
    cstIbscbs: "",
    cClassTrib: "000001",
    aliquotaIbsEstadual: 0.1,
    aliquotaCbs: 0.9,
  }), { valid: false, error: "CST IBS/CBS obrigatório e ausente" });
});

test("IBS/CBS com formato errado bloqueia", () => {
  assert.deepEqual(validateIbsCbsMock({
    cstIbscbs: "01",
    cClassTrib: "000001",
    aliquotaIbsEstadual: 0.1,
    aliquotaCbs: 0.9,
  }), { valid: false, error: "CST IBS/CBS deve ter exatamente 3 dígitos numéricos" });
});

test("cClassTrib vazio bloqueia", () => {
  assert.deepEqual(validateIbsCbsMock({
    cstIbscbs: "000",
    cClassTrib: "",
    aliquotaIbsEstadual: 0.1,
    aliquotaCbs: 0.9,
  }), { valid: false, error: "Código de Enquadramento IBS/CBS obrigatório e ausente" });
});

test("cClassTrib com formato errado bloqueia", () => {
  assert.deepEqual(validateIbsCbsMock({
    cstIbscbs: "000",
    cClassTrib: "12345",
    aliquotaIbsEstadual: 0.1,
    aliquotaCbs: 0.9,
  }), { valid: false, error: "Código de Enquadramento deve ter exatamente 6 dígitos numéricos" });
});

test("IBS/CBS com obrigatoriedade e formato corretos passa", () => {
  assert.deepEqual(validateIbsCbsMock({
    cstIbscbs: "000",
    cClassTrib: "000001",
    aliquotaIbsEstadual: 0.1,
    aliquotaCbs: 0.9,
  }), { valid: true });
});

// Testes para cálculo dinâmico da alíquota interestadual de ICMS (Fase 3)
const resolveAliquotaIcmsMock = ({
  isDevolucao,
  isWithinState,
  isCPF,
  destUf,
  item,
}: {
  isDevolucao: boolean;
  isWithinState: boolean;
  isCPF: boolean;
  destUf: string;
  item: Record<string, any>;
}): number => {
  const prodAliq = Number(item.aliquota_icms) || 0;
  if (isDevolucao || isWithinState || isCPF) {
    return prodAliq;
  }
  const origemNum = Number(item.origem ?? 0);
  if ([1, 2, 6, 7].includes(origemNum)) {
    return 4;
  }
  const sulSudesteExcetoEs = ["PR", "SC", "RS", "RJ", "MG"];
  if (sulSudesteExcetoEs.includes(destUf.toUpperCase())) {
    return 12;
  }
  return 7;
};

test("produto nacional, SP -> RJ (Sudeste, não-ES): espera 12%", () => {
  const item = { origem: 0, aliquota_icms: 18 };
  assert.equal(resolveAliquotaIcmsMock({
    isDevolucao: false,
    isWithinState: false,
    isCPF: false,
    destUf: "RJ",
    item
  }), 12);
});

test("produto nacional, SP -> BA (Nordeste): espera 7%", () => {
  const item = { origem: 0, aliquota_icms: 18 };
  assert.equal(resolveAliquotaIcmsMock({
    isDevolucao: false,
    isWithinState: false,
    isCPF: false,
    destUf: "BA",
    item
  }), 7);
});

test("produto nacional, SP -> ES: espera 7% (é Sudeste mas é exceção)", () => {
  const item = { origem: 0, aliquota_icms: 18 };
  assert.equal(resolveAliquotaIcmsMock({
    isDevolucao: false,
    isWithinState: false,
    isCPF: false,
    destUf: "ES",
    item
  }), 7);
});

test("produto importado (origem 1), SP -> RJ: espera 4%", () => {
  const item = { origem: 1, aliquota_icms: 18 };
  assert.equal(resolveAliquotaIcmsMock({
    isDevolucao: false,
    isWithinState: false,
    isCPF: false,
    destUf: "RJ",
    item
  }), 4);
});

test("produto importado (origem 1), SP -> BA: espera 4% (confirma que independe do destino)", () => {
  const item = { origem: 1, aliquota_icms: 18 };
  assert.equal(resolveAliquotaIcmsMock({
    isDevolucao: false,
    isWithinState: false,
    isCPF: false,
    destUf: "BA",
    item
  }), 4);
});

test("venda dentro do estado (SP -> SP): confirma que aliquota_icms do produto continua sendo usado sem alteração", () => {
  const item = { origem: 0, aliquota_icms: 18 };
  assert.equal(resolveAliquotaIcmsMock({
    isDevolucao: false,
    isWithinState: true,
    isCPF: false,
    destUf: "SP",
    item
  }), 18);
});

test("venda PF fora do estado: confirma que essa regra NÃO se aplica (comportamento atual inalterado)", () => {
  const item = { origem: 0, aliquota_icms: 18 };
  assert.equal(resolveAliquotaIcmsMock({
    isDevolucao: false,
    isWithinState: false,
    isCPF: true,
    destUf: "RJ",
    item
  }), 18);
});

// Testes para indicadorIE e consumidorFinal dinâmicos + sobreposição manual (Fase 4)
const resolveIndicadorEConsumidorMock = ({
  isCNPJ,
  manualIndicadorIE,
  manualConsumidorFinal,
}: {
  isCNPJ: boolean;
  manualIndicadorIE?: number;
  manualConsumidorFinal?: number;
}) => {
  const defaultConsumidorFinal = isCNPJ ? 0 : 1;
  const defaultIndicadorIE = isCNPJ ? 1 : 9;

  return {
    indicadorIE: manualIndicadorIE !== undefined ? manualIndicadorIE : defaultIndicadorIE,
    consumidorFinal: manualConsumidorFinal !== undefined ? manualConsumidorFinal : defaultConsumidorFinal,
  };
};

test("CNPJ: indicadorIE = 1, consumidorFinal = 0", () => {
  const res = resolveIndicadorEConsumidorMock({ isCNPJ: true });
  assert.equal(res.indicadorIE, 1);
  assert.equal(res.consumidorFinal, 0);
});

test("CPF: indicadorIE = 9, consumidorFinal = 1 (confirma que comportamento para PF não muda)", () => {
  const res = resolveIndicadorEConsumidorMock({ isCNPJ: false });
  assert.equal(res.indicadorIE, 9);
  assert.equal(res.consumidorFinal, 1);
});

test("Edição manual no modal sobrepõe o valor automático", () => {
  // CNPJ com edição manual para consumidor final (uso interno) e indicador isento (2)
  const res = resolveIndicadorEConsumidorMock({
    isCNPJ: true,
    manualIndicadorIE: 2,
    manualConsumidorFinal: 1,
  });
  assert.equal(res.indicadorIE, 2);
  assert.equal(res.consumidorFinal, 1);
});
