-- 20260826_add_nfe_difal_overrides.sql
ALTER TABLE public.nfe_settings
ADD COLUMN IF NOT EXISTS difal_overrides jsonb DEFAULT '[]'::jsonb;
