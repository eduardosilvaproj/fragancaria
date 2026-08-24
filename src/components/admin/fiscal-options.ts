export const ORIGEM_MERCADORIA_OPTIONS = [
  { value: "0", label: "0 - Nacional, exceto as indicadas nos códigos 3 a 5" },
  { value: "1", label: "1 - Estrangeira - importação direta" },
  { value: "2", label: "2 - Estrangeira - adquirida no mercado interno" },
  { value: "3", label: "3 - Nacional com Conteúdo de Importação superior a 40%" },
  { value: "4", label: "4 - Nacional, produção conforme Processos Produtivos Básicos (PPB)" },
  { value: "5", label: "5 - Nacional com Conteúdo de Importação inferior ou igual a 40%" },
  { value: "6", label: "6 - Estrangeira - importação direta, sem similar nacional (lista CAMEX)" },
  { value: "7", label: "7 - Estrangeira - mercado interno, sem similar nacional (lista CAMEX)" },
  { value: "8", label: "8 - Nacional com Conteúdo de Importação superior a 70%" },
];

export const MODALIDADE_FRETE_OPTIONS = [
  { value: "0", label: "0 - CIF - frete por conta do remetente" },
  { value: "1", label: "1 - FOB - frete por conta do destinatário" },
  { value: "2", label: "2 - Frete por conta de terceiros" },
  { value: "3", label: "3 - Transporte próprio por conta do remetente" },
  { value: "4", label: "4 - Transporte próprio por conta do destinatário" },
  { value: "9", label: "9 - Sem ocorrência de transporte" },
];

export const CST_ICMS_OPTIONS = [
  { value: "00", label: "00 - Tributada integralmente" },
  { value: "10", label: "10 - Tributada com cobrança de ICMS por substituição tributária" },
  { value: "20", label: "20 - Com redução de base de cálculo" },
  { value: "30", label: "30 - Isenta ou não tributada com cobrança de ICMS por substituição tributária" },
  { value: "40", label: "40 - Isenta" },
  { value: "41", label: "41 - Não tributada" },
  { value: "50", label: "50 - Suspensão" },
  { value: "51", label: "51 - Diferimento" },
  { value: "60", label: "60 - ICMS cobrado anteriormente por substituição tributária" },
  { value: "70", label: "70 - Com redução de base de cálculo e cobrança de ICMS por substituição tributária" },
  { value: "90", label: "90 - Outros" },
];

export const CSOSN_OPTIONS = [
  { value: "101", label: "101 - Tributada pelo Simples Nacional com permissão de crédito" },
  { value: "102", label: "102 - Tributada pelo Simples Nacional sem permissão de crédito" },
  { value: "103", label: "103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta" },
  { value: "201", label: "201 - Tributada pelo SN com permissão de crédito e com ICMS por substituição tributária" },
  { value: "202", label: "202 - Tributada pelo SN sem permissão de crédito e com ICMS por substituição tributária" },
  { value: "203", label: "203 - Isenção do ICMS no SN para faixa de receita e com ICMS por substituição tributária" },
  { value: "300", label: "300 - Imune" },
  { value: "400", label: "400 - Não tributada pelo Simples Nacional" },
  { value: "500", label: "500 - ICMS cobrado anteriormente por substituição tributária ou antecipação" },
  { value: "900", label: "900 - Outros" },
];

export const CST_PIS_COFINS_OPTIONS = [
  { value: "01", label: "01 - Operação tributável com alíquota básica" },
  { value: "02", label: "02 - Operação tributável com alíquota diferenciada" },
  { value: "03", label: "03 - Operação tributável com alíquota por unidade de medida" },
  { value: "04", label: "04 - Operação tributável monofásica - revenda a alíquota zero" },
  { value: "05", label: "05 - Operação tributável por substituição tributária" },
  { value: "06", label: "06 - Operação tributável a alíquota zero" },
  { value: "07", label: "07 - Operação isenta da contribuição" },
  { value: "08", label: "08 - Operação sem incidência da contribuição" },
  { value: "09", label: "09 - Operação com suspensão da contribuição" },
  { value: "49", label: "49 - Outras operações de saída" },
  { value: "99", label: "99 - Outras operações" },
];

// CFOPs de saída estritos para os 3 campos do redesenho (vendas)
export const CFOP_OPTIONS = [
  { value: "5102", label: "5.102 — Venda de mercadoria adquirida ou recebida de terceiros (dentro do estado)" },
  { value: "6102", label: "6.102 — Venda de mercadoria adquirida ou recebida de terceiros (fora do estado - PJ contribuinte)" },
  { value: "6108", label: "6.108 — Venda de mercadoria adquirida ou recebida de terceiros, destinada a não contribuinte (fora do estado)" },
];
