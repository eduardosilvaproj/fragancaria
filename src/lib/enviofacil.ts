// =====================================================
// ENVIO FÁCIL INTEGRATION
// Documentação: https://api.enviofacil.com.br/docs
// =====================================================

export interface EnvioFacilConfig {
  apiKey: string;
  senderPostalCode: string;
  senderName: string;
  senderDocument: string; // CNPJ
}

export interface ShippingQuoteParams {
  from_postal_code: string;
  to_postal_code: string;
  weight_grams: number; // Peso em gramas
  height_cm: number;
  width_cm: number;
  length_cm: number;
  declared_value?: number;
}

export interface ShippingOption {
  carrier: string; // Correios, Jadlog, etc
  carrier_logo?: string;
  service: string; // PAC, SEDEX, etc
  service_code: string;
  delivery_time: number; // Dias úteis
  delivery_range?: {
    min: number;
    max: number;
  };
  price: number;
  discount?: number;
  final_price: number;
  error?: string;
}

export interface ShippingQuoteResponse {
  quotes: ShippingOption[];
  from_postal_code: string;
  to_postal_code: string;
  cached?: boolean;
}

export interface CreateShipmentParams {
  quote_id?: string;
  service_code: string;
  carrier: string;
  // Remetente
  from: {
    name: string;
    document: string; // CPF/CNPJ
    email: string;
    phone: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      postal_code: string;
    };
  };
  // Destinatário
  to: {
    name: string;
    document: string;
    email: string;
    phone: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      postal_code: string;
    };
  };
  // Pacote
  package: {
    weight_grams: number;
    height_cm: number;
    width_cm: number;
    length_cm: number;
  };
  // Valores
  declared_value: number;
  invoice_number?: string;
  // Referência
  order_id: string;
  notes?: string;
}

export interface ShipmentResponse {
  id: string;
  tracking_code: string;
  tracking_url: string;
  label_url: string;
  carrier: string;
  service: string;
  status: string;
  estimated_delivery: string;
  price: number;
}

export interface TrackingEvent {
  date: string;
  time: string;
  location: string;
  description: string;
  status: string;
}

export interface TrackingResponse {
  tracking_code: string;
  carrier: string;
  status: string;
  delivered: boolean;
  events: TrackingEvent[];
}

// Classe principal do Envio Fácil
export class EnvioFacilAPI {
  private baseUrl = 'https://api.enviofacil.com.br/v1';
  private apiKey: string;
  private senderInfo: {
    postal_code: string;
    name: string;
    document: string;
  };

  constructor(config: EnvioFacilConfig) {
    this.apiKey = config.apiKey;
    this.senderInfo = {
      postal_code: config.senderPostalCode,
      name: config.senderName,
      document: config.senderDocument,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Envio Fácil API Error:', data);
      throw new Error(data.message || 'Erro na API do Envio Fácil');
    }

    return data;
  }

  // =====================================================
  // COTAÇÃO DE FRETE
  // =====================================================

  async getQuotes(params: ShippingQuoteParams): Promise<ShippingQuoteResponse> {
    // Garantir dimensões mínimas
    const normalizedParams = {
      ...params,
      height_cm: Math.max(params.height_cm, 2),
      width_cm: Math.max(params.width_cm, 11),
      length_cm: Math.max(params.length_cm, 16),
      weight_grams: Math.max(params.weight_grams, 100),
    };

    const response = await this.request<{ data: ShippingOption[] }>('/shipping/quote', {
      method: 'POST',
      body: JSON.stringify(normalizedParams),
    });

    // Ordenar por preço
    const quotes = response.data
      .filter(q => !q.error)
      .sort((a, b) => a.final_price - b.final_price);

    return {
      quotes,
      from_postal_code: params.from_postal_code,
      to_postal_code: params.to_postal_code,
    };
  }

  // Cotação rápida com CEP do remetente já configurado
  async quickQuote(params: {
    to_postal_code: string;
    weight_grams: number;
    height_cm?: number;
    width_cm?: number;
    length_cm?: number;
    declared_value?: number;
  }): Promise<ShippingQuoteResponse> {
    return this.getQuotes({
      from_postal_code: this.senderInfo.postal_code,
      to_postal_code: params.to_postal_code,
      weight_grams: params.weight_grams,
      height_cm: params.height_cm || 10,
      width_cm: params.width_cm || 15,
      length_cm: params.length_cm || 20,
      declared_value: params.declared_value,
    });
  }

  // =====================================================
  // CRIAR ENVIO / GERAR ETIQUETA
  // =====================================================

