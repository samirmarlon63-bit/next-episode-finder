// Sync orchestrator: APIs -> news feeds -> AI extraction -> match -> upsert -> change log.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildSearchKeys, normalizeTitle } from "./normalize";
import { fetchAiringSchedule, fetchNotYetReleased, searchAnime, type AniMedia } from "./anilist.server";
import { AiBlockedError, extractWithAi, fetchFeed } from "./news.server";

type Stats = Record<string, number>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mediaToRow(m: AniMedia, airing?: { airingAt: number; episode: number }) {
  const next = airing ?? m.nextAiringEpisode ?? undefined;
  const sd = m.startDate;
  const fullStart = sd.year && sd.month && sd.day;
  const start_date = fullStart
    ? `${sd.year}-${String(sd.month).padStart(2, "0")}-${String(sd.day).padStart(2, "0")}`
    : null;
  const platforms = [
    ...new Set((m.externalLinks ?? []).filter((l) => l.type === "STREAMING").map((l) => l.site)),
  ];
  return {
    anilist_id: m.id,
    mal_id: m.idMal,
    title_romaji: m.title.romaji,
    title_english: m.title.english,
    title_native: m.title.native,
    synonyms: m.synonyms ?? [],
    search_keys: buildSearchKeys([m.title.romaji, m.title.english, m.title.native, ...(m.synonyms ?? [])]),
    cover_url: m.coverImage.extraLarge,
    banner_url: m.bannerImage,
    color: m.coverImage.color,
    synopsis: m.description ? m.description.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 900) : null,
    genres: m.genres ?? [],
    studio: m.studios.nodes[0]?.name ?? null,
    platforms,
    season: m.season,
    season_year: m.seasonYear,
    status: m.status,
    format: m.format,
    total_episodes: m.episodes,
    next_episode: next?.episode ?? null,
    airing_at: next ? new Date(next.airingAt * 1000).toISOString() : null,
    start_date,
    date_confirmed: Boolean(next) || Boolean(fullStart),
    source_name: "AniList",
    source_url: m.siteUrl,
    site_url: m.siteUrl,
    popularity: m.popularity,
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

type Row = ReturnType<typeof mediaToRow>;

async function upsertMedia(rows: Row[], stats: Stats, sourceName = "AniList") {
  if (!rows.length) return [] as { id: string; anilist_id: number | null }[];
  const ids = rows.map((r) => r.anilist_id);
  const { data: existing } = await supabaseAdmin
    .from("animes")
    .select("id, anilist_id, airing_at, next_episode, start_date, date_confirmed, platforms")
    .in("anilist_id", ids);
  const byId = new Map((existing ?? []).map((e) => [e.anilist_id, e]));
  const changes: { anime_id: string; kind: string; old_value: string | null; new_value: string | null; source_name: string }[] = [];

  const saved: { id: string; anilist_id: number | null }[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50).map((r) => {
      const prev = byId.get(r.anilist_id);
      // Keep platforms added by trusted news sources
      if (prev?.platforms?.length) r.platforms = [...new Set([...r.platforms, ...prev.platforms])];
      return r;
    });
    const { data, error } = await supabaseAdmin
      .from("animes")
      .upsert(chunk, { onConflict: "anilist_id" })
      .select("id, anilist_id");
    if (error) throw new Error(`upsert animes: ${error.message}`);
    saved.push(...(data ?? []));
  }
  const idMap = new Map(saved.map((s) => [s.anilist_id, s.id]));

  for (const r of rows) {
    const id = idMap.get(r.anilist_id);
    if (!id) continue;
    const prev = byId.get(r.anilist_id);
    if (!prev) {
      stats.created = (stats.created ?? 0) + 1;
      changes.push({ anime_id: id, kind: "new_anime", old_value: null, new_value: r.airing_at ?? r.start_date, source_name: sourceName });
      continue;
    }
    stats.updated = (stats.updated ?? 0) + 1;
    if (r.next_episode && prev.next_episode && r.next_episode > prev.next_episode) {
      changes.push({ anime_id: id, kind: "new_episode", old_value: String(prev.next_episode), new_value: String(r.next_episode), source_name: sourceName });
    } else if (r.airing_at && prev.airing_at && r.next_episode === prev.next_episode) {
      const diff = new Date(r.airing_at).getTime() - new Date(prev.airing_at).getTime();
      if (Math.abs(diff) > 60_000) {
        const kind = Math.abs(diff) < 86_400_000 ? "schedule_change" : diff > 0 ? "delay" : "advance";
        changes.push({ anime_id: id, kind, old_value: prev.airing_at, new_value: r.airing_at, source_name: sourceName });
        stats.date_changes = (stats.date_changes ?? 0) + 1;
      }
    } else if (!r.airing_at && r.start_date && prev.start_date && r.start_date !== prev.start_date) {
      changes.push({ anime_id: id, kind: "date_change", old_value: prev.start_date, new_value: r.start_date, source_name: sourceName });
      stats.date_changes = (stats.date_changes ?? 0) + 1;
    }
    if (r.date_confirmed && !prev.date_confirmed) {
      changes.push({ anime_id: id, kind: "date_confirmed", old_value: null, new_value: r.airing_at ?? r.start_date, source_name: sourceName });
    }
  }
  if (changes.length) await supabaseAdmin.from("anime_changes").insert(changes);
  return saved;
}

