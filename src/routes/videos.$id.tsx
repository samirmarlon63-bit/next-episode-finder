import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ExternalLink, Play } from "lucide-react";
import { TabBar } from "@/components/app/TabBar";
import { VIDEO_STATUS, embedUrl, fmtEp, videoDetailQuery } from "@/lib/videos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/videos/$id")({
  head: () => ({
    meta: [
      { title: "Ver anime | Videos" },
      { name: "description", content: "Lista de capítulos y reproductor desde fuentes oficiales." },
      { property: "og:title", content: "Ver anime" },
      { property: "og:description", content: "Capítulos de anime desde fuentes oficiales." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideoDetail,
});

function VideoDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(videoDetailQuery(id));
  const episodes = data?.episodes ?? [];
  const latest = episodes.length ? episodes[episodes.length - 1] : null;
  const [epId, setEpId] = useState<string | null>(null);
  const [srcIdx, setSrcIdx] = useState(0);
  useEffect(() => {
    if (!epId && latest) setEpId(latest.id);
  }, [latest, epId]);
  const ep = useMemo(() => episodes.find((e) => e.id === epId) ?? null, [episodes, epId]);
  const src = ep?.video_sources[srcIdx] ?? ep?.video_sources[0];
  const embed = src ? embedUrl(src.kind, src.url) : null;
  const a = data?.anime;

  return (
    <div className="ambient min-h-screen">
      <main className="pb-safe mx-auto max-w-2xl pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3">
          <Link to="/videos" className="inline-flex items-center gap-1 text-[15px] text-primary">
            <ChevronLeft className="h-4 w-4" /> Videos
          </Link>
        </div>

        {/* Player: full-bleed on phones, fixed 16:9, no zoom */}
        <div className="sticky top-0 z-30 bg-background sm:static sm:px-4">
          <div className="relative aspect-video w-full overflow-hidden bg-foreground/5 sm:rounded-2xl">
            {embed ? (
              <iframe
                key={embed}
                src={embed}
                title={ep ? `Capítulo ${fmtEp(ep.number)}` : "Reproductor"}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : src ? (
              <a href={src.url} target="_blank" rel="noreferrer" className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[14px] text-primary">
                <ExternalLink className="h-6 w-6" /> Ver en {src.label}
              </a>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[13px] text-muted-foreground">
                {isLoading ? "" : "Sin capítulos disponibles"}
              </div>
            )}
          </div>
        </div>

        <div className="px-4">
          {ep && ep.video_sources.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {ep.video_sources.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSrcIdx(i)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[13px] font-medium",
                    (src?.id === s.id) ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-muted-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {a && (
            <div className="mt-4 flex gap-3">
              {a.cover_url && <img src={a.cover_url} alt={a.title} className="h-24 w-16 shrink-0 rounded-xl object-cover" />}
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold leading-tight tracking-tight">{a.title}</h1>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  <span className={a.status === "airing" ? "text-success" : ""}>{VIDEO_STATUS[a.status] ?? a.status}</span>
                  {" · "}
                  {episodes.length} capítulos
                  {ep && ` · Viendo ${fmtEp(ep.number)}`}
                </p>
                {src && <p className="text-[12px] text-muted-foreground">Fuente: {src.label}</p>}
              </div>
            </div>
          )}

          <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Capítulos</h2>
          <div className="glass divide-y divide-border overflow-hidden rounded-2xl">
            {[...episodes].reverse().map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setEpId(e.id);
                  setSrcIdx(0);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn("flex w-full items-center gap-3 px-4 py-3 text-left", e.id === epId && "bg-foreground/6")}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", e.id === epId ? "bg-primary text-primary-foreground" : "bg-foreground/8")}>
                  {e.id === epId ? <Play className="h-3.5 w-3.5 fill-current" /> : fmtEp(e.number)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">Capítulo {fmtEp(e.number)}</span>
                  {e.title && <span className="block truncate text-[12px] text-muted-foreground">{e.title}</span>}
                </span>
                {latest?.id === e.id && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">Nuevo</span>}
              </button>
            ))}
            {!isLoading && !episodes.length && <p className="px-4 py-3 text-[13px] text-muted-foreground">Aún no hay capítulos.</p>}
          </div>
          {a?.synopsis && <p className="mt-5 px-1 text-[14px] leading-relaxed text-muted-foreground">{a.synopsis}</p>}
          <div className="h-28" />
        </div>
      </main>
      <TabBar />
    </div>
  );
}
