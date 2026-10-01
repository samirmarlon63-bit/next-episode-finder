// Autodetects a legal video source (YouTube playlist/channel, RSS/Atom feed, JSON API) from a pasted URL.
// Reads only what the page openly advertises (feed links, metadata). Never bypasses blocks.
import { parseEpisode, scanItems, type Provider } from "./videos.server";

const UA = "AnimeEstrenosBot/1.0 (+source autodetect)";

export type Detection = {
  ok: boolean;
  kind: string;
  url: string;
  name: string;
  language: string;
  config: Record<string, string>;
  preview: { title: string; link: string; episode: number | null }[];
  warning: string | null;
};

async function get(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow" });
  if (res.status === 403 || res.status === 503 || res.status === 429)
    throw new Error(`La página no permite la lectura automática (HTTP ${res.status}). Prueba con su feed RSS o rellena los campos a mano.`);
  if (!res.ok) throw new Error(`La página respondió con HTTP ${res.status}`);
  const text = await res.text();
  return { text, type: res.headers.get("content-type") ?? "", final: res.url || url };
}

const meta = (html: string, prop: string) =>
  new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)`, "i").exec(html)?.[1] ??
  new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i").exec(html)?.[1];

function langFrom(html: string, url: string) {
  const l = /<html[^>]*\blang=["']([a-z]{2})/i.exec(html)?.[1];
  if (l) return l.toLowerCase();
  const tld = new URL(url).hostname.split(".").pop() ?? "";
  if (["jp"].includes(tld)) return "ja";
  if (["br", "pt"].includes(tld)) return "pt";
  if (["fr"].includes(tld)) return "fr";
  if (["com", "net", "org", "io", "tv"].includes(tld)) return "es";
  return "es";
}

function findArrayPath(obj: unknown, path = "", depth = 0): string | null {
  if (Array.isArray(obj)) return obj.length && typeof obj[0] === "object" ? path : null;
  if (!obj || typeof obj !== "object" || depth > 4) return null;
  for (const [k, v] of Object.entries(obj)) {
    const r = findArrayPath(v, path ? `${path}.${k}` : k, depth + 1);
    if (r !== null) return r;
  }
  return null;
}

function guessJson(json: unknown) {
  const itemsPath = findArrayPath(json);
  if (itemsPath === null) return null;
  const arr = (itemsPath ? itemsPath.split(".").reduce<any>((o, k) => o?.[k], json) : json) as Record<string, unknown>[];
  const keys = Object.keys(arr[0] ?? {});
  const pick = (re: RegExp, test?: (v: unknown) => boolean) => keys.find((k) => re.test(k) && (!test || test(arr[0]![k])));
  const titleField = pick(/^(title|name|titulo|nombre)$/i) ?? pick(/title|name/i);
  const urlField = pick(/url|link|href/i, (v) => typeof v === "string" && /^https?:\/\//.test(v));
  const episodeField = pick(/^(episode|ep|number|numero|capitulo)$/i);
  if (!titleField || !urlField) return null;
  return { itemsPath, titleField, urlField, ...(episodeField ? { episodeField } : {}) };
}

export async function detectSource(raw: string): Promise<Detection> {
  const input = raw.trim();
  const base: Detection = { ok: false, kind: "rss", url: input, name: "", language: "es", config: {}, preview: [], warning: null };
  let d = { ...base };

  try {
    const u = new URL(input);
    const yt = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname);
    if (yt && u.searchParams.get("list")) {
      d = { ...d, kind: "youtube_playlist", url: u.searchParams.get("list")! };
    } else if (yt) {
      const direct = /\/channel\/(UC[\w-]{10,})/.exec(u.pathname)?.[1];
      let id = direct;
      const page = await get(input);
      if (!id) id = /"(?:channelId|externalId)":"(UC[\w-]{10,})"/.exec(page.text)?.[1] ?? /channel\/(UC[\w-]{10,})/.exec(meta(page.text, "og:url") ?? "")?.[1];
      if (!id) throw new Error("No encontré el canal en ese enlace de YouTube");
      d = { ...d, kind: "youtube_channel", url: id, name: meta(page.text, "og:title") ?? "" };
    } else {
      const page = await get(input);
      const head = page.text.slice(0, 600).trimStart();
      if (/json/i.test(page.type) || head.startsWith("{") || head.startsWith("[")) {
        const cfg = guessJson(JSON.parse(page.text));
        if (!cfg) throw new Error("La respuesta JSON no tiene una lista con título y enlace reconocibles");
        d = { ...d, kind: "json", url: page.final, config: cfg, name: u.hostname.replace(/^www\./, "") };
      } else if (/xml|rss|atom/i.test(page.type) || /^<\?xml|<rss|<feed/i.test(head)) {
        d = { ...d, kind: "rss", url: page.final, name: /<title>(?:<!\[CDATA\[)?([^<\]]+)/i.exec(page.text)?.[1]?.trim() ?? "" };
      } else {
        const link = /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i.exec(page.text)?.[0];
        const href = link && /href=["']([^"']+)/i.exec(link)?.[1];
        if (!href) throw new Error("Esta página no anuncia un feed RSS. Busca su feed o lista oficial y pégalo.");
        d = {
          ...d,
          kind: "rss",
          url: new URL(href.replace(/&amp;/g, "&"), page.final).toString(),
          name: meta(page.text, "og:site_name") ?? /<title>([^<]+)/i.exec(page.text)?.[1]?.trim() ?? "",
          language: langFrom(page.text, page.final),
        };
      }
      if (d.language === "es" && d.kind !== "rss") d.language = langFrom(page.text, page.final);
    }

    const items = await scanItems({ id: "preview", name: d.name || "Vista previa", kind: d.kind, url: d.url, video_anime_id: null, config: d.config } as Provider);
    d.preview = items.slice(0, 6).map((i) => ({ title: i.title, link: i.link, episode: i.episode ?? parseEpisode(i.title) }));
    d.ok = true;
    if (!items.length) d.warning = "La fuente no tiene publicaciones por ahora. Revisa las opciones avanzadas.";
    else if (!d.preview.some((p) => p.episode != null)) d.warning = "No reconocí números de capítulo en los títulos. Añade un patrón en Avanzado.";
    if (!d.name) d.name = u.hostname.replace(/^www\./, "");
    return d;
  } catch (e) {
    return { ...d, ok: false, warning: e instanceof Error ? e.message : String(e) };
  }
}
