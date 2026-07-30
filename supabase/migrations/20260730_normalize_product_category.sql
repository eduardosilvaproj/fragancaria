-- =====================================================
-- NORMALIZA public.products.category PARA A LISTA CANONICA
-- =====================================================
-- O filtro da storefront e igualdade de string:
--   src/routes/produtos.tsx  ->  p.category === selectedCategory
-- Sensivel a acento e a caixa. Os menus (NavbarEditorial, produtos.tsx,
-- FooterEditorial) passaram a mandar o valor Title Case com acento, que e o
-- que a maioria das linhas ja usa.
--
-- Sobrou uma cauda legada em lowercase/plural vinda da importacao por CSV.
-- Inventario medido em prod 2026-07-30 (1646 produtos, total / ativos):
--
--   JA CANONICO                      LEGADO A NORMALIZAR
--   Coloração        905 / 905       coloracao         156 / 7
--   Kits             146 / 146       shampoos           94 / 4
--   Finalizador       32 /  32       condicionadores    42 / 3
--   Máscara           30 /  30       mascaras           34 / 7
--   Shampoo           28 /  28       finalizadores      27 / 0
--   Variedades        23 /  23       outros             27 / 1
--   Condicionador     23 /  23       maquiagem          18 / 0
--   Tratamentos       11 /  11       oleos              14 / 0
--   Óleo               9 /   9       tratamentos         9 / 0
--   Leave-in           3 /   3       leave-in            9 / 1
--   Maquiagem          1 /   1       kits                5 / 0
--                   ------                            ------
--                     1211                               435
--
-- ATENCAO ao escopo: 5 dos valores legados (finalizadores, maquiagem, oleos,
-- tratamentos, kits) tem ZERO produtos ativos hoje, entao nao aparecem numa
-- contagem que filtra por is_active. Eles entram nesta migration de proposito:
-- sem isso, reativar um desses produtos o deixaria fora do menu de novo, com
-- a categoria orfa e silenciosa.
--
-- 'outros' -> 'Variedades': 'outros' nao e categoria de negocio, e o balde
-- da importacao. Variedades e o balde que existe no catalogo e no menu.
--
-- NAO mexe em products.category_slug. Essa coluna guarda a descricao longa do
-- CSV do Mercado Livre ("Corantes e descolorantes para cabelo e rosto",
-- "Xaropes para alimentos e bebidas") e nao e lida por lugar nenhum da
-- storefront: listActiveProducts() nao a projeta e o tipo Product nao a tem.
-- =====================================================

-- Idempotente: rodar de novo nao muda nada, porque o WHERE so pega os valores
-- legados e o UPDATE os remove do conjunto.
UPDATE public.products SET category = 'Máscara'       WHERE category = 'mascaras';
UPDATE public.products SET category = 'Coloração'     WHERE category = 'coloracao';
UPDATE public.products SET category = 'Shampoo'       WHERE category = 'shampoos';
UPDATE public.products SET category = 'Condicionador' WHERE category = 'condicionadores';
UPDATE public.products SET category = 'Leave-in'      WHERE category = 'leave-in';
UPDATE public.products SET category = 'Variedades'    WHERE category = 'outros';
UPDATE public.products SET category = 'Finalizador'   WHERE category = 'finalizadores';
UPDATE public.products SET category = 'Maquiagem'     WHERE category = 'maquiagem';
UPDATE public.products SET category = 'Óleo'          WHERE category = 'oleos';
UPDATE public.products SET category = 'Tratamentos'   WHERE category = 'tratamentos';
UPDATE public.products SET category = 'Kits'          WHERE category = 'kits';

-- =====================================================
-- CONFERENCIA (rodar depois; nao altera nada)
-- =====================================================
-- Esperado: 11 linhas, todas com nome Title Case, somando 1646.
--
--   SELECT category, COUNT(*) AS total,
--          COUNT(*) FILTER (WHERE is_active) AS ativos
--   FROM public.products
--   GROUP BY category
--   ORDER BY total DESC;
--
-- Esperado: 0 linhas (nenhuma categoria fora da lista canonica).
--
--   SELECT category, COUNT(*)
--   FROM public.products
--   WHERE category IS NULL
--      OR category NOT IN ('Coloração','Kits','Finalizador','Máscara','Shampoo',
--                          'Condicionador','Variedades','Tratamentos','Óleo',
--                          'Leave-in','Maquiagem')
--   GROUP BY category;
