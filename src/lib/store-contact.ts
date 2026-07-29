// Helpers puros de contato da loja. Sem import de servidor: usados no browser.
//
// Existem para NAO repetir a regra do WhatsApp em cada lugar que mostra o botao
// (rodape, chat da Fran, botao flutuante, secao da loja fisica). A regra e uma
// so: numero vazio ou invalido => sem link, nunca um wa.me quebrado.

/** So os digitos. "16 997217833" -> "16997217833". */
export function whatsappDigits(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * Formata numero brasileiro para exibicao: "16997217833" -> "(16) 99721-7833".
 *
 * Cai de volta no valor cru quando a contagem de digitos nao casa com celular
 * (11) nem fixo (10). Assim um numero atipico aparece como o admin digitou, em
 * vez de sair mutilado por um formatador que nao previu o caso.
 */
export function formatPhoneBR(raw: string | null | undefined): string {
  const d = whatsappDigits(raw);
  const semPais = d.length > 11 && d.startsWith("55") ? d.slice(2) : d;

  if (semPais.length === 11) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`;
  }
  if (semPais.length === 10) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`;
  }
  return (raw ?? "").trim();
}

/**
 * Monta o link do WhatsApp, ou null quando nao ha numero utilizavel.
 *
 * Devolver null e proposital: quem chama usa isso para NAO renderizar o botao.
 * O site ja publicou numero falso (wa.me/5511999999999) e numero desativado
 * (5516997150373) por estarem hardcoded — ausente e melhor que errado.
 *
 * Exige >= 10 digitos (DDD + 8) para nao aceitar sobra de digitacao tipo "16".
 * Prefixa 55 apenas quando o numero ainda nao vem com o codigo do pais, senao
 * numero salvo como "5516..." viraria "555516...".
 */
export function whatsappLink(
  raw: string | null | undefined,
  message?: string,
): string | null {
  const digits = whatsappDigits(raw);
  if (digits.length < 10) return null;

  const comPais = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const base = `https://wa.me/${comPais}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
