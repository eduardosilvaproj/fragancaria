// API Serverless para Mercado Pago - Vercel Functions
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});

const payment = new Payment(client);

export interface PaymentRequest {
  method: 'credit_card' | 'pix' | 'boleto';
  amount: number;
  description: string;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    identification?: {
      type: string;
      number: string;
    };
    address?: {
      zipCode: string;
      streetName: string;
      streetNumber: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  };
  // Para cartão de crédito
  token?: string;
  installments?: number;
  issuerId?: string;
  paymentMethodId?: string;
  // Itens do pedido
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function createPayment(data: PaymentRequest) {
  const basePayment = {
    transaction_amount: data.amount,
    description: data.description,
    payer: {
      email: data.payer.email,
      first_name: data.payer.firstName,
      last_name: data.payer.lastName,
      identification: data.payer.identification,
      address: data.payer.address ? {
        zip_code: data.payer.address.zipCode,
        street_name: data.payer.address.streetName,
        street_number: data.payer.address.streetNumber,
        neighborhood: data.payer.address.neighborhood,
        city: data.payer.address.city,
        federal_unit: data.payer.address.state,
      } : undefined,
    },
    additional_info: {
      items: data.items.map(item => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    },
  };

  try {
    let result;

    switch (data.method) {
      case 'credit_card':
        result = await payment.create({
          body: {
            ...basePayment,
            token: data.token,
            installments: data.installments || 1,
            issuer_id: data.issuerId,
            payment_method_id: data.paymentMethodId,
          },
        });
        break;

      case 'pix':
        result = await payment.create({
          body: {
            ...basePayment,
            payment_method_id: 'pix',
          },
        });
        break;

      case 'boleto':
        result = await payment.create({
          body: {
            ...basePayment,
            payment_method_id: 'bolbradesco',
            date_of_expiration: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
          },
        });
        break;

      default:
        throw new Error('Método de pagamento inválido');
    }

    return {
      success: true,
      data: {
        id: result.id,
        status: result.status,
        statusDetail: result.status_detail,
        // PIX
        pixQrCode: result.point_of_interaction?.transaction_data?.qr_code,
        pixQrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        // Boleto
        boletoUrl: result.transaction_details?.external_resource_url,
        boletoBarcode: result.barcode?.content,
        // Geral
        externalReference: result.external_reference,
        dateCreated: result.date_created,
        dateOfExpiration: result.date_of_expiration,
      },
    };
  } catch (error: any) {
    console.error('Erro ao criar pagamento:', error);
    return {
      success: false,
      error: error.message || 'Erro ao processar pagamento',
      details: error.cause,
    };
  }
}

export async function getPaymentStatus(paymentId: string) {
  try {
    const result = await payment.get({ id: paymentId });
    return {
      success: true,
      data: {
        id: result.id,
        status: result.status,
        statusDetail: result.status_detail,
        dateApproved: result.date_approved,
        dateLastUpdated: result.date_last_updated,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao consultar pagamento',
    };
  }
}
