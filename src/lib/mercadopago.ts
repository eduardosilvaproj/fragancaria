// =====================================================
// MERCADO PAGO INTEGRATION
// Documentação: https://www.mercadopago.com.br/developers
// =====================================================

export interface MercadoPagoConfig {
  accessToken: string;
  publicKey: string;
}

export interface CreatePaymentParams {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string; // CPF
      number: string;
    };
  };
  // Para cartão
  token?: string;
  installments?: number;
  issuer_id?: string;
  // Para Pix
  // payment_method_id = 'pix'
  // Para Boleto
  // payment_method_id = 'bolbradesco'
  metadata?: {
    order_id?: string;
    [key: string]: any;
  };
  external_reference?: string;
  notification_url?: string;
}

export interface PaymentResponse {
  id: number;
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  payment_type_id: string;
  date_created: string;
  date_approved: string | null;
  payer: {
    email: string;
  };
  // Pix
  point_of_interaction?: {
    transaction_data: {
      qr_code: string;
      qr_code_base64: string;
      ticket_url: string;
    };
  };
  // Boleto
  transaction_details?: {
    external_resource_url: string;
    barcode: {
      content: string;
    };
  };
}

export interface RefundResponse {
  id: number;
  payment_id: number;
  amount: number;
  status: 'approved' | 'pending' | 'rejected';
  date_created: string;
}

// Classe principal do Mercado Pago
export class MercadoPagoAPI {
  private baseUrl = 'https://api.mercadopago.com';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago API Error:', data);
      throw new Error(data.message || 'Erro na API do Mercado Pago');
    }

    return data;
  }

  // =====================================================
  // PAGAMENTOS
  // =====================================================

  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    return this.request<PaymentResponse>('/v1/payments', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPayment(paymentId: number): Promise<PaymentResponse> {
    return this.request<PaymentResponse>(`/v1/payments/${paymentId}`);
  }

  async cancelPayment(paymentId: number): Promise<PaymentResponse> {
    return this.request<PaymentResponse>(`/v1/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }

  // =====================================================
  // PIX
  // =====================================================

  async createPixPayment(params: {
    amount: number;
    description: string;
    payer_email: string;
    payer_cpf: string;
    payer_first_name: string;
    payer_last_name: string;
    order_id: string;
    notification_url?: string;
  }) {
    const payment = await this.createPayment({
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: 'pix',
      payer: {
        email: params.payer_email,
        first_name: params.payer_first_name,
        last_name: params.payer_last_name,
        identification: {
          type: 'CPF',
          number: params.payer_cpf.replace(/\D/g, ''),
        },
      },
      external_reference: params.order_id,
      notification_url: params.notification_url,
      metadata: {
        order_id: params.order_id,
      },
    });

    return {
      payment_id: payment.id,
      status: payment.status,
      qr_code: payment.point_of_interaction?.transaction_data.qr_code,
      qr_code_base64: payment.point_of_interaction?.transaction_data.qr_code_base64,
      ticket_url: payment.point_of_interaction?.transaction_data.ticket_url,
    };
  }

  // =====================================================
  // CARTÃO DE CRÉDITO
  // =====================================================

  async createCardPayment(params: {
    amount: number;
    description: string;
    token: string; // Card token gerado no frontend
    installments: number;
    payment_method_id: string; // visa, master, etc
    issuer_id: string;
    payer_email: string;
    payer_cpf: string;
    payer_first_name: string;
    payer_last_name: string;
    order_id: string;
    notification_url?: string;
  }) {
    const payment = await this.createPayment({
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: params.payment_method_id,
      token: params.token,
      installments: params.installments,
      issuer_id: params.issuer_id,
      payer: {
        email: params.payer_email,
        first_name: params.payer_first_name,
        last_name: params.payer_last_name,
        identification: {
          type: 'CPF',
          number: params.payer_cpf.replace(/\D/g, ''),
        },
      },
      external_reference: params.order_id,
      notification_url: params.notification_url,
      metadata: {
        order_id: params.order_id,
      },
    });

    return {
      payment_id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
    };
  }

  // =====================================================
  // BOLETO
  // =====================================================

  async createBoletoPayment(params: {
    amount: number;
    description: string;
    payer_email: string;
    payer_cpf: string;
    payer_first_name: string;
    payer_last_name: string;
    order_id: string;
    notification_url?: string;
  }) {
    const payment = await this.createPayment({
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: 'bolbradesco',
      payer: {
        email: params.payer_email,
        first_name: params.payer_first_name,
        last_name: params.payer_last_name,
        identification: {
          type: 'CPF',
          number: params.payer_cpf.replace(/\D/g, ''),
        },
      },
      external_reference: params.order_id,
      notification_url: params.notification_url,
      metadata: {
        order_id: params.order_id,
      },
    });

    return {
      payment_id: payment.id,
      status: payment.status,
      boleto_url: payment.transaction_details?.external_resource_url,
      barcode: payment.transaction_details?.barcode.content,
    };
  }

  // =====================================================
  // REEMBOLSO
  // =====================================================

  async refund(paymentId: number, amount?: number): Promise<RefundResponse> {
    const body = amount ? { amount } : {};

    return this.request<RefundResponse>(`/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async partialRefund(paymentId: number, amount: number): Promise<RefundResponse> {
    return this.refund(paymentId, amount);
  }

  // =====================================================
  // MÉTODOS DE PAGAMENTO
  // =====================================================

  async getPaymentMethods() {
    return this.request<any[]>('/v1/payment_methods');
  }

  async getInstallments(params: { amount: number; payment_method_id: string }) {
    const query = new URLSearchParams({
      amount: params.amount.toString(),
      payment_method_id: params.payment_method_id,
    });

    return this.request<any[]>(`/v1/payment_methods/installments?${query}`);
  }

  // =====================================================
  // WEBHOOK / IPN
  // =====================================================

  static parseWebhook(body: any): {
    type: string;
    action: string;
    data: { id: string };
  } {
    return {
      type: body.type,
      action: body.action,
      data: body.data,
    };
  }

  // Mapear status do Mercado Pago para status interno
  static mapPaymentStatus(mpStatus: string): 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' {
    const statusMap: Record<string, 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'> = {
      pending: 'pending',
      approved: 'paid',
      authorized: 'processing',
      in_process: 'processing',
      in_mediation: 'processing',
      rejected: 'failed',
      cancelled: 'failed',
      refunded: 'refunded',
      charged_back: 'refunded',
    };

    return statusMap[mpStatus] || 'pending';
  }
}

// =====================================================
// HELPER: Criar instância do cliente
// =====================================================

let mpInstance: MercadoPagoAPI | null = null;

export function getMercadoPago(): MercadoPagoAPI {
  if (!mpInstance) {
    const accessToken = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('VITE_MERCADOPAGO_ACCESS_TOKEN não configurado');
    }

    mpInstance = new MercadoPagoAPI(accessToken);
  }

  return mpInstance;
}

// =====================================================
// COMPONENTE PARA CHECKOUT (usar no frontend)
// =====================================================

export function loadMercadoPagoSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Erro ao carregar SDK do Mercado Pago'));
    document.head.appendChild(script);
  });
}

// Inicializar SDK no frontend
export async function initMercadoPagoCheckout() {
  await loadMercadoPagoSDK();

  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error('VITE_MERCADOPAGO_PUBLIC_KEY não configurado');
  }

  return new window.MercadoPago(publicKey, {
    locale: 'pt-BR',
  });
}

// Tipagem do SDK no window
declare global {
  interface Window {
    MercadoPago: any;
  }
}
