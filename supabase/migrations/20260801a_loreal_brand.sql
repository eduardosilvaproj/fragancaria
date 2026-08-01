-- =====================================================
-- GRAFIA DA MARCA: products.brand -> L'Oréal
-- =====================================================
-- ESCOPO
-- Normaliza os 42 residuos de grafia em `brand` para a forma canonica
-- L'Oréal. NAO toca `name` — isso e a migration 20260801b, que roda DEPOIS.
--
-- ESTADO MEDIDO EM PROD (2026-08-01, projeto gzxlupgdmrtkprwhiutp)
--   brand = 'L'Oréal'  -> 217 produtos   <= JA CANONICO, nao sera tocado
--   brand = 'Loreal'   ->  29 produtos   <= corrigir
--   brand = 'L'Oreal'  ->  13 produtos   <= corrigir
--   total a corrigir: 42
-- O SQL de marcas de 29/07 gravou 217 corretos e deixou estes 42 para tras.
--
-- POR QUE SO AGORA, E NAO ANTES
-- Ver docs/backlog.md, itens C2 e C10. Ate 2026-08-01 a busca da storefront
-- comparava com .toLowerCase().includes() cru, sem normalizar acento nem
-- apostrofo. Nesse mundo, o dado ERRADO era justamente o que o usuario digita
-- ("loreal"), e corrigir a grafia DERRUBARIA a busca:
--   listagem "loreal":  71 -> 17 resultados
--   e a ZERO, corrigindo tambem os 191 titulos de `name`
-- Regressao silenciosa: ninguem reclama, a venda da marca so cai. O commit
-- 3620a25 (C10) normalizou os dois lados da comparacao nos tres pontos de
-- busca, entao esta correcao agora e NEUTRA para quem busca. A ordem importa.
--
-- ARMADILHA DO APOSTROFO (por que nao usar replace() sequencial)
--   replace(brand, 'Loreal', 'L''Oréal')  aplicado a  "L'Oreal Paris"
-- daria "L'L'Oréal Paris", porque "Loreal" NAO esta contido em "L'Oreal"
-- (tem apostrofo no meio) mas "oreal" esta, e um segundo replace encadeado
-- pega o residuo. Dois replaces em sequencia tem o mesmo problema ao contrario.
-- Solucao: UMA alternacao regex com o apostrofo OPCIONAL — l['’]?or[eé]al —
-- que casa a variante inteira num unico match, com ou sem apostrofo, com ou
-- sem acento, em qualquer caixa. Nao sobra residuo para um segundo passe.
--
-- IDEMPOTENTE
-- O padrao tambem casa a forma canonica e a substitui por si mesma, e o
-- WHERE exclui quem ja esta correto. Rodar 2x nao altera nada.
-- Validado fora do banco contra os 1646 produtos (2026-08-01):
--   2 aplicacoes diferem de 1 aplicacao: 0 casos
--   registros ja canonicos que mudariam: 0 casos
--
-- CHAVEAMENTO POR SKU
-- Blocos de ate 100 SKUs, porque o SQL Editor rejeita query muito grande.
-- Seguro porque medi antes: SKU e UNICO nos 1646 produtos (0 duplicados),
-- 0 produtos sem SKU, e 0 SKUs contendo apostrofo (nao ha risco de quebrar
-- o literal). O WHERE por SKU e redundante com o WHERE do padrao — e cinto
-- e suspensorio de proposito, para o bloco nunca pegar linha inesperada.
-- =====================================================

-- =====================================================
-- 0. DIAGNOSTICO ANTES (nao altera nada)
-- =====================================================
DO $$
DECLARE
  r RECORD;
  n_corrigir integer;
BEGIN
  RAISE NOTICE '--- ANTES: distribuicao de brand parecido com L''Oréal ---';
  FOR r IN
    SELECT brand, count(*) AS n
    FROM public.products
    WHERE brand ~* 'l[''’]?or[eé]al'
    GROUP BY brand
    ORDER BY n DESC
  LOOP
    RAISE NOTICE 'brand "%" -> % produtos%', r.brand, r.n,
      CASE WHEN r.brand = 'L''Oréal' THEN '   <= JA CANONICO' ELSE '' END;
  END LOOP;

  SELECT count(*) INTO n_corrigir
    FROM public.products
   WHERE brand ~* 'l[''’]?or[eé]al' AND brand <> 'L''Oréal';
  RAISE NOTICE '--- total a corrigir: % (esperado 42) ---', n_corrigir;
END $$;

-- =====================================================
-- 1. BLOCO 1/1 — 42 SKUs
-- =====================================================
UPDATE public.products
   SET brand = 'L''Oréal',
       updated_at = now()
 WHERE brand ~* 'l[''’]?or[eé]al'
   AND brand <> 'L''Oréal'
   AND sku IN (
    'MLB5124770308', 'MLB3796759653', 'MLB3843469159', 'MLB5053622128',
    'MLB5074424142', 'MLB5124622840', 'MLB3796073415', 'MLB3796827925',
    'MLB5275662674', 'MLB4951019166', 'MLB65302455', 'MLB65824773',
    'MLB3796902765', 'MLB5093383188', 'MLB5501344950', 'MLB5093344968',
    'MLB5153199018', 'MLB5074166172', 'MLB5501317180', 'MLB3796857877',
    'MLB3843535943', 'MLB3856930823', 'MLB3991686423', 'MLB5141179438',
    'MLB5141105568', 'MLB3796819261', 'MLB4052516883', 'MLB5998215568',
    'MLB4951422548', 'MLB65262559', 'MLB4950990080', 'MLB5140961354',
    'MLB3912131519', 'MLB5213102248', 'MLB61628470', 'MLB65358921',
    'MLB4122341779', 'MLB60368662', 'MLB5074579306', 'MLB61645338',
    'MLB66202063', 'MLB5167603518'
   );
-- Esperado: UPDATE 42

-- =====================================================
-- 2. VERIFICACAO (rode junto e confira a saida)
-- =====================================================
-- Esperado:
--   1 unica linha, brand = L'Oréal, total = 259
--
-- Por que 259 e nao 217+42=259: sim, e exatamente isso. Os 217 canonicos mais
-- os 42 corrigidos. Nenhum produto entra nem sai da marca — o UPDATE muda a
-- grafia, nao o conjunto.
SELECT
  brand,
  count(*) AS total
FROM public.products
WHERE brand ~* 'l[''’]?or[eé]al'
GROUP BY brand
ORDER BY total DESC;

-- Deve retornar ZERO linhas: nenhum residuo sobrando.
SELECT sku, brand
FROM public.products
WHERE brand ~* 'l[''’]?or[eé]al'
  AND brand <> 'L''Oréal';
