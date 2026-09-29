import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type VideoAnime = Tables<"video_animes">;
export type VideoEpisode = Tables<"video_episodes"> & { video_sources: Tables<"video_sources">[] };
export type VideoAnimeWithStats = VideoAnime & { episodes: number; latest: number | null };

export const VIDEO_STATUS: Record<string, string> = { airing: "En emisión", finished: "Finalizado" };

export const videoListQuery = queryOptions({
  queryKey: ["videos", "list"],
  queryFn: async (): Promise<VideoAnimeWithStats[]> => {
    const { data, error } = await supabase
      .from("video_animes")
      .select("*, video_episodes(number)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(({ video_episodes, ...a }) => {
      const nums = (video_episodes ?? []).map((e) => Number(e.number));
      return { ...a, episodes: nums.length, latest: nums.length ? Math.max(...nums) : null };
    });
  },
  staleTime: 60_000,
});

export const videoDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["videos", "detail", id],
    queryFn: async () => {
      const { data: anime, error } = await supabase.from("video_animes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      const { data: eps } = await supabase
        .from("video_episodes")
        .select("*, video_sources(*)")
        .eq("video_anime_id", id)
        .order("number", { ascending: true });
      // Manual sources (no provider) take priority over automatically discovered ones.
      const episodes = ((eps ?? []) as VideoEpisode[]).map((e) => ({
        ...e,
        video_sources: [...e.video_sources].sort((a, b) => Number(!!a.provider_id) - Number(!!b.provider_id)),
      }));
      return { anime, episodes };
    },
  });

export const lastVideoSyncQuery = queryOptions({
  queryKey: ["videos", "sync"],
  queryFn: async () =>
    (
      await supabase
        .from("sync_runs")
        .select("*")
        .in("trigger", ["videos-cron", "videos-manual"])
        .order("started_at", { ascending: false })
        .limit(5)
    ).data ?? [],
});

export function fmtEp(n: number | string) {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Converts a stored source into an embeddable URL, or null when it must open externally. */
export function embedUrl(kind: string, url: string): string | null {
  if (kind === "external") return null;
  if (kind === "youtube") {
    const id =
      /[?&]v=([\w-]{11})/.exec(url)?.[1] ?? /youtu\.be\/([\w-]{11})/.exec(url)?.[1] ?? /\/(?:embed|shorts|live)\/([\w-]{11})/.exec(url)?.[1] ??
      (/^[\w-]{11}$/.test(url) ? url : null);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1` : null;
  }
  return url;
}
