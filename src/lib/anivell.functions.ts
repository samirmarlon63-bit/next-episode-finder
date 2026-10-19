import { createServerFn } from "@tanstack/react-start";
import { requestAniVell } from "./anivell.server";
import { aniVellDetailSchema, aniVellEpisodeInputSchema, aniVellIdentitySchema, aniVellLatestSchema, aniVellSearchInputSchema, aniVellSearchSchema, aniVellServersSchema } from "./anivell.schemas";

export const searchAniVell = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string }) => aniVellSearchInputSchema.parse(input))
  .handler(({ data }) => requestAniVell(`/api/search?q=${encodeURIComponent(data.q)}`, aniVellSearchSchema));

export const detailAniVell = createServerFn({ method: "GET" })
  .inputValidator((input: { fuente: string; id: string }) => aniVellIdentitySchema.parse(input))
  .handler(({ data }) => requestAniVell(`/api/anime/${encodeURIComponent(data.fuente)}/${encodeURIComponent(data.id)}`, aniVellDetailSchema));

export const serversAniVell = createServerFn({ method: "GET" })
  .inputValidator((input: { fuente: string; id: string; n: number }) => aniVellEpisodeInputSchema.parse(input))
  .handler(({ data }) => requestAniVell(`/api/anime/${encodeURIComponent(data.fuente)}/${encodeURIComponent(data.id)}/episodio/${data.n}`, aniVellServersSchema));

export const latestAniVell = createServerFn({ method: "GET" })
  .handler(() => requestAniVell("/api/latest", aniVellLatestSchema));