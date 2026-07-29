-- =====================================================
-- STORE SETTINGS: loja fisica + dados de contato publicos
-- =====================================================
-- Singleton (sempre id = 1), no padrao de payment_settings.
--
-- ESCOPO: divulgacao no site. NADA aqui alimenta fiscal ou frete.
--   - endereco FISCAL (NF-e)      -> nfe_settings.endereco
--   - ORIGEM do frete (cotacao)   -> env MELHOR_ENVIO_FROM_CEP
--   - remetente da etiqueta       -> shipping_settings.sender_info
-- Os tres continuam sendo as fontes autoritativas deles. O endereco desta
-- tabela e o da LOJA FISICA, que e outro lugar (o CD nao atende publico).
--
-- Colunas tipadas em vez de JSONB de proposito: loja_aberta decide o que a
-- home mostra na semana da inauguracao, e como boolean NOT NULL ele nao pode
-- chegar como a string "false" (truthy em JS) nem vir ausente.
--
-- Texto e NOT NULL DEFAULT '' em vez de nullable: "nao configurado" tem UMA
-- representacao ('') em vez de duas (NULL e ''), entao a regra "whatsapp vazio
-- nao renderiza botao" e uma comparacao so.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Toggle da inauguracao: false = "Inauguracao em breve" (sem horarios),
  -- true = "Venha conhecer" + horarios. Evita mexer em codigo na semana.
  loja_aberta BOOLEAN NOT NULL DEFAULT FALSE,

  -- Endereco da LOJA FISICA (divulgacao). Vazio = secao nao mostra endereco.
  endereco_rua TEXT NOT NULL DEFAULT '',
  endereco_numero TEXT NOT NULL DEFAULT '',
  endereco_bairro TEXT NOT NULL DEFAULT '',
  endereco_cidade TEXT NOT NULL DEFAULT '',
  endereco_uf TEXT NOT NULL DEFAULT '',
  endereco_cep TEXT NOT NULL DEFAULT '',

  -- Horarios como texto livre: "9h00 as 18h00" e mais legivel que dois
  -- campos de hora, e casos como "fechado para almoco" nao caberiam neles.
  horario_semana TEXT NOT NULL DEFAULT '9h00 às 18h00',
  horario_sabado TEXT NOT NULL DEFAULT '9h00 às 17h00',

  -- Foto da fachada. Vazio = bloco visual cai no fundo verde com icone.
  foto_url TEXT NOT NULL DEFAULT '',

  -- Contato publico (rodape + pagina de Contato, hoje hardcoded)
  telefone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cnpj TEXT NOT NULL DEFAULT '',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- UF vazia (nao configurada) ou sigla de 2 letras. Barra "Sao Paulo" no
  -- campo errado, que sairia torto no endereco e na url do Google Maps.
  CONSTRAINT store_settings_uf_valida
    CHECK (endereco_uf = '' OR endereco_uf ~ '^[A-Z]{2}$')
);

-- #####################################################################
-- #                                                                   #
-- #   ATENCAO: update_updated_at() E FUNCAO COMPARTILHADA.            #
-- #                                                                   #
-- #   Usada pelos triggers de:                                        #
-- #     - public.store_settings     (esta migration)                  #
-- #     - public.nfe_settings       (20260718_nfe_settings.sql)       #
-- #     - public.shipping_settings  (20260712_shipping_settings.sql)  #
-- #                                                                   #
-- #   MUDAR O CORPO ABAIXO MUDA O COMPORTAMENTO DAS TRES TABELAS.     #
-- #   Nao ha versao "por tabela": e uma funcao so, no schema public.  #
-- #                                                                   #
-- #   O corpo abaixo e copia BYTE A BYTE do de 20260718_nfe_settings  #
-- #   (inclusive `now()` minusculo), conferido em 2026-07-28, entao   #
-- #   este CREATE OR REPLACE e no-op para as outras duas. O REPLACE   #
-- #   existe so para esta migration ser auto-contida (nao depender    #
-- #   da ordem de aplicacao).                                        #
-- #                                                                   #
-- #####################################################################
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS store_settings_updated_at ON public.store_settings;
CREATE TRIGGER store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- RLS: nenhum acesso direto pelo browser; tudo passa pelo servidor
-- =====================================================
-- RLS ligado e ZERO policies de proposito: nem anon nem authenticated tem
-- acesso. Service role bypassa RLS, e TODO acesso a esta tabela e por server
-- fn (getStoreSettings com requireAdmin, getPublicStoreConfig devolvendo so
-- os campos de divulgacao). Nenhum codigo de browser toca store_settings.
--
-- POR QUE NAO COPIEI O PADRAO de payment_settings/shipping_settings:
-- os dois usam `USING (auth.role() = 'authenticated')`, que libera para
-- QUALQUER usuario logado — inclusive cliente comum da loja. Com a anon key
-- (que esta no bundle do browser) mais uma sessao de cliente, daria para dar
-- UPDATE no telefone/e-mail/endereco que o site publica. Como nada nosso le
-- esta tabela pelo browser, nao ha o que ganhar abrindo esse acesso.
-- Nao mexo nas policies das outras tabelas aqui: e fora do escopo desta
-- migration e merece decisao/revisao propria.
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Se um dia esta migration rodar sobre uma tabela que ja teve policy, limpa:
DROP POLICY IF EXISTS "admin_all_store_settings" ON public.store_settings;

-- =====================================================
-- SEED: o unico registro
-- =====================================================
-- loja_aberta fica FALSE: a home mostra "Inauguracao em breve" ate o Edu
-- virar o toggle no admin.
--
-- whatsapp fica '' porque o numero da loja ainda nao existe. Com '' o botao
-- nao renderiza — melhor ausente que apontando para numero falso (hoje o
-- rodape publica wa.me/5511999999999, que nao e nosso).
--
-- endereco_cep fica vazio (Edu passa depois). Sem CEP o endereco ainda
-- renderiza e o "Como chegar" ainda funciona: a url do Maps e montada com
-- rua + numero + bairro + cidade/UF, que ja identificam o lugar.
--
-- ENDERECO DESTA TABELA = LOJA FISICA (Av. Queiroz Filho 1402, Vila
-- Harmonia). NAO confundir com o endereco FISCAL, que e outro lugar:
-- nfe_settings.endereco = ALAMEDA PAULISTA 206, JARDIM SILVANIA, CEP
-- 14811-060 — o mesmo CEP do MELHOR_ENVIO_FROM_CEP (origem do frete).
-- Sao enderecos diferentes de proposito: o CD nao atende publico.
--
-- cnpj e telefone vem de nfe_settings (id='main'), a fonte fiscal oficial,
-- lida em 2026-07-28. O CNPJ confere com o que o rodape ja publicava; o
-- telefone confere com o que o Edu passou (16997217833 lá, sem separador).
INSERT INTO public.store_settings (
  id,
  loja_aberta,
  endereco_rua,
  endereco_numero,
  endereco_bairro,
  endereco_cidade,
  endereco_uf,
  endereco_cep,
  telefone,
  whatsapp,
  email,
  cnpj
) VALUES (
  1,
  FALSE,
  'Av. Queiroz Filho',
  '1402',
  'Vila Harmonia',
  'Araraquara',
  'SP',
  '',
  '16 997217833',
  '',
  'contato@fragranciaria.com',
  '20.590.412/0001-36'
) ON CONFLICT (id) DO NOTHING;
