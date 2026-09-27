import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Anime = Tables<"animes">;
export const TBC = "Por confirmar";

export function effectiveDate(a: Anime): number | null {
  if (a.airing_at) return new Date(a.airing_at).getTime();
  if (a.start_date) return new Date(`${a.start_date}T00:00:00Z`).getTime();
  return null;
}

export const upcomingQuery = queryOptions({
  queryKey: ["animes", "upcoming"],
  queryFn: async () => {
    const now = new Date(Date.now() - 2 * 3600_000).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("animes")
      .select("*")
      .or(`airing_at.gte.${now},and(airing_at.is.null,start_date.gte.${today})`)
      .limit(500);
    if (error) throw error;
    return (data ?? []).sort((a, b) => (effectiveDate(a) ?? Infinity) - (effectiveDate(b) ?? Infinity));
  },
  refetchInterval: 5 * 60_000,
  staleTime: 60_000,
});

export const savedQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["animes", "saved", ids],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data, error } = await supabase.from("animes").select("*").in("id", ids);
      if (error) throw error;
      return (data ?? []).sort((a, b) => (effectiveDate(a) ?? Infinity) - (effectiveDate(b) ?? Infinity));
    },
    refetchInterval: 5 * 60_000,
  });

export const sourcesForAnime = (id: string) =>
  queryOptions({
    queryKey: ["discoveries", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("discoveries")
        .select("id, source_name, url, title, event_type, published_at, detected_at, last_checked_at")
        .eq("anime_id", id)
        .order("detected_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

export const changesForAnime = (id: string) =>
  queryOptions({
    queryKey: ["changes", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("anime_changes")
        .select("*")
        .eq("anime_id", id)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

export const lastSyncQuery = queryOptions({
  queryKey: ["sync", "last"],
  queryFn: async () => {
    const { data } = await supabase
      .from("sync_runs")
      .select("*")
      .neq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },
  refetchInterval: 60_000,
});

export function title(a: Anime) {
  return a.title_english || a.title_romaji || a.title_native || TBC;
}
export function originalTitle(a: Anime) {
  const main = title(a);
  const o = a.title_native || a.title_romaji;
  return o && o !== main ? o : null;
}

const SEASONS: Record<string, string> = { WINTER: "Invierno", SPRING: "Primavera", SUMMER: "Verano", FALL: "Otoño" };
export function seasonLabel(a: Anime) {
  return a.season ? `${SEASONS[a.season] ?? a.season} ${a.season_year ?? ""}`.trim() : TBC;
}
const STATUS: Record<string, string> = {
  NOT_YET_RELEASED: "Próximo estreno",
  RELEASING: "En emisión",
  FINISHED: "Finalizado",
  HIATUS: "En pausa",
  CANCELLED: "Cancelado",
};
export function statusLabel(a: Anime) {
  return a.status ? (STATUS[a.status] ?? a.status) : TBC;
}

/** DST-safe: formats a UTC instant in the target IANA zone via Intl. */
export function formatAiring(a: Anime, timeZone: string) {
  if (a.airing_at) {
    const d = new Date(a.airing_at);
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es", { timeZone, ...o }).format(d);
    const tzName =
      new Intl.DateTimeFormat("es", { timeZone, timeZoneName: "short" }).formatToParts(d).find((p) => p.type === "timeZoneName")
        ?.value ?? timeZone;
    return {
      weekday: cap(f({ weekday: "long" })),
      date: f({ day: "numeric", month: "long", year: "numeric" }),
      short: cap(f({ weekday: "short", day: "numeric", month: "short" })),
      monthYear: cap(f({ month: "long", year: "numeric" })),
      time: f({ hour: "2-digit", minute: "2-digit" }),
      zone: tzName,
      hasTime: true,
    };
  }
  if (a.start_date) {
    const d = new Date(`${a.start_date}T12:00:00Z`);
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es", { timeZone: "UTC", ...o }).format(d);
    return {
      weekday: cap(f({ weekday: "long" })),
      date: f({ day: "numeric", month: "long", year: "numeric" }),
      short: cap(f({ weekday: "short", day: "numeric", month: "short" })),
      monthYear: cap(f({ month: "long", year: "numeric" })),
      time: TBC,
      zone: TBC,
      hasTime: false,
    };
  }
  return null;
}

export function relative(a: Anime) {
  const t = effectiveDate(a);
  if (!t) return null;
  const diff = t - Date.now();
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const h = diff / 3600_000;
  if (Math.abs(h) < 24) return rtf.format(Math.round(h), "hour");
  return rtf.format(Math.round(h / 24), "day");
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatStamp(iso: string | null | undefined, timeZone: string) {
  if (!iso) return TBC;
  return new Intl.DateTimeFormat("es", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export const CHANGE_LABELS: Record<string, string> = {
  new_anime: "Nuevo anime",
  new_episode: "Nuevo episodio",
  delay: "Retraso",
  advance: "Adelanto",
  schedule_change: "Cambio de horario",
  date_change: "Cambio de fecha",
  date_confirmed: "Fecha confirmada",
  date_announced: "Fecha anunciada",
  platform: "Plataforma",
};
