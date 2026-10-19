import { queryOptions } from "@tanstack/react-query";
import { detailAniVell, latestAniVell, searchAniVell, serversAniVell } from "./anivell.functions";

const cache = { staleTime: 5 * 60_000, gcTime: 30 * 60_000, retry: false as const, refetchOnWindowFocus: false };
export const aniVellSearchQuery = (q: string) => queryOptions({
  queryKey: ["anivell", "search", q], queryFn: () => searchAniVell({ data: { q } }), ...cache,
});
export const aniVellDetailQuery = (fuente: string, id: string) => queryOptions({
  queryKey: ["anivell", "detail", fuente, id], queryFn: () => detailAniVell({ data: { fuente, id } }), ...cache,
});
export const aniVellServersQuery = (fuente: string, id: string, n: number) => queryOptions({
  queryKey: ["anivell", "servers", fuente, id, n], queryFn: () => serversAniVell({ data: { fuente, id, n } }), ...cache,
});
export const aniVellLatestQuery = queryOptions({ queryKey: ["anivell", "latest"], queryFn: () => latestAniVell(), ...cache });

/** Reject non-web protocols before handing a provider URL to a browser. */
export function aniVellWebUrl(raw: string | null | undefined) {
  if (!raw) return null;
  try { const url = new URL(raw); return url.protocol === "https:" ? url.href : null; }
  catch { return null; }
}