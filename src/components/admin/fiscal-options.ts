export const ORIGEM_MERCADORIA_OPTIONS = [
  { value: "0", label: "0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8" },
  { value: "1", label: "1 - Estrangeira - Importação direta, exceto a indicada no código 6" },
  { value: "2", label: "2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7" },
  { value: "3", label: "3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40%" },
  { value: "4", label: "4 - Nacional, cuja produção tenha sido feita in com processos básicos" },
  { value: "5", label: "5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%" },
  { value: "6", label: "6 - Estrangeira - Importação direta, sem similar nacional" },
  { value: "7", label: "7 - Estrangeira - Adquirida no mercado interno, sem similar nacional" },
  { value: "8", label: "8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%" },
];

export const MODALIDADE_FRETE_OPTIONS = [
  { value: "0", label: "0 - Remuneração do Frete por conta do Remetente (CIF)" },
  { value: "1", label: "1 - Remuneração do Frete por conta do Destinatário (FOB)" },
  { value: "2", label: "2 - Remuneração do Frete por conta de Terceiros" },
  { value: "3", label: "3 - Transporte Próprio por conta do Remetente" },
  { value: "4", label: "4 - Transporte Próprio por conta do Destinatário" },
  { value: "9", label: "9 - Sem Ocorrência de Transporte" },
];

export const CST_ICMS_OPTIONS = [
  { value: "00", label: "00 - Tributada integralmente" },
  { value: "10", label: "10 - Tributada e com cobrança do ICMS por substituição tributária" },
  { value: "20", label: "20 - Com redução de base de cálculo" },
  { value: "30", label: "30 - Isenta ou não tributada e com cobrança do ICMS por substituição tributária" },
  { value: "40", label: "40 - Isenta" },
  { value: "41", label: "41 - Não tributada" },
  { value: "50", label: "50 - Suspensão" },
  { value: "51", label: "51 - Diferimento" },
  { value: "60", label: "60 - ICMS cobrado anteriormente por substituição tributária" },
  { value: "70", label: "70 - Com redução de base de cálculo e cobrança do ICMS por substituição tributária" },
  { value: "90", label: "90 - Outras" },
];

export const CSOSN_OPTIONS = [
  { value: "101", label: "101 - Tributada pelo Simples Nacional com permissão de crédito" },
  { value: "102", label: "102 - Tributada pelo Simples Nacional sem permissão de crédito" },
  { value: "103", label: "103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta" },
  { value: "201", label: "201 - Tributada pelo Simples Nacional com permissão de crédito e cobrança do ICMS por ST" },
  { value: "202", label: "202 - Tributada pelo Simples Nacional sem permissão de crédito e cobrança do ICMS por ST" },
  { value: "203", label: "203 - Isenção do ICMS no Simples Nacional para faixa de receita bruta e cobrança por ST" },
  { value: "300", label: "300 - Imune" },
  { value: "400", label: "400 - Não tributada pelo Simples Nacional" },
  { value: "500", label: "500 - ICMS cobrado anteriormente por substituição tributária (substituído) ou por antecipação" },
  { value: "900", label: "900 - Outros" },
];

export const CST_PIS_COFINS_OPTIONS = [
  { value: "01", label: "01 - Operação Tributável com Alíquota Básica" },
  { value: "02", label: "02 - Operação Tributável com Alíquota Diferenciada" },
  { value: "03", label: "03 - Operação Tributável com Alíquota por Unidade de Medida de Produto" },
  { value: "04", label: "04 - Operação Tributável Monofásica - Revenda a Alíquota Zero" },
  { value: "05", label: "05 - Operação Tributável por Substituição Tributária" },
  { value: "06", label: "06 - Operação Tributável a Alíquota Zero" },
  { value: "07", label: "07 - Operação Isenta da Contribuição" },
  { value: "08", label: "08 - Operação Sem Incidência da Contribuição" },
  { value: "09", label: "09 - Operação com Suspensão da Contribuição" },
  { value: "49", label: "49 - Outras Operações de Saída" },
  { value: "99", label: "99 - Outras Operações" },
];
