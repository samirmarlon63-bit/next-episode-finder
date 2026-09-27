import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { Screen } from "@/components/app/TabBar";
import { AnimeDetail } from "@/components/app/AnimeDetail";
import { type Anime, TBC, formatAiring, savedQuery, statusLabel, title } from "@/lib/anime";
import { useSaved, useSettings } from "@/lib/store";

export const Route = createFileRoute("/guardados")({
  head: () => ({
    meta: [
      { title: "Guardados | Estrenos de anime" },
      { name: "description", content: "Tus animes guardados, ordenados por el próximo estreno." },
      { property: "og:title", content: "Guardados | Estrenos de anime" },
      { property: "og:description", content: "Tus animes guardados, ordenados por el próximo estreno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guardados,
});

function Guardados() {
  const { ids, remove } = useSaved();
  const { timeZone } = useSettings();
  const { data } = useQuery(savedQuery(ids));
  const [open, setOpen] = useState<Anime | null>(null);

  return (
    <Screen title="Guardados" subtitle={`${ids.length} ${ids.length === 1 ? "anime" : "animes"}`}>
      {ids.length === 0 && (
        <div className="glass flex flex-col items-center rounded-3xl px-6 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Bookmark className="h-5 w-5" />
          </div>
          <p className="font-semibold">Nada guardado todavía</p>
          <p className="mt-1 text-sm text-muted-foreground">Guarda un anime desde Nuevos para seguir su próximo estreno.</p>
          <Link to="/" className="mt-4 rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground">
            Explorar estrenos
          </Link>
        </div>
      )}
      <div className="glass divide-y divide-border overflow-hidden rounded-2xl">
        {data?.map((a) => {
          const w = formatAiring(a, timeZone);
          return (
            <div key={a.id} className="flex items-center gap-3 p-2.5" onClick={() => setOpen(a)} role="button">
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {a.cover_url && <img src={a.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{title(a)}</p>
                <p className="text-[12px] text-muted-foreground">
                  {a.next_episode ? `Episodio ${a.next_episode}` : `Próximo episodio: ${TBC}`} · {statusLabel(a)}
                </p>
                <p className="text-[13px] font-medium text-foreground/90">
                  {w ? `${w.short} · ${w.time}` : TBC}
                  {w?.hasTime && <span className="text-muted-foreground"> {w.zone}</span>}
                </p>
              </div>
              <button
                aria-label="Eliminar de Guardados"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(a.id);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 hover:text-destructive"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </div>
          );
        })}
      </div>
      <AnimeDetail anime={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}
