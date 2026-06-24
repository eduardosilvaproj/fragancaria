// Configuração do Mercado Pago
export const MP_PUBLIC_KEY = 'APP_USR-ecf4de3f-5862-496a-a2dd-3212cc22c30d';

// URL da API (ajustar para produção)
export const API_URL = import.meta.env.PROD
  ? 'https://fragranciaria.vercel.app/api' // Ajustar para seu domínio
  : '/api';

// Métodos de pagamento disponíveis
export const PAYMENT_METHODS = [
  {
    id: 'credit_card',
    name: 'Cartão de Crédito',
    icon: '💳',
    description: 'Até 12x sem juros',
  },
  {
    id: 'pix',
    name: 'PIX',
    icon: '⚡',
    description: 'Aprovação instantânea',
    discount: 5, // 5% de desconto
  },
  {
    id: 'boleto',
    name: 'Boleto Bancário',
    icon: '📄',
    description: 'Vencimento em 3 dias úteis',
  },
] as const;

// Parcelas disponíveis
export const INSTALLMENTS_OPTIONS = [
  { installments: 1, label: '1x sem juros' },
  { installments: 2, label: '2x sem juros' },
  { installments: 3, label: '3x sem juros' },
  { installments: 4, label: '4x sem juros' },
  { installments: 5, label: '5x sem juros' },
  { installments: 6, label: '6x sem juros' },
  { installments: 7, label: '7x sem juros' },
  { installments: 8, label: '8x sem juros' },
  { installments: 9, label: '9x sem juros' },
  { installments: 10, label: '10x sem juros' },
];

// Status de pagamento
export const PAYMENT_STATUS = {
  pending: { label: 'Pendente', color: 'yellow' },
  approved: { label: 'Aprovado', color: 'green' },
  authorized: { label: 'Autorizado', color: 'blue' },
  in_process: { label: 'Em análise', color: 'yellow' },
  in_mediation: { label: 'Em mediação', color: 'orange' },
  rejected: { label: 'Rejeitado', color: 'red' },
  cancelled: { label: 'Cancelado', color: 'gray' },
  refunded: { label: 'Reembolsado', color: 'purple' },
  charged_back: { label: 'Estornado', color: 'red' },
} as const;
