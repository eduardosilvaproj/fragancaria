import { toast } from "sonner";

export const SHOPIFY_API_VERSION = '2025-07';
export const SHOPIFY_STORE_PERMANENT_DOMAIN = 'kmjnqe-cs.myshopify.com';
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN = 'cd1f37fc26510bc0850da1d7e2df9136';

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    vendor: string;
    productType?: string;
    tags?: string[];
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    compareAtPriceRange?: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          compareAtPrice?: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
          selectedOptions: Array<{
            name: string;
            value: string;
          }>;
        };
      }>;
    };
    options: Array<{
      name: string;
      values: string[];
    }>;
  };
}

export async function storefrontApiRequest(query: string, variables: any = {}) {
  try {
    const response = await fetch(SHOPIFY_STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (response.status === 402) {
      toast.error("Shopify: Pagamento necessário", {
        description: "O acesso à API do Shopify requer um plano de faturamento ativo. Visite o admin do Shopify para atualizar.",
      });
      return;
    }

    if (!response.ok) {
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`Erro na API do Shopify: ${data.errors.map((e: any) => e.message).join(', ')}`);
    }

    return data;
  } catch (error) {
    console.error("Storefront API Request Error:", error);
    throw error;
  }
}
