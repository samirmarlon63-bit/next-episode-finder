// Video sync: scans registered legal providers (official YouTube playlists/channels, RSS and JSON feeds)
// and adds only new episodes. Never scrapes HTML pages.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchFeed } from "./news.server";
import { normalizeTitle } from "./normalize";

const EP_PATTERNS = [
  /(?:episod(?:e|io)|ep\.?|cap(?:[íi]tulo)?\.?)\s*#?\s*(\d+(?:\.\d)?)/i,
  /第\s*(\d+)\s*[話话集]/,
  /#\s*(\d+(?:\.\d)?)\b/,
];
export function parseEpisode(title: string, custom?: string): number | null {
  const patterns = [...(custom ? [safeRegex(custom)] : []), ...EP_PATTERNS].filter(Boolean) as RegExp[];
  for (const p of patterns) {
    const m = p.exec(title);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (n > 0 && n < 5000) return n;
    }
  }
  return null;
}
function safeRegex(s: string) {
  try {
    return new RegExp(s, "i");
  } catch {
    return null;
  }
}

type Item = { title: string; link: string; episode?: number | null };
type Provider = {
  id: string;
  name: string;
  kind: string;
  url: string;
  video_anime_id: string | null;
  config: Record<string, unknown>;
};

function youtubeFeedUrl(kind: string, raw: string) {
  if (kind === "youtube_playlist") {
    const id = /[?&]list=([\w-]+)/.exec(raw)?.[1] ?? raw.trim();
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(id)}`;
  }
  const id = /channel\/(UC[\w-]+)/.exec(raw)?.[1] ?? /channel_id=(UC[\w-]+)/.exec(raw)?.[1] ?? raw.trim();
  if (!/^UC[\w-]{10,}$/.test(id)) throw new Error("El canal debe indicarse con su ID (empieza por UC)");
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(id)}`;
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

async function scanItems(p: Provider): Promise<Item[]> {
  if (p.kind === "youtube_playlist" || p.kind === "youtube_channel") return fetchFeed(youtubeFeedUrl(p.kind, p.url));
  if (p.kind === "rss") return fetchFeed(p.url);
  if (p.kind === "json") {
    const ctrl = AbortSignal.timeout(10_000);
    const res = await fetch(p.url, { signal: ctrl, headers: { "User-Agent": "AnimeEstrenosBot/1.0", Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const arr = getPath(json, String(p.config.itemsPath ?? ""));
    if (!Array.isArray(arr)) throw new Error("itemsPath no apunta a una lista");
    const tf = String(p.config.titleField ?? "title");
    const uf = String(p.config.urlField ?? "url");
    const ef = p.config.episodeField ? String(p.config.episodeField) : null;
    return arr
      .map((r) => ({ title: String(getPath(r, tf) ?? ""), link: String(getPath(r, uf) ?? ""), episode: ef ? Number(getPath(r, ef)) || null : undefined }))
      .filter((i) => i.title && /^https?:\/\//.test(i.link));
  }
  throw new Error(`Tipo de fuente no soportado: ${p.kind}`);
}

export function sourceKind(url: string) {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/\.(mp4|m3u8|webm)(\?|$)/i.test(url)) return "video";
  return "external";
}

type AnimeRef = { id: string; key: string };

async function ingest(p: Provider, items: Item[], animes: AnimeRef[]) {
  let found = 0;
  let added = 0;
  const touched = new Set<string>();
  const cache = new Map<string, Map<number, string>>();
  for (const it of items) {
    let animeId = p.video_anime_id;
    if (!animeId) {
      const k = normalizeTitle(it.title);
      const match = animes.filter((a) => a.key.length >= 4 && k.includes(a.key)).sort((a, b) => b.key.length - a.key.length)[0];
      animeId = match?.id ?? null;
    }
    if (!animeId) continue;
    const n = it.episode ?? parseEpisode(it.title, p.config.episodeRegex as string | undefined);
    if (n == null) continue;
    found++;
    let have = cache.get(animeId);
    if (!have) {
      const { data } = await supabaseAdmin.from("video_episodes").select("id, number").eq("video_anime_id", animeId);
      have = new Map((data ?? []).map((e) => [Number(e.number), e.id]));
      cache.set(animeId, have);
    }
    let epId = have.get(n);
    if (!epId) {
      const { data: ep, error } = await supabaseAdmin
        .from("video_episodes")
        .upsert({ video_anime_id: animeId, number: n, title: it.title }, { onConflict: "video_anime_id,number" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      epId = ep.id;
      have.set(n, epId);
      added++;
      touched.add(animeId);
    }
    await supabaseAdmin
      .from("video_sources")
      .upsert({ episode_id: epId, label: p.name, kind: sourceKind(it.link), url: it.link, provider_id: p.id.startsWith("legacy:") ? null : p.id }, { onConflict: "episode_id,url", ignoreDuplicates: true });
  }
  const now = new Date().toISOString();
  for (const id of touched) await supabaseAdmin.from("video_animes").update({ updated_at: now }).eq("id", id);
  return { found, added, touched: touched.size };
}

async function loadAnimeRefs(): Promise<AnimeRef[]> {
  const { data } = await supabaseAdmin.from("video_animes").select("id, title").limit(2000);
  return (data ?? []).map((a) => ({ id: a.id, key: normalizeTitle(a.title) }));
}

async function scanOne(p: Provider, animes: AnimeRef[]) {
  const now = new Date().toISOString();
  try {
    const items = await scanItems(p);
    const r = await ingest(p, items, animes);
    const msg = `${items.length} publicaciones · ${r.found} capítulos reconocidos · ${r.added} nuevos`;
    if (!p.id.startsWith("legacy:"))
      await supabaseAdmin.from("video_providers").update({ last_scan_at: now, last_scan_status: "ok", last_scan_message: msg, last_found: r.found, last_new: r.added }).eq("id", p.id);
    else await supabaseAdmin.from("video_animes").update({ last_synced_at: now, last_sync_error: null }).eq("id", p.video_anime_id!);
    return { ok: true as const, ...r };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!p.id.startsWith("legacy:"))
      await supabaseAdmin.from("video_providers").update({ last_scan_at: now, last_scan_status: "error", last_scan_message: msg }).eq("id", p.id);
    else await supabaseAdmin.from("video_animes").update({ last_synced_at: now, last_sync_error: msg }).eq("id", p.video_anime_id!);
    return { ok: false as const, error: `${p.name}: ${msg}`, found: 0, added: 0, touched: 0 };
  }
}

export async function scanProviderById(id: string) {
  const { data: p, error } = await supabaseAdmin.from("video_providers").select("*").eq("id", id).single();
  if (error || !p) throw new Error("Fuente no encontrada");
  await supabaseAdmin.from("video_providers").update({ last_scan_status: "running" }).eq("id", id);
  return scanOne(p as Provider, await loadAnimeRefs());
}

export async function runVideoSync(trigger: "videos-cron" | "videos-manual") {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: busy } = await supabaseAdmin
    .from("sync_runs")
    .select("id")
    .in("trigger", ["videos-cron", "videos-manual"])
    .eq("status", "running")
    .gte("started_at", since)
    .limit(1);
  if (busy?.length) return { skipped: true as const, reason: "Sincronización de videos en curso" };

  const { data: run } = await supabaseAdmin.from("sync_runs").insert({ trigger }).select("id").single();
  const stats = { fuentes_revisadas: 0, animes_updated: 0, episodes_new: 0 };
  const errors: string[] = [];

  const animes = await loadAnimeRefs();
  const { data: providers } = await supabaseAdmin.from("video_providers").select("*").eq("enabled", true).limit(300);
  const { data: legacy } = await supabaseAdmin.from("video_animes").select("id, title, youtube_playlist_id, source_name").not("youtube_playlist_id", "is", null).limit(300);
  const targets: Provider[] = [
    ...((providers ?? []) as Provider[]),
    ...(legacy ?? []).map((a) => ({
      id: `legacy:${a.id}`,
      name: a.source_name || "YouTube oficial",
      kind: "youtube_playlist",
      url: a.youtube_playlist_id!,
      video_anime_id: a.id,
      config: {},
    })),
  ];

  for (const p of targets) {
    stats.fuentes_revisadas++;
    const r = await scanOne(p, animes);
    if (!r.ok) errors.push(r.error);
    stats.episodes_new += r.added;
    stats.animes_updated += r.touched;
  }

  const status = errors.length === 0 ? "success" : errors.length < stats.fuentes_revisadas ? "partial" : "error";
  await supabaseAdmin.from("sync_runs").update({ status, stats, errors, finished_at: new Date().toISOString() }).eq("id", run!.id);
  return { skipped: false as const, status, stats, errors };
}