  async createShipment(params: CreateShipmentParams): Promise<ShipmentResponse> {
    const response = await this.request<{ data: ShipmentResponse }>('/shipments', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return response.data;
  }

  // Criar envio simplificado com dados do pedido
  async createFromOrder(params: {
    order_id: string;
    service_code: string;
    carrier: string;
    recipient: {
      name: string;
      document: string;
      email: string;
      phone: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      postal_code: string;
    };
    package_info: {
      weight_grams: number;
      height_cm: number;
      width_cm: number;
      length_cm: number;
    };
    declared_value: number;
    invoice_number?: string;
    sender_email: string;
    sender_phone: string;
    sender_address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  }): Promise<ShipmentResponse> {
    return this.createShipment({
      service_code: params.service_code,
      carrier: params.carrier,
      from: {
        name: this.senderInfo.name,
        document: this.senderInfo.document,
        email: params.sender_email,
        phone: params.sender_phone,
        address: {
          ...params.sender_address,
          postal_code: this.senderInfo.postal_code,
        },
      },
      to: {
        name: params.recipient.name,
        document: params.recipient.document,
        email: params.recipient.email,
        phone: params.recipient.phone,
        address: {
          street: params.recipient.street,
          number: params.recipient.number,
          complement: params.recipient.complement,
          neighborhood: params.recipient.neighborhood,
          city: params.recipient.city,
          state: params.recipient.state,
          postal_code: params.recipient.postal_code,
        },
      },
      package: params.package_info,
      declared_value: params.declared_value,
      invoice_number: params.invoice_number,
      order_id: params.order_id,
    });
  }

  // =====================================================
  // RASTREAMENTO
  // =====================================================

  async track(trackingCode: string): Promise<TrackingResponse> {
    const response = await this.request<{ data: TrackingResponse }>(
      `/tracking/${trackingCode}`
    );

    return response.data;
  }

  async trackMultiple(trackingCodes: string[]): Promise<TrackingResponse[]> {
    const response = await this.request<{ data: TrackingResponse[] }>(
      '/tracking/batch',
      {
        method: 'POST',
        body: JSON.stringify({ codes: trackingCodes }),
      }
    );

    return response.data;
  }

  // =====================================================
  // ETIQUETAS
  // =====================================================

  async getLabel(shipmentId: string, format: 'pdf' | 'zpl' = 'pdf'): Promise<string> {
    const response = await this.request<{ data: { url: string } }>(
      `/shipments/${shipmentId}/label?format=${format}`
    );

    return response.data.url;
  }

  async getLabelsBatch(shipmentIds: string[], format: 'pdf' | 'zpl' = 'pdf'): Promise<string> {
    const response = await this.request<{ data: { url: string } }>(
      '/shipments/labels/batch',
      {
        method: 'POST',
        body: JSON.stringify({ ids: shipmentIds, format }),
      }
    );

    return response.data.url;
  }

  // =====================================================
  // CANCELAMENTO
  // =====================================================

  async cancelShipment(shipmentId: string): Promise<void> {
    await this.request(`/shipments/${shipmentId}/cancel`, {
      method: 'POST',
    });
  }

  // =====================================================
  // CONSULTA CEP
  // =====================================================

  async lookupPostalCode(postalCode: string): Promise<{
    postal_code: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
  }> {
    const cleanCode = postalCode.replace(/\D/g, '');

    const response = await this.request<{ data: any }>(
      `/postal-codes/${cleanCode}`
    );

    return response.data;
  }
}

// =====================================================
// HELPER: Criar instância do cliente
// =====================================================

let efInstance: EnvioFacilAPI | null = null;

export function getEnvioFacil(): EnvioFacilAPI {
  if (!efInstance) {
    const apiKey = import.meta.env.VITE_ENVIOFACIL_API_KEY;
    const senderPostalCode = import.meta.env.VITE_SENDER_POSTAL_CODE || '01310100';
    const senderName = import.meta.env.VITE_SENDER_NAME || 'Fragranciaria';
    const senderDocument = import.meta.env.VITE_SENDER_DOCUMENT || '00000000000000';

    if (!apiKey) {
      throw new Error('VITE_ENVIOFACIL_API_KEY não configurado');
    }

    efInstance = new EnvioFacilAPI({
      apiKey,
      senderPostalCode,
      senderName,
      senderDocument,
    });
  }

  return efInstance;
}

// =====================================================
// FALLBACK: Via Brasil API (gratuita) se não tiver Envio Fácil
// =====================================================

export async function getShippingQuoteFallback(params: {
  to_postal_code: string;
  weight_kg: number;
  declared_value: number;
}): Promise<ShippingOption[]> {
  // Usando ViaCEP + cálculo estimado
  const cleanCep = params.to_postal_code.replace(/\D/g, '');

  try {
    // Buscar região do CEP
    const cepResponse = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const cepData = await cepResponse.json();

    if (cepData.erro) {
      throw new Error('CEP não encontrado');
    }

    // Cálculo estimado baseado na região
    const region = cepData.uf;
    const isCapital = cepData.localidade === getCapital(region);

    // Tabela de preços estimados (simplificada)
    const basePrice = {
      SE: 15,  // Sudeste
      S: 18,   // Sul
      CO: 22,  // Centro-Oeste
      NE: 25,  // Nordeste
      N: 30,   // Norte
    };

    const regionGroup = getRegionGroup(region);
    const base = basePrice[regionGroup as keyof typeof basePrice] || 20;

    // Ajustar por peso
    const weightMultiplier = Math.ceil(params.weight_kg);
    const pacPrice = base * weightMultiplier;
    const sedexPrice = pacPrice * 1.8;

    // Prazo estimado
    const pacDays = { SE: 5, S: 7, CO: 8, NE: 10, N: 12 };
    const sedexDays = { SE: 2, S: 3, CO: 4, NE: 5, N: 6 };

    return [
      {
        carrier: 'Correios',
        service: 'PAC',
        service_code: '04510',
        delivery_time: pacDays[regionGroup as keyof typeof pacDays] || 10,
        delivery_range: {
          min: pacDays[regionGroup as keyof typeof pacDays] || 10,
          max: (pacDays[regionGroup as keyof typeof pacDays] || 10) + 3,
        },
        price: pacPrice,
        final_price: pacPrice,
      },
      {
        carrier: 'Correios',
        service: 'SEDEX',
        service_code: '04014',
        delivery_time: sedexDays[regionGroup as keyof typeof sedexDays] || 5,
        delivery_range: {
          min: sedexDays[regionGroup as keyof typeof sedexDays] || 5,
          max: (sedexDays[regionGroup as keyof typeof sedexDays] || 5) + 2,
        },
        price: sedexPrice,
        final_price: sedexPrice,
      },
    ];
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    return [];
  }
}

function getRegionGroup(uf: string): string {
  const groups: Record<string, string> = {
    SP: 'SE', RJ: 'SE', MG: 'SE', ES: 'SE',
    PR: 'S', SC: 'S', RS: 'S',
    DF: 'CO', GO: 'CO', MT: 'CO', MS: 'CO',
    BA: 'NE', PE: 'NE', CE: 'NE', MA: 'NE', PI: 'NE', RN: 'NE', PB: 'NE', SE: 'NE', AL: 'NE',
    AM: 'N', PA: 'N', AC: 'N', RO: 'N', RR: 'N', AP: 'N', TO: 'N',
  };
  return groups[uf] || 'NE';
}

function getCapital(uf: string): string {
  const capitals: Record<string, string> = {
    SP: 'São Paulo', RJ: 'Rio de Janeiro', MG: 'Belo Horizonte', ES: 'Vitória',
    PR: 'Curitiba', SC: 'Florianópolis', RS: 'Porto Alegre',
    DF: 'Brasília', GO: 'Goiânia', MT: 'Cuiabá', MS: 'Campo Grande',
    BA: 'Salvador', PE: 'Recife', CE: 'Fortaleza', MA: 'São Luís',
    PI: 'Teresina', RN: 'Natal', PB: 'João Pessoa', SE: 'Aracaju', AL: 'Maceió',
    AM: 'Manaus', PA: 'Belém', AC: 'Rio Branco', RO: 'Porto Velho',
    RR: 'Boa Vista', AP: 'Macapá', TO: 'Palmas',
  };
  return capitals[uf] || '';
}

// =====================================================
// UTILIDADES
// =====================================================

export function formatPostalCode(cep: string): string {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return cep;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

export function validatePostalCode(cep: string): boolean {
  const clean = cep.replace(/\D/g, '');
  return clean.length === 8;
}

export function calculatePackageDimensions(items: Array<{
  weight_grams: number;
  height_cm?: number;
  width_cm?: number;
  length_cm?: number;
  quantity: number;
}>): {
  weight_grams: number;
  height_cm: number;
  width_cm: number;
  length_cm: number;
} {
  // Soma dos pesos
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.weight_grams || 300) * item.quantity,
    0
  );

  // Para dimensões, usamos a maior de cada item + margem
  const maxHeight = Math.max(...items.map(i => i.height_cm || 10));
  const maxWidth = Math.max(...items.map(i => i.width_cm || 15));
  const maxLength = Math.max(...items.map(i => i.length_cm || 20));

  // Ajustar altura baseado na quantidade de itens
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const heightMultiplier = Math.ceil(totalItems / 3);

  return {
    weight_grams: Math.max(totalWeight, 100), // Mínimo 100g
    height_cm: Math.max(maxHeight * heightMultiplier, 2), // Mínimo 2cm
    width_cm: Math.max(maxWidth, 11), // Mínimo 11cm
    length_cm: Math.max(maxLength, 16), // Mínimo 16cm
  };
}
