CREATE TABLE public.video_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'youtube_playlist' CHECK (kind IN ('youtube_playlist','youtube_channel','rss','json')),
  url text NOT NULL,
  video_anime_id uuid REFERENCES public.video_animes(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_scan_at timestamptz,
  last_scan_status text,
  last_scan_message text,
  last_found integer NOT NULL DEFAULT 0,
  last_new integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, url, video_anime_id)
);
GRANT SELECT ON public.video_providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_providers TO authenticated;
GRANT ALL ON public.video_providers TO service_role;
ALTER TABLE public.video_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read video providers" ON public.video_providers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage video providers" ON public.video_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.video_sources ADD COLUMN provider_id uuid REFERENCES public.video_providers(id) ON DELETE CASCADE;