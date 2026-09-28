CREATE TABLE public.video_animes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id uuid REFERENCES public.animes(id) ON DELETE SET NULL,
  title text NOT NULL,
  cover_url text,
  synopsis text,
  status text NOT NULL DEFAULT 'airing',
  youtube_playlist_id text,
  source_name text,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_animes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_animes TO authenticated;
GRANT ALL ON public.video_animes TO service_role;
ALTER TABLE public.video_animes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read video animes" ON public.video_animes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage video animes" ON public.video_animes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.video_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_anime_id uuid NOT NULL REFERENCES public.video_animes(id) ON DELETE CASCADE,
  number numeric NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_anime_id, number)
);
GRANT SELECT ON public.video_episodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_episodes TO authenticated;
GRANT ALL ON public.video_episodes TO service_role;
ALTER TABLE public.video_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read video episodes" ON public.video_episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage video episodes" ON public.video_episodes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.video_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.video_episodes(id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'youtube',
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (episode_id, url)
);
GRANT SELECT ON public.video_sources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_sources TO authenticated;
GRANT ALL ON public.video_sources TO service_role;
ALTER TABLE public.video_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read video sources" ON public.video_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage video sources" ON public.video_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX video_episodes_anime_idx ON public.video_episodes(video_anime_id, number);