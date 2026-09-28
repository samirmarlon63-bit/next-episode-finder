import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Play, Search } from "lucide-react";
import { Screen } from "@/components/app/TabBar";
import { VIDEO_STATUS, fmtEp, videoListQuery } from "@/lib/videos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/videos/")({
  head: () => ({
    meta: [
      { title: "Videos de anime | Estrenos" },
      { name: "description", content: "Mira capítulos de anime desde canales oficiales, con la lista de episodios siempre actualizada." },
      { property: "og:title", content: "Videos de anime" },
      { property: "og:description", content: "Capítulos de anime desde fuentes oficiales, actualizados automáticamente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Videos,
});

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "airing", label: "En emisión" },
  { id: "finished", label: "Finalizados" },
] as const;

function Videos() {
  const { data, isLoading, error } = useQuery(videoListQuery);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      (data ?? []).filter(
        (a) => (filter === "all" || a.status === filter) && a.title.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [data, filter, q],
  );

  return (
    <Screen title="Videos" subtitle={data ? `${data.length} animes` : "Capítulos"}>
      <label className="glass-soft mb-3 flex items-center gap-2 rounded-full px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar anime"
          className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
        />
      </label>
      <div className="glass-soft mb-5 flex rounded-full p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex-1 rounded-full py-1.5 text-[13px] font-medium transition-all duration-300",
              filter === f.id ? "bg-foreground/12 text-foreground" : "text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass aspect-[2/3] animate-pulse rounded-2xl" />
          ))}
        </div>
      )}
      {error && <p className="px-1 text-sm text-destructive">No se pudieron cargar los videos.</p>}
      {data && list.length === 0 && (
        <p className="px-1 py-10 text-center text-sm text-muted-foreground">
          {data.length ? "Sin resultados." : "Todavía no hay animes con videos."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {list.map((a) => (
          <Link key={a.id} to="/videos/$id" params={{ id: a.id }} className="group block active:scale-[0.98] transition-transform">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-foreground/5">
              {a.cover_url && <img src={a.cover_url} alt={a.title} loading="lazy" className="h-full w-full object-cover" />}
              <span
                className={cn(
                  "glass absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  a.status === "airing" ? "text-success" : "text-muted-foreground",
                )}
              >
                {VIDEO_STATUS[a.status] ?? a.status}
              </span>
              <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-tight">{a.title}</p>
            <p className="text-[12px] text-muted-foreground">
              {a.episodes} cap. {a.latest != null && `· Último: ${fmtEp(a.latest)}`}
            </p>
          </Link>
        ))}
      </div>
    </Screen>
  );
}
