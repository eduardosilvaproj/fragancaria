/**
 * Layout base para e-mails da Fragranciaria.
 * Desenvolvido para máxima compatibilidade com clientes de e-mail (incluindo Outlook).
 *
 * Regras:
 * - Uso exclusivo de <table> para layout.
 * - Estilos inline obrigatórios.
 * - Sem <style> tags (o Outlook ignora).
 * - Sem Flexbox ou Grid.
 * - Largura fixa de 600px para o contêiner central.
 */

export function buildEmailLayout({
  assunto,
  preheader,
  conteudo,
}: {
  assunto: string;
  preheader: string;
  conteudo: string;
}): string {
  const logoUrl = "https://fragranciaria.com/images/logo-email@2x.png";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${assunto}</title>
</head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background-color:#F3EEE3;color:#0F3A3E;">
  <!-- Preheader para clientes de e-mail -->
  <div style="display:none;max-height:0px;overflow:hidden;mso-hide:all;">${preheader}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F3EEE3;width:100%;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;background-color:#FFFFFF;border:1px solid #E9E1D2;border-radius:8px;">
          <!-- Header com Logo -->
          <tr>
            <td align="center" style="padding:40px 0 20px;background-color:#0F3A3E;border-radius:8px 8px 0 0;">
              <img src="${logoUrl}" alt="Fragranciaria" width="200" style="display:block;width:200px;">
            </td>
          </tr>

          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding:40px;">
              ${conteudo}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px;background-color:#F9F7F3;border-top:1px solid #E9E1D2;border-radius:0 0 8px 8px;font-size:12px;color:#51635F;">
              <p style="margin:0;">&copy; ${year} Fragranciaria. Todos os direitos reservados.</p>
              <p style="margin:10px 0 0;font-size:11px;">Este é um e-mail automático. Não responda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
