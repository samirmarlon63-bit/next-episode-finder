create extension if not exists pg_trgm;

create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
  return true;
end $$;
revoke execute on function public.claim_first_admin() from anon, public;
grant execute on function public.claim_first_admin() to authenticated;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;

create table public.animes (
  id uuid primary key default gen_random_uuid(),
  anilist_id integer unique,
  mal_id integer unique,
  title_romaji text,
  title_english text,
  title_native text,
  synonyms text[] not null default '{}',
  search_keys text[] not null default '{}',
  cover_url text,
  banner_url text,
  color text,
  synopsis text,
  genres text[] not null default '{}',
  studio text,
  platforms text[] not null default '{}',
  season text,
  season_year integer,
  status text,
  format text,
  total_episodes integer,
  next_episode integer,
  airing_at timestamptz,
  start_date date,
  date_confirmed boolean not null default false,
  source_name text,
  source_url text,
  site_url text,
  popularity integer,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index animes_airing_idx on public.animes (airing_at);
create index animes_start_idx on public.animes (start_date);
create index animes_keys_idx on public.animes using gin (search_keys);
grant select on public.animes to anon, authenticated;
grant all on public.animes to service_role;
alter table public.animes enable row level security;
create policy "Public read animes" on public.animes for select to anon, authenticated using (true);

create table public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  feed_url text not null unique,
  kind text not null default 'rss',
  trust smallint not null default 2,
  enabled boolean not null default true,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
grant select on public.news_sources to anon, authenticated;
grant insert, update, delete on public.news_sources to authenticated;
grant all on public.news_sources to service_role;
alter table public.news_sources enable row level security;
create policy "Public read sources" on public.news_sources for select to anon, authenticated using (true);
create policy "Admins manage sources" on public.news_sources for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

insert into public.news_sources (name, url, feed_url, trust) values
  ('Anime News Network', 'https://www.animenewsnetwork.com', 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=w', 3),
  ('MyAnimeList News', 'https://myanimelist.net/news', 'https://myanimelist.net/rss/news.xml', 3),
  ('Crunchyroll News', 'https://www.crunchyroll.com/news', 'https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss', 3);

create table public.discoveries (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid references public.animes(id) on delete set null,
  source_id uuid references public.news_sources(id) on delete set null,
  source_name text not null,
  url text not null unique,
  title text,
  event_type text,
  info jsonb not null default '{}',
  status text not null default 'pending',
  published_at timestamptz,
  detected_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now()
);
create index discoveries_anime_idx on public.discoveries (anime_id);
create index discoveries_status_idx on public.discoveries (status, detected_at desc);
grant select on public.discoveries to anon, authenticated;
grant update, delete on public.discoveries to authenticated;
grant all on public.discoveries to service_role;
alter table public.discoveries enable row level security;
create policy "Public read matched discoveries" on public.discoveries for select to anon, authenticated using (anime_id is not null or public.has_role(auth.uid(), 'admin'));
create policy "Admins update discoveries" on public.discoveries for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete discoveries" on public.discoveries for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.anime_changes (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid not null references public.animes(id) on delete cascade,
  kind text not null,
  old_value text,
  new_value text,
  source_name text,
  created_at timestamptz not null default now()
);
create index anime_changes_idx on public.anime_changes (created_at desc);
grant select on public.anime_changes to anon, authenticated;
grant all on public.anime_changes to service_role;
alter table public.anime_changes enable row level security;
create policy "Public read changes" on public.anime_changes for select to anon, authenticated using (true);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null default 'cron',
  status text not null default 'running',
  stats jsonb not null default '{}',
  errors jsonb not null default '[]',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index sync_runs_idx on public.sync_runs (started_at desc);
grant select on public.sync_runs to anon, authenticated;
grant all on public.sync_runs to service_role;
alter table public.sync_runs enable row level security;
create policy "Public read sync runs" on public.sync_runs for select to anon, authenticated using (true);

create table public.sync_lock (
  id smallint primary key default 1,
  locked_until timestamptz not null default 'epoch'
);
insert into public.sync_lock (id) values (1);
grant all on public.sync_lock to service_role;
alter table public.sync_lock enable row level security;

create or replace function public.acquire_sync_lock(_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update public.sync_lock set locked_until = now() + make_interval(secs => _seconds)
  where id = 1 and locked_until < now()
  returning true into ok;
  return coalesce(ok, false);
end $$;
create or replace function public.release_sync_lock()
returns void language sql security definer set search_path = public as $$
  update public.sync_lock set locked_until = 'epoch' where id = 1;
$$;
revoke execute on function public.acquire_sync_lock(integer) from anon, authenticated, public;
revoke execute on function public.release_sync_lock() from anon, authenticated, public;
grant execute on function public.acquire_sync_lock(integer) to service_role;
grant execute on function public.release_sync_lock() to service_role;