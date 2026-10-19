import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ExternalLink, LoaderCircle, Play, RefreshCw } from "lucide-react";
import { z } from "zod";
import { TabBar } from "@/components/app/TabBar";
import { Button } from "@/components/ui/button";
import { aniVellDetailQuery, aniVellServersQuery, aniVellWebUrl } from "@/lib/anivell";
import { embedUrl } from "@/lib/videos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/videos/anivell/$fuente/$animeId")({
  validateSearch: z.object({ episodio: z.number().positive().optional().catch(undefined) }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(aniVellDetailQuery(params.fuente, params.animeId)),
  head: ({ loaderData }) => {
    const title = `${loaderData?.titulo_es || loaderData?.titulo || "Anime"} | AniVell · Estrenos`;
    const description = loaderData?.sinopsis_es || "Información, capítulos y servidores disponibles en AniVell.";
    const image = aniVellWebUrl(loaderData?.portada);
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "video.tv_show" }, { name: "twitter:card", content: "summary_large_image" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ] };
  },
  pendingComponent: () => <div className="ambient min-h-screen p-6 text-muted-foreground" role="status">Consultando serie en AniVell…</div>,
  errorComponent: ({ error, reset }) => <div className="ambient min-h-screen p-6"><Link to="/videos" className="text-primary">Volver a Videos</Link><p role="alert" className="mt-5 text-sm text-destructive">{error.message}</p><Button className="mt-3" onClick={reset}><RefreshCw />Reintentar</Button></div>,
  component: AniVellDetail,
});

function AniVellDetail() {
  const { fuente, animeId } = Route.useParams();
  const search = Route.useSearch();
  const { data: anime } = useSuspenseQuery(aniVellDetailQuery(fuente, animeId));
  return <DetailBody key={`${fuente}/${animeId}`} anime={anime} fuente={fuente} animeId={animeId} requestedEpisode={search.episodio} />;
}

function DetailBody({ anime, fuente, animeId, requestedEpisode }: {
  anime: Awaited<ReturnType<typeof import("@/lib/anivell.functions").detailAniVell>>;
  fuente: string; animeId: string; requestedEpisode?: number;
}) {
  const episodes = [...anime.episodios].sort((a, b) => a.numero - b.numero);
  const [number, setNumber] = useState<number | null>(() => requestedEpisode && episodes.some((e) => e.numero === requestedEpisode) ? requestedEpisode : null);
  const [serverIndex, setServerIndex] = useState(0);
  const servers = useQuery({ ...aniVellServersQuery(fuente, animeId, number ?? 1), enabled: number !== null });
  const server = servers.data?.servidores[serverIndex];
  const url = aniVellWebUrl(server?.url);
  const embed = url && server?.tipo === "youtube" ? embedUrl("youtube", url) : url;
  const cover = aniVellWebUrl(anime.portada);
  return <div className="ambient min-h-screen">
    <main className="pb-safe mx-auto max-w-2xl pt-[env(safe-area-inset-top)]">
      <div className="px-4 py-3"><Link to="/videos" className="inline-flex items-center gap-1 text-[15px] text-primary"><ChevronLeft className="h-4 w-4" />Videos</Link></div>
      {number !== null && <section aria-label="Reproductor" className="sm:px-4">
        <div className="relative aspect-video w-full overflow-hidden bg-foreground/5 sm:rounded-2xl">
          {servers.isFetching ? <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Consultando servidores…</div>
            : servers.error ? <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-sm text-destructive"><p>{servers.error.message}</p><Button variant="ghost" size="sm" onClick={() => servers.refetch()}><RefreshCw />Reintentar</Button></div>
            : embed && server?.tipo === "embed" || embed && server?.tipo === "youtube" ? <iframe key={embed} src={embed ?? undefined} title={`Capítulo ${number} · ${server?.nombre}`} className="absolute inset-0 h-full w-full" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="no-referrer" />
            : url && (server?.tipo === "video" || server?.tipo === "mp4") ? <video key={url} src={url} controls playsInline className="absolute inset-0 h-full w-full" />
            : url ? <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-primary"><ExternalLink className="h-4 w-4" />Abrir servidor</a>
            : <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">{servers.data?.servidores.length ? "URL de reproducción no compatible." : "AniVell no devolvió servidores para este capítulo."}</p>}
        </div>
        {!!servers.data?.servidores.length && <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Servidores">{servers.data.servidores.map((s, i) => <Button key={`${s.nombre}-${i}`} size="sm" variant={i === serverIndex ? "default" : "secondary"} className="shrink-0 rounded-full" aria-pressed={i === serverIndex} onClick={() => setServerIndex(i)}>{s.nombre}</Button>)}</div>}
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] text-primary"><ExternalLink className="h-3.5 w-3.5" />Abrir en {server?.nombre}</a>}
        {!!servers.data?.fuentes_caidas?.length && <p className="mt-2 text-sm text-warning">Fuentes no disponibles: {servers.data.fuentes_caidas.join(", ")}</p>}
      </section>}
      <div className="px-4">
        <div className="mt-4 flex gap-3">
          {cover && <img src={cover} alt={anime.titulo} className="h-24 w-16 shrink-0 rounded-xl object-cover" />}
          <div className="min-w-0"><h1 className="text-[22px] font-bold leading-tight">{anime.titulo_es || anime.titulo}</h1><p className="mt-1 text-[13px] text-muted-foreground">{[anime.anio, anime.estado].filter(Boolean).join(" · ") || "Por confirmar"}</p><p className="text-[13px] text-muted-foreground">{episodes.length} capítulos{number !== null ? ` · Viendo ${number}` : ""}</p><p className="text-[12px] text-muted-foreground">AniVell · {anime.fuente}</p></div>
        </div>
        {anime.generos?.length ? <p className="mt-4 text-[13px] text-muted-foreground">{anime.generos.join(" · ")}</p> : null}
        <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Capítulos</h2>
        <div className="glass divide-y divide-border overflow-hidden rounded-2xl">{episodes.map((e) => <Button key={e.numero} variant="ghost" disabled={e.disponible === false} onClick={() => { setNumber(e.numero); setServerIndex(0); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-pressed={number === e.numero} className={cn("flex h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left", number === e.numero && "bg-foreground/6")}>
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px]", number === e.numero ? "bg-primary text-primary-foreground" : "bg-foreground/8")}>{number === e.numero ? <Play className="h-3.5 w-3.5 fill-current" /> : e.numero}</span>
          <span className="min-w-0 flex-1 whitespace-normal"><span className="block text-[15px] font-medium">Capítulo {e.numero}</span>{e.titulo && <span className="block text-[12px] text-muted-foreground">{e.titulo}</span>}</span>{e.disponible === false && <span className="text-[11px] text-muted-foreground">No disponible</span>}
        </Button>)}{!episodes.length && <p className="px-4 py-3 text-sm text-muted-foreground">AniVell no devolvió capítulos.</p>}</div>
        <p className="mt-5 px-1 text-[14px] leading-relaxed text-muted-foreground">{anime.sinopsis_es || "Sinopsis: Por confirmar"}</p>
      </div>
    </main><TabBar />
  </div>;
}