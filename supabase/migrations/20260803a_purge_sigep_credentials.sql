-- =====================================================
-- PURGE: credencial SIGEP (Correios direto)
-- =====================================================
-- APLICADA PELO EDU NO SQL EDITOR EM 2026-08-03, commitada depois (regra 5).
--
-- POR QUE
-- A integracao direta com os Correios (SIGEP / pre-postagem, API 36) foi
-- encerrada em 2026-08-02 (backlog T1): etiqueta sai so pelo Melhor Envio.
-- A linha shipping_settings.sigep_credentials ficou como CREDENCIAL ATIVA de
-- servico nao usado — usuario, codigoAcesso e cartaoPostagem reais, vistos em
-- texto na auditoria de RLS de 30/07. Com saveSigepCredentials removido, nada
-- recria esta linha.
--
-- ESCOPO
-- So sigep_credentials tem segredo. Verificado em 2026-08-03: os residuos do
-- desenho antigo de NF-e via webservice (nfe_settings.certificado_path,
-- certificado_senha, webservice_url) ja estavam NULL — nada a limpar la.
--
-- ATENCAO (fora do banco): apagar aqui NAO invalida o codigoAcesso do lado dos
-- Correios. Revogar no portal cws.correios.com.br (Meus Servicos -> API).
-- =====================================================

DELETE FROM public.shipping_settings WHERE key = 'sigep_credentials';

-- VERIFICACAO (deve retornar 0 linhas):
SELECT key FROM public.shipping_settings WHERE key = 'sigep_credentials';
