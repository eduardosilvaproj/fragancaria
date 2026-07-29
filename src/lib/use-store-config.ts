// Hook de leitura da config publica da loja (store_settings).
//
// POR QUE UM HOOK E NAO LOADER DE ROTA:
// o rodape aparece em 17 rotas e os dois pontos de WhatsApp (botao flutuante e
// chat da Fran) sao montados no __root. Passar a config por loader exigiria
// mexer em todas as rotas ou por um loader no root — que faria TODA pagina
// esperar por essa chamada. Com react-query a query e uma so: a chave e
// compartilhada, entao rodape + widgets + secao da loja fisica leem do mesmo
// cache e a rede e chamada uma vez por sessao.
//
// Consequencia aceita: os dados chegam DEPOIS do primeiro paint (nao ha
// desidratacao de query configurada no projeto). Por isso quem consome nunca
// renderiza placeholder — o campo simplesmente aparece quando carrega. Melhor
// um CNPJ que aparece 200ms depois que um CNPJ hardcoded errado.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicStoreConfig, type StoreConfig } from "@/lib/store-settings.functions";

/** Chave unica: garante que os 4 consumidores compartilhem um cache so. */
export const STORE_CONFIG_QUERY_KEY = ["public-store-config"] as const;

/**
 * Devolve a config da loja, ou null enquanto carrega / se a busca falhar
 * (migration nao aplicada, servidor fora). Quem chama NAO renderiza o dado
 * nesse caso, em vez de mostrar valor inventado.
 */
export function useStoreConfig(): StoreConfig | null {
  const buscar = useServerFn(getPublicStoreConfig);

  const { data } = useQuery({
    queryKey: STORE_CONFIG_QUERY_KEY,
    queryFn: () => buscar({}),
    // Dado que muda raramente (o admin edita de vez em quando) e que aparece em
    // toda pagina: sem staleTime, cada navegacao refaria a chamada.
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return data?.success ? data.data : null;
}
