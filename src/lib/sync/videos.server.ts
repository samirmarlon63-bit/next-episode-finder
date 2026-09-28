// Video sync: reads official YouTube playlist feeds (public Atom, no scraping) and adds new episodes.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchFeed } from "./news.server";

const EP_PATTERNS = [
  /(?:episod(?:e|io)|ep\.?|cap(?:[íi]tulo)?\.?)\s*#?\s*(\d+(?:\.\d)?)/i,
  /第\s*(\d+)\s*[話话集]/,
  /#\s*(\d+(?:\.\d)?)\b/,
];
export function parseEpisode(title: string): number | null {
  for (const p of EP_PATTERNS) {
    const m = p.exec(title);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (n > 0 && n < 5000) return n;
    }
  }
  return null;
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
  const stats = { animes_checked: 0, animes_updated: 0, episodes_new: 0 };
  const errors: string[] = [];

  const { data: animes } = await supabaseAdmin
    .from("video_animes")
    .select("id, title, youtube_playlist_id, source_name")
    .not("youtube_playlist_id", "is", null)
    .limit(100);

  for (const a of animes ?? []) {
    stats.animes_checked++;
    try {
      const items = await fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(a.youtube_playlist_id!)}`);
      const { data: existing } = await supabaseAdmin.from("video_episodes").select("id, number").eq("video_anime_id", a.id);
      const have = new Map((existing ?? []).map((e) => [Number(e.number), e.id]));
      let added = 0;
      for (const it of items) {
        const n = parseEpisode(it.title);
        if (n == null) continue;
        let epId = have.get(n);
        if (!epId) {
          const { data: ep, error } = await supabaseAdmin
            .from("video_episodes")
            .upsert({ video_anime_id: a.id, number: n, title: it.title }, { onConflict: "video_anime_id,number" })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          epId = ep.id;
          have.set(n, epId);
          added++;
        }
        await supabaseAdmin
          .from("video_sources")
          .upsert({ episode_id: epId, label: a.source_name || "YouTube oficial", kind: "youtube", url: it.link }, { onConflict: "episode_id,url", ignoreDuplicates: true });
      }
      stats.episodes_new += added;
      if (added) stats.animes_updated++;
      await supabaseAdmin
        .from("video_animes")
        .update({ last_synced_at: new Date().toISOString(), last_sync_error: null, ...(added ? { updated_at: new Date().toISOString() } : {}) })
        .eq("id", a.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${a.title}: ${msg}`);
      await supabaseAdmin.from("video_animes").update({ last_synced_at: new Date().toISOString(), last_sync_error: msg }).eq("id", a.id);
    }
  }

  const status = errors.length === 0 ? "success" : errors.length < stats.animes_checked ? "partial" : "error";
  await supabaseAdmin.from("sync_runs").update({ status, stats, errors, finished_at: new Date().toISOString() }).eq("id", run!.id);
  return { skipped: false as const, status, stats, errors };
}
