// AniList GraphQL client (public API, ~30-90 req/min). Respects Retry-After.
const ENDPOINT = "https://graphql.anilist.co";

export type AniMedia = {
  id: number;
  idMal: number | null;
  isAdult: boolean;
  title: { romaji: string | null; english: string | null; native: string | null };
  synonyms: string[];
  coverImage: { extraLarge: string | null; color: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  studios: { nodes: { name: string }[] };
  externalLinks: { site: string; type: string | null }[] | null;
  season: string | null;
  seasonYear: number | null;
  status: string | null;
  format: string | null;
  episodes: number | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  nextAiringEpisode: { airingAt: number; episode: number } | null;
  siteUrl: string | null;
  popularity: number | null;
};

const MEDIA_FIELDS = `
  id idMal isAdult
  title { romaji english native }
  synonyms
  coverImage { extraLarge color }
  bannerImage description(asHtml: false) genres
  studios(isMain: true) { nodes { name } }
  externalLinks { site type }
  season seasonYear status format episodes
  startDate { year month day }
  nextAiringEpisode { airingAt episode }
  siteUrl popularity
`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(Number(res.headers.get("retry-after") ?? "30"), 60);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`AniList ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { data: T; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(`AniList: ${json.errors[0]?.message}`);
    return json.data;
  }
  throw new Error("AniList rate limit");
}

/** Episodes airing in the next `days` days (exact timestamps). */
export async function fetchAiringSchedule(days: number, maxPages = 6) {
  const now = Math.floor(Date.now() / 1000);
  const until = now + days * 86400;
  const out: { airingAt: number; episode: number; media: AniMedia }[] = [];
  const q = `query($page:Int,$from:Int,$to:Int){ Page(page:$page, perPage:50){ pageInfo{ hasNextPage }
    airingSchedules(airingAt_greater:$from, airingAt_lesser:$to, sort:TIME){ airingAt episode media { ${MEDIA_FIELDS} } } } }`;
  for (let page = 1; page <= maxPages; page++) {
    const data = await gql<{
      Page: { pageInfo: { hasNextPage: boolean }; airingSchedules: typeof out };
    }>(q, { page, from: now, to: until });
    out.push(...data.Page.airingSchedules);
    if (!data.Page.pageInfo.hasNextPage) break;
    await sleep(800);
  }
  return out;
}

/** Titles not yet released, with a future start date. */
export async function fetchNotYetReleased(maxPages = 4) {
  const d = new Date();
  const fuzzy = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const out: AniMedia[] = [];
  const q = `query($page:Int,$from:FuzzyDateInt){ Page(page:$page, perPage:50){ pageInfo{ hasNextPage }
    media(type:ANIME, status:NOT_YET_RELEASED, startDate_greater:$from, sort:[POPULARITY_DESC]){ ${MEDIA_FIELDS} } } }`;
  for (let page = 1; page <= maxPages; page++) {
    const data = await gql<{ Page: { pageInfo: { hasNextPage: boolean }; media: AniMedia[] } }>(q, {
      page,
      from: fuzzy - 1,
    });
    out.push(...data.Page.media);
    if (!data.Page.pageInfo.hasNextPage) break;
    await sleep(800);
  }
  return out;
}

/** Verify a title mentioned by a news source against AniList. */
export async function searchAnime(title: string): Promise<AniMedia | null> {
  const q = `query($s:String){ Media(search:$s, type:ANIME, sort:[SEARCH_MATCH]){ ${MEDIA_FIELDS} } }`;
  try {
    const data = await gql<{ Media: AniMedia | null }>(q, { s: title });
    return data.Media;
  } catch {
    return null;
  }
}
