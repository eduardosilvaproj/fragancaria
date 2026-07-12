import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActiveProducts } from "@/lib/products.functions";
import type { Product } from "@/data/products";

// Produtos ativos da loja, do banco. Fetch unico compartilhado entre todos
// os consumidores via a chave de query.
export function useProducts() {
  const listFn = useServerFn(listActiveProducts);
  const query = useQuery<Product[]>({
    queryKey: ["storefront-products"],
    queryFn: async () => {
      const res = await listFn();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    refetchOnWindowFocus: false,
  });
  return { ...query, products: query.data ?? [] };
}