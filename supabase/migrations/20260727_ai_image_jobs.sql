CREATE TABLE IF NOT EXISTS ai_image_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  prompt text NOT NULL,
  product_id text,
  product_name text,
  product_brand text,
  product_description text,
  caption text,
  modo text,
  result_url text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_image_jobs ENABLE ROW LEVEL SECURITY;

-- Admins podem ler/inserir/atualizar jobs
CREATE POLICY "admins_all_ai_image_jobs" ON ai_image_jobs
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins))
  WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM admins));
