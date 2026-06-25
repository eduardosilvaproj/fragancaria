// Vercel Serverless Function - Create Payment
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPayment, PaymentRequest } from './payment';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data: PaymentRequest = req.body;

    // Validações básicas
    if (!data.method) {
      return res.status(400).json({ error: 'Método de pagamento é obrigatório' });
    }

    if (!data.amount || data.amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    if (!data.payer?.email) {
      return res.status(400).json({ error: 'Email do pagador é obrigatório' });
    }

    if (data.method === 'credit_card' && !data.token) {
      return res.status(400).json({ error: 'Token do cartão é obrigatório' });
    }

    const result = await createPayment(data);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Erro na API:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
