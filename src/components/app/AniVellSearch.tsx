import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aniVellLatestQuery, aniVellSearchQuery, aniVellWebUrl } from "@/lib/anivell";

export function AniVellSearch({ search }: { search: string }) {
  const trimmed = search.trim();
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const timer = setTimeout(() => setDebounced(trimmed), 400); return () => clearTimeout(timer); }, [trimmed]);
  const active = trimmed.length >= 2 && trimmed === debounced;
  const results = useQuery({ ...aniVellSearchQuery(debounced), enabled: active });
  const latest = useQuery({ ...aniVellLatestQuery, enabled: trimmed.length === 0 });
  if (trimmed.length === 1) return <p className="mt-6 text-sm text-muted-foreground">Escribe al menos 2 caracteres para buscar en AniVell.</p>;
  const query = trimmed ? results : latest;
  const waiting = !!trimmed && !active;
  const entries = trimmed
    ? (results.data?.resultados ?? []).flatMap((a) => {
      const source = a.fuentes.find((f) => a.ids_por_fuente[f]);
      return source ? [{ ...a, source, id: a.ids_por_fuente[source], episode: null }] : [];
    })
    : (latest.data?.resultados ?? []).map((a) => ({ ...a, source: a.fuente, id: a.id_externo, episode: a.episodio, estado: null, anio: null, sinopsis_es: null }));
  return (
    <section className="mt-7" aria-label="AniVell">
      <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{trimmed ? "Resultados de AniVell" : "Recientes · AniVell"}</h2>
      {(waiting || query.isFetching) && <p role="status" className="flex items-center gap-2 px-1 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Consultando AniVell…</p>}
      {!waiting && query.error && <div role="alert" className="px-1 text-sm text-destructive"><p>{query.error.message}</p><Button variant="ghost" size="sm" className="mt-2" onClick={() => query.refetch()}><RefreshCw />Reintentar</Button></div>}
      {!waiting && !query.isFetching && query.data && !entries.length && <p className="py-5 text-center text-sm text-muted-foreground">{trimmed ? "Sin resultados en AniVell." : "AniVell no devolvió episodios recientes."}</p>}
      {trimmed && results.data?.fuentes && Object.entries(results.data.fuentes).some(([, status]) => status !== "ok") && <p className="mb-3 text-sm text-warning">Fuentes no disponibles: {Object.entries(results.data.fuentes).filter(([, status]) => status !== "ok").map(([name]) => name).join(", ")}</p>}
      {!waiting && <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {entries.map((a, index) => {
          const cover = aniVellWebUrl(a.portada);
          return <Link key={`${a.source}-${a.id}-${a.episode ?? index}`} to="/videos/anivell/$fuente/$animeId" params={{ fuente: a.source, animeId: a.id }} search={{ episodio: a.episode ?? undefined }} className="block transition-transform active:scale-[0.98]">
            <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-foreground/5">{cover && <img src={cover} alt={a.titulo_es || a.titulo} loading="lazy" className="h-full w-full object-cover" />}</div>
            <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-tight">{a.titulo_es || a.titulo}</p>
            <p className="text-[12px] text-muted-foreground">{a.episode != null ? `Capítulo ${a.episode}` : [a.anio, a.estado].filter(Boolean).join(" · ") || "Por confirmar"}</p>
            <p className="text-[11px] text-muted-foreground">{a.source}{a.sub_espanol === true ? " · Subtitulado" : ""}</p>
          </Link>;
        })}
      </div>}
    </section>
  );
}