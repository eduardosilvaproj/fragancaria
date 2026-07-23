-- Adiciona coluna quality à tabela ai_image_jobs
-- Valores: 'low' (rascunho, ~$0.006) ou 'high' (final, ~$0.211)
ALTER TABLE ai_image_jobs
  ADD COLUMN quality text NOT NULL DEFAULT 'low'
    CHECK (quality IN ('low', 'high'));
