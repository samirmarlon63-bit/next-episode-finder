// RSS/Atom reader + AI extraction of anime release information.
export type FeedItem = {
  title: string;
  link: string;
  published: string | null;
  summary: string;
};

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? (m[1] ?? null) : null;
}

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "AnimeReleaseTracker/1.0 (+feed reader)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Feed ${res.status}`);
  const xml = await res.text();
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  return blocks
    .map((b) => {
      let link = decode(tag(b, "link") ?? "");
      if (!link) link = /<link[^>]*href="([^"]+)"/i.exec(b)?.[1] ?? "";
      if (!link) link = decode(tag(b, "guid") ?? "");
      return {
        title: decode(tag(b, "title") ?? ""),
        link: link.trim(),
        published: decode(tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? "") || null,
        summary: decode(tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content") ?? "").slice(0, 600),
      };
    })
    .filter((i) => i.title && /^https?:\/\//.test(i.link));
}

export type Extraction = {
  index: number;
  relevant: boolean;
  anime_title: string | null;
  alt_titles: string[];
  event_type: string | null; // new_anime | new_season | release_date | date_change | new_episode | delay | advance | schedule_change | platform
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  timezone: string | null; // IANA
  episode: number | null;
  platform: string | null;
  summary: string | null;
};

export class AiBlockedError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function extractWithAi(items: FeedItem[]): Promise<Extraction[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY no configurada");
  const list = items
    .map((it, i) => `[${i}] ${it.title}\nFecha: ${it.published ?? "desconocida"}\n${it.summary}`)
    .join("\n\n");
  const instructions = `You analyze anime news headlines. For each item decide if it contains concrete information about an anime premiere: new anime, new season, premiere date, date change, new episode, delay, advance, broadcast time change or streaming platform.
Only extract facts explicitly stated in the text. Never guess. Use null when unknown.
Reply ONLY with a JSON array, one object per item: {"index":number,"relevant":boolean,"anime_title":string|null,"alt_titles":string[],"event_type":"new_anime"|"new_season"|"release_date"|"date_change"|"new_episode"|"delay"|"advance"|"schedule_change"|"platform"|null,"date":"YYYY-MM-DD"|null,"time":"HH:mm"|null,"timezone":IANA string|null,"episode":number|null,"platform":string|null,"summary":short Spanish sentence|null}.
anime_title must be the franchise/series title only (no season words unless part of the official title).`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-6-astra", instructions, input: list }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 402 || res.status === 403 || res.status === 429)
      throw new AiBlockedError(res.status, body.slice(0, 300));
    throw new Error(`AI ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    output_text?: string;
    output?: { content?: { type?: string; text?: string }[] }[];
  };
  const text =
    json.output_text ??
    (json.output ?? [])
      .flatMap((o) => o.content ?? [])
      .map((c) => c.text ?? "")
      .join("");
  const match = /\[[\s\S]*\]/.exec(text);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as Extraction[];
  } catch {
    return [];
  }
}
