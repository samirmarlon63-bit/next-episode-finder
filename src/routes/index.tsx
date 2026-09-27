import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Screen } from "@/components/app/TabBar";
import { AnimeRow } from "@/components/app/AnimeRow";
import { AnimeDetail } from "@/components/app/AnimeDetail";
import { type Anime, effectiveDate, upcomingQuery } from "@/lib/anime";
import { useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nuevos estrenos de anime | Estrenos" },
      { name: "description", content: "Próximos estrenos y episodios de anime, actualizados automáticamente con fecha, hora local y fuentes." },
      { property: "og:title", content: "Nuevos estrenos de anime" },
      { property: "og:description", content: "Próximos estrenos de anime actualizados automáticamente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Nuevos,
});

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "premiere", label: "Estrenos" },
  { id: "episodes", label: "Episodios" },
] as const;

function Nuevos() {
  const { data, isLoading, error } = useQuery(upcomingQuery);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState<Anime | null>(null);
  const { timeZone } = useSettings();

  const groups = useMemo(() => {
    const list = (data ?? []).filter((a) =>
      filter === "all" ? true : filter === "premiere" ? a.status === "NOT_YET_RELEASED" || a.next_episode === 1 : a.status === "RELEASING",
    );
    const map = new Map<string, Anime[]>();
    for (const a of list) {
      const t = effectiveDate(a);
      const key = t
        ? new Intl.DateTimeFormat("es", { timeZone: a.airing_at ? timeZone : "UTC", month: "long", year: "numeric" }).format(t)
        : "Fecha por confirmar";
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()];
  }, [data, filter, timeZone]);

  return (
    <Screen title="Nuevos" subtitle={data ? `${data.length} próximos estrenos` : "Próximos estrenos"}>
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
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass h-[124px] animate-pulse rounded-2xl" />
          ))}
        </div>
      )}
      {error && <p className="px-1 text-sm text-destructive">No se pudieron cargar los estrenos.</p>}
      {data && data.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Aún no hay estrenos sincronizados. La primera sincronización del servidor los añadirá automáticamente.
        </div>
      )}

      <div className="space-y-6">
        {groups.map(([label, items]) => (
          <section key={label}>
            <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
            <div className="space-y-2.5">
              {items.map((a) => (
                <AnimeRow key={a.id} anime={a} onOpen={() => setOpen(a)} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <AnimeDetail anime={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}
