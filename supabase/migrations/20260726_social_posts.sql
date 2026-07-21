-- Migration: social_posts table for AI-generated social media content
-- Stores posts generated via Anthropic + OpenAI, published via Zernio

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Zernio identifiers (nullable: preenchidos apenas na publicação)
  profile_id text,
  social_account_id text,
  -- Content
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter')),
  content text NOT NULL,
  image_url text,
  -- Zernio tracking
  zernio_post_id text,
  -- Lifecycle
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  error_message text,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_social_posts ON public.social_posts
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at (function already exists from 001_affiliate_system.sql)
DROP TRIGGER IF EXISTS social_posts_updated_at ON public.social_posts;
CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