async function syncAniList(stats: Stats) {
  const schedule = await fetchAiringSchedule(21);
  // Earliest upcoming episode per media
  const earliest = new Map<number, { airingAt: number; episode: number; media: AniMedia }>();
  for (const s of schedule) {
    if (s.media.isAdult) continue;
    const cur = earliest.get(s.media.id);
    if (!cur || s.airingAt < cur.airingAt) earliest.set(s.media.id, s);
  }
  await sleep(800);
  const upcoming = (await fetchNotYetReleased()).filter((m) => !m.isAdult);
  const rows = new Map<number, Row>();
  for (const m of upcoming) rows.set(m.id, mediaToRow(m));
  for (const s of earliest.values()) rows.set(s.media.id, mediaToRow(s.media, s));
  stats.api_items = rows.size;
  await upsertMedia([...rows.values()], stats);
}

async function syncJikan(stats: Stats) {
  // Cross-reference MyAnimeList upcoming season (Jikan: 3 req/s, 60/min).
  const res = await fetch("https://api.jikan.moe/v4/seasons/upcoming?page=1&sfw=true", {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  const json = (await res.json()) as {
    data: { mal_id: number; url: string; title: string; title_english: string | null; title_japanese: string | null; broadcast?: { string: string | null }; streaming?: { name: string }[] }[];
  };
  const malIds = json.data.map((d) => d.mal_id);
  const { data: matched } = await supabaseAdmin.from("animes").select("id, mal_id").in("mal_id", malIds);
  const byMal = new Map((matched ?? []).map((m) => [m.mal_id, m.id]));
  const rows = json.data.map((d) => ({
    anime_id: byMal.get(d.mal_id) ?? null,
    source_name: "MyAnimeList (Jikan)",
    url: d.url,
    title: d.title,
    event_type: "verification",
    status: byMal.has(d.mal_id) ? "matched" : "pending",
    info: { mal_id: d.mal_id, title_english: d.title_english, title_japanese: d.title_japanese, broadcast: d.broadcast?.string ?? null },
    last_checked_at: new Date().toISOString(),
  }));
  await supabaseAdmin.from("discoveries").upsert(rows, { onConflict: "url" });
  stats.jikan_verified = byMal.size;
}

async function findAnimeByTitles(titles: string[]) {
  const keys = buildSearchKeys(titles);
  if (!keys.length) return null;
  const { data } = await supabaseAdmin
    .from("animes")
    .select("id, anilist_id, airing_at, start_date, date_confirmed, platforms")
    .overlaps("search_keys", keys)
    .order("popularity", { ascending: false, nullsFirst: false })
    .limit(1);
  return data?.[0] ?? null;
}

async function syncNews(stats: Stats, errors: string[]) {
  const { data: sources } = await supabaseAdmin.from("news_sources").select("*").eq("enabled", true);
  let verifyBudget = 5;
  for (const src of sources ?? []) {
    try {
      const items = await fetchFeed(src.feed_url);
      const urls = items.map((i) => i.link);
      const { data: seen } = await supabaseAdmin.from("discoveries").select("url").in("url", urls);
      const seenSet = new Set((seen ?? []).map((s) => s.url));
      const fresh = items.filter((i) => !seenSet.has(i.link)).slice(0, 10);
      stats.news_new = (stats.news_new ?? 0) + fresh.length;
      if (fresh.length) {
        const results = await extractWithAi(fresh);
        for (let i = 0; i < fresh.length; i++) {
          const it = fresh[i];
          const r = results.find((x) => x.index === i);
          const base = {
            source_id: src.id,
            source_name: src.name,
            url: it.link,
            title: it.title,
            published_at: it.published && !isNaN(Date.parse(it.published)) ? new Date(it.published).toISOString() : null,
            last_checked_at: new Date().toISOString(),
          };
          if (!r || !r.relevant || !r.anime_title) {
            await supabaseAdmin.from("discoveries").upsert({ ...base, status: "ignored", info: {} }, { onConflict: "url" });
            continue;
          }
          const titles = [r.anime_title, ...(r.alt_titles ?? [])];
          let anime = await findAnimeByTitles(titles);
          // Verify unknown titles against structured data before creating a record
          if (!anime && verifyBudget > 0) {
            verifyBudget--;
            await sleep(800);
            const media = await searchAnime(r.anime_title);
            if (media && !media.isAdult) {
              const k = new Set(buildSearchKeys([media.title.romaji, media.title.english, media.title.native, ...media.synonyms]));
              if (titles.some((t) => k.has(normalizeTitle(t)))) {
                await upsertMedia([mediaToRow(media)], stats, src.name);
                anime = await findAnimeByTitles(titles);
              }
            }
          }
          let status = anime ? "matched" : "pending";
          if (anime) {
            // Low-risk enrichment from trusted sources: platform
            if (r.platform && src.trust >= 3 && !(anime.platforms ?? []).includes(r.platform)) {
              await supabaseAdmin.from("animes").update({ platforms: [...(anime.platforms ?? []), r.platform] }).eq("id", anime.id);
              await supabaseAdmin.from("anime_changes").insert({ anime_id: anime.id, kind: "platform", old_value: null, new_value: r.platform, source_name: src.name });
            }
            // Dates: never overwrite structured confirmed dates; flag conflicts for review
            if (r.date) {
              const current = anime.airing_at?.slice(0, 10) ?? anime.start_date;
              if (anime.date_confirmed && current && current !== r.date) status = "conflict";
              else if (!current && src.trust >= 3) {
                await supabaseAdmin.from("animes").update({ start_date: r.date, date_confirmed: false, updated_at: new Date().toISOString() }).eq("id", anime.id);
                await supabaseAdmin.from("anime_changes").insert({ anime_id: anime.id, kind: "date_announced", old_value: null, new_value: r.date, source_name: src.name });
              }
            }
          }
          await supabaseAdmin.from("discoveries").upsert(
            { ...base, anime_id: anime?.id ?? null, event_type: r.event_type, status, info: r },
            { onConflict: "url" },
          );
          stats.news_relevant = (stats.news_relevant ?? 0) + 1;
        }
      }
      await supabaseAdmin.from("news_sources").update({ last_checked_at: new Date().toISOString(), last_error: null }).eq("id", src.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${src.name}: ${msg}`);
      await supabaseAdmin.from("news_sources").update({ last_checked_at: new Date().toISOString(), last_error: msg }).eq("id", src.id);
      if (e instanceof AiBlockedError) break; // circuit breaker: stop AI work this run
    }
  }
}

export async function runSync(trigger: "cron" | "manual") {
  const { data: locked } = await supabaseAdmin.rpc("acquire_sync_lock", { _seconds: 600 });
  if (!locked) return { skipped: true, reason: "Sincronización en curso" };

  const { data: run } = await supabaseAdmin.from("sync_runs").insert({ trigger }).select("id").single();
  const stats: Stats = {};
  const errors: string[] = [];
  try {
    for (const [name, step] of [
      ["AniList", () => syncAniList(stats)],
      ["Jikan", () => syncJikan(stats)],
      ["Noticias", () => syncNews(stats, errors)],
    ] as const) {
      try {
        await step();
      } catch (e) {
        errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const status = errors.length === 0 ? "success" : stats.api_items ? "partial" : "error";
    await supabaseAdmin
      .from("sync_runs")
      .update({ status, stats, errors, finished_at: new Date().toISOString() })
      .eq("id", run!.id);
    return { skipped: false, status, stats, errors };
  } finally {
    await supabaseAdmin.rpc("release_sync_lock");
  }
}
