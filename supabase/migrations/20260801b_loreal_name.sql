-- =====================================================
-- GRAFIA DA MARCA: products.name -> L'Oréal
-- =====================================================
-- ESCOPO
-- Normaliza as variantes cruas de "L'Oréal" nos TITULOS de produto. Roda
-- DEPOIS de 20260801a_loreal_brand.sql, que corrige `brand`.
--
-- Esta e a parte delicada do C2: `name` e o que o cliente le na vitrine, o que
-- os tres filtros de busca varrem, e o que vira a descricao do item na NF-e
-- (nfe.functions.ts monta `descricao` a partir de item.title). Por isso a
-- amostra de 15 titulos foi conferida contra dado real antes de gerar este SQL.
--
-- ESTADO MEDIDO EM PROD (2026-08-01, projeto gzxlupgdmrtkprwhiutp)
--   titulos a corrigir:        191
--   titulos ja com L'Oréal:     11   <= NAO serao tocados
--   variantes literais encontradas em name:
--     "L'oréal"  -> 52 ocorrencias  (o minusculo, com acento e apostrofo)
--     "Loreal"   -> 88 ocorrencias  (cru, sem acento nem apostrofo)
--     "L'oreal"  -> 65 ocorrencias  (apostrofo, sem acento)
--     "Loréal"   ->  3 ocorrencias  (acento, sem apostrofo)
--   titulos com MAIS DE UMA ocorrencia: 12 (o padrao global /g pega todas)
--
-- ARMADILHA DO ANINHAMENTO (por que nao usar replace() sequencial)
--   replace(name, 'Loreal', 'L''Oréal')  aplicado a  "L'Oreal Paris"
-- produz "L'L'Oréal Paris": o replace curto casa o miolo "oreal" e deixa o
-- "L'" orfao na frente. Encadear replaces na ordem inversa tem o problema
-- espelhado. A solucao aqui e UMA alternacao regex com apostrofo OPCIONAL,
--   l['’]?or[eé]al
-- que consome a variante INTEIRA num unico match — com ou sem apostrofo, com
-- ou sem acento, em qualquer caixa. Nao sobra residuo para um segundo passe.
-- Validado fora do banco contra os 1646 produtos: 0 titulos viram "L'L'Oréal".
--
-- IDEMPOTENTE
-- O padrao tambem casa a forma canonica e a substitui por si mesma, e o WHERE
-- exclui titulos que ja estao 100% corretos. Validado (2026-08-01):
--   2 aplicacoes diferem de 1 aplicacao:  0 casos
--   titulos ja canonicos que mudariam:    0 casos
--   titulos que sobrariam com variante:   0 casos
--
-- O QUE A SUBSTITUICAO NAO TOCA
-- Conferido na amostra: volume (60ml, 250g, 1500ml), codigo de tom (7.4, 10.1,
-- 8.34), linha do produto (Inoa, Absolut Repair, Curl Expression) e posicao da
-- marca (inicio, meio, fim do titulo) seguem intactos. A regex so casa o token
-- da marca.
--
-- CHAVEAMENTO POR SKU
-- Dois blocos, porque o SQL Editor rejeita query muito grande. SKU e UNICO nos
-- 1646 produtos (0 duplicados, 0 vazios, 0 com apostrofo), entao o literal nao
-- quebra. O WHERE por SKU e redundante com o WHERE do padrao — cinto e
-- suspensorio, para o bloco nunca pegar linha inesperada.
-- =====================================================

-- =====================================================
-- 0. DIAGNOSTICO ANTES (nao altera nada)
-- =====================================================
DO $$
DECLARE
  n_alvo integer;
  n_ok   integer;
BEGIN
  SELECT count(*) INTO n_alvo
    FROM public.products
   WHERE name ~* 'l[''’]?or[eé]al'
     AND name !~ 'L''Oréal';
  SELECT count(*) INTO n_ok
    FROM public.products
   WHERE name ~ 'L''Oréal';
  RAISE NOTICE '--- ANTES ---';
  RAISE NOTICE 'titulos a corrigir: % (esperado 191)', n_alvo;
  RAISE NOTICE 'titulos ja com a grafia correta: % (esperado 11)', n_ok;
END $$;

-- =====================================================
-- 1. BLOCO 1/2 — 100 SKUs
-- =====================================================
UPDATE public.products
   SET name = regexp_replace(name, 'l[''’]?or[eé]al', 'L''Oréal', 'gi'),
       updated_at = now()
 WHERE name ~* 'l[''’]?or[eé]al'
   AND sku IN (
    '04564', '04591', '04597', '08524', '08526', '08529', '09081', '13526',
    '13970', '13971', '14104', '14105', '14315', '14317', '14318', '14319',
    '14461', '15281', '17519', '20154', '20160', '3',
    '3474637052263/7908785419723/7908785419723', '3474637109738',
    '3474637128203', '3474637131241', '3474637131890', '3474637217884',
    '3474637217907', '3474637242190', '3474637242206', '4',
    '7896014169221', '7899706189385/7899706189422',
    '7899706189385/7899706189446/7899706189422', '7899706189422',
    '7899706189484/7899706189521', '7899706189484/7899706189569',
    '7899706189484/7899706189569/7899706189521',
    '7899706189644/7899706189606',
    '7899706189668/7899706189606/7899706189644', '7899706189781',
    '7899706189781/7899706189804/7899706189828',
    '7899706189781/7899706189828', '7899706203944',
    '7899706204934/7899706205016', '7899706204934/7899706205337',
    '7899706205016', '7899706205337/7899706204934/7899706205252',
    '7908615012643', '7908615060798/7899706189682', '7908615060859',
    '7908615060873', '7908615060873/7899706189583', '7908615060910',
    '7908615060910/7899706189842', '7908785404996/7908785405009',
    '7908785408031', '7908785445968', '7908785446064', '7908785467625',
    '7908966511246', '9083', 'MLB3768323003', 'MLB3768323003_180963159920',
    'MLB3770618059_180984737078', 'MLB3770618059_183543933067',
    'MLB3770618059_183544012901', 'MLB3770618059_183544012903',
    'MLB3770618059_183544012905', 'MLB3770618059_183544012907',
    'MLB3770618059_183544012909', 'MLB3770618059_183544012919',
    'MLB3770618059_183544012921', 'MLB3770618059_183544012925',
    'MLB3770618059_183544012927', 'MLB3770618059_183544012929',
    'MLB3770618059_183544012937', 'MLB3770618059_183544012939',
    'MLB3770618059_183544012941', 'MLB3770618059_183544012943',
    'MLB3770618059_183544012955', 'MLB3770618059_183544012957',
    'MLB3770618059_183544012959', 'MLB3770618059_183544012967',
    'MLB3770618059_183544012969', 'MLB3770618059_183544012985',
    'MLB3770618059_183544012987', 'MLB3770618059_183544012995',
    'MLB3770618059_183544012997', 'MLB3770618059_183544013003',
    'MLB3770618059_183544013005', 'MLB3770618059_183544013013',
    'MLB3784427099_181122155992', 'MLB3784427099_181122155994',
    'MLB3784427099_181122156000', 'MLB3784427099_183828672565',
    'MLB3784427099_183828672567', 'MLB3784427099_183828672575',
    'MLB3784427099_183828672577'
   );
-- Esperado: UPDATE 100

-- =====================================================
-- 2. BLOCO 2/2 — 91 SKUs
-- =====================================================
UPDATE public.products
   SET name = regexp_replace(name, 'l[''’]?or[eé]al', 'L''Oréal', 'gi'),
       updated_at = now()
 WHERE name ~* 'l[''’]?or[eé]al'
   AND sku IN (
    'MLB3784427099_183828672583', 'MLB3784427099_183828672585',
    'MLB3784427099_183828672589', 'MLB3784427099_183828672593',
    'MLB3784427099_183828672597', 'MLB3784427099_183828672601',
    'MLB3784427099_183828672613', 'MLB3784427099_183828672617',
    'MLB3784427099_183828672619', 'MLB3784427099_183828672621',
    'MLB3784427099_183828672627', 'MLB3784427099_183828672631',
    'MLB3784427099_183828672633', 'MLB3784427099_183828672635',
    'MLB3784427099_183828672637', 'MLB3784427099_183828672639',
    'MLB3784427099_183828672641', 'MLB3784427099_183828672645',
    'MLB3784427099_183828672651', 'MLB3784427099_183828672655',
    'MLB3784427099_183828672661', 'MLB3789580677',
    'MLB3789580677_181162083768', 'MLB3796073415', 'MLB3796759653',
    'MLB3796819261', 'MLB3796827925', 'MLB3796857877', 'MLB3796902765',
    'MLB3843469159', 'MLB3843535943', 'MLB3845655127', 'MLB3856930823',
    'MLB3872973133', 'MLB3912131519', 'MLB3991600065', 'MLB3991686423',
    'MLB4052516883', 'MLB4122341779', 'MLB4917628904_181128593032',
    'MLB4917628904_181128593034', 'MLB4917628904_181128593036',
    'MLB4950990080', 'MLB4951019166', 'MLB4951422548', 'MLB5021081762',
    'MLB5053622128', 'MLB5074166172', 'MLB5074424142', 'MLB5074579306',
    'MLB5093344968', 'MLB5093383188', 'MLB5124622840', 'MLB5124770308',
    'MLB5140961354', 'MLB5141105568', 'MLB5141179438', 'MLB5153199018',
    'MLB5153199018_182093284548', 'MLB5153199018_187910988329',
    'MLB5167603518', 'MLB5183006402', 'MLB5184699982', 'MLB5213102248',
    'MLB5213102248_186354833051', 'MLB5213102248_186509815099',
    'MLB5275662674', 'MLB5305006112', 'MLB5305042846', 'MLB5305160634',
    'MLB5489901244', 'MLB5501317180', 'MLB5501344950', 'MLB5998215568',
    'MLB60368662', 'MLB61628470', 'MLB61645276', 'MLB61645338',
    'MLB65262522', 'MLB65262559', 'MLB65266700', 'MLB65272002',
    'MLB65302455', 'MLB65358921', 'MLB65420751', 'MLB65461622',
    'MLB65461922', 'MLB65824773', 'MLB66202063', 'MLB69306290', 'oleo90'
   );
-- Esperado: UPDATE 91

-- =====================================================
-- 3. VERIFICACAO (rode junto e confira a saida)
-- =====================================================
-- (a) Deve retornar ZERO linhas: nenhuma variante crua sobrando em name.
SELECT sku, name
FROM public.products
WHERE name ~* 'l[''’]?or[eé]al'
  AND name !~ 'L''Oréal';

-- (b) Deve retornar ZERO linhas: nenhum "L'L'Oréal" gerado pelo aninhamento.
SELECT sku, name
FROM public.products
WHERE name ~ 'L''L''|LL''Oréal';

-- (c) Total de titulos com a grafia correta.
--     Esperado: 202  (11 que ja estavam + 191 corrigidos)
--     Nenhum produto entra nem sai: o UPDATE muda a grafia, nao o conjunto.
SELECT count(*) AS titulos_com_loreal_correto
FROM public.products
WHERE name ~ 'L''Oréal';

-- (d) Conferencia cruzada com brand (depois de 20260801a).
--     Esperado: brand = L'Oréal em 259 produtos, inalterado por esta migration.
SELECT brand, count(*) AS total
FROM public.products
WHERE brand ~* 'l[''’]?or[eé]al'
GROUP BY brand
ORDER BY total DESC;
