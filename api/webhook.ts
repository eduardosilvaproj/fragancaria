// Vercel Serverless Function - Webhook Mercado Pago
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPaymentStatus } from './payment';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, data } = req.body;

    console.log('Webhook recebido:', { type, data });

    // Notificação de pagamento
    if (type === 'payment') {
      const paymentId = data?.id;

      if (paymentId) {
        const result = await getPaymentStatus(paymentId.toString());

        if (result.success) {
          console.log('Status do pagamento:', result.data);

          // Aqui você pode:
          // 1. Atualizar status do pedido no banco de dados
          // 2. Enviar email de confirmação
          // 3. Atualizar estoque
          // 4. etc.

          switch (result.data?.status) {
            case 'approved':
              console.log('Pagamento aprovado!');
              // TODO: Marcar pedido como pago
              break;
            case 'pending':
              console.log('Pagamento pendente');
              break;
            case 'rejected':
              console.log('Pagamento rejeitado');
              break;
            case 'cancelled':
              console.log('Pagamento cancelado');
              break;
            case 'refunded':
              console.log('Pagamento reembolsado');
              break;
          }
        }
      }
    }

    // Sempre retorna 200 para o MP saber que recebemos
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Erro no webhook:', error);
    // Mesmo com erro, retorna 200 para evitar retry infinito
    return res.status(200).json({ received: true, error: error.message });
  }
}
