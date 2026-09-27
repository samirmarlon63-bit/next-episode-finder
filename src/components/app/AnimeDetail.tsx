import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import {
  type Anime,
  CHANGE_LABELS,
  TBC,
  changesForAnime,
  formatAiring,
  formatStamp,
  originalTitle,
  seasonLabel,
  sourcesForAnime,
  statusLabel,
  title,
} from "@/lib/anime";
import { useSaved, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[14px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || TBC}</span>
    </div>
  );
}

export function AnimeDetail({ anime, onClose }: { anime: Anime | null; onClose: () => void }) {
  return (
    <Drawer open={!!anime} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="glass max-h-[92vh] rounded-t-[28px] border-0">
        {anime && <Body anime={anime} />}
      </DrawerContent>
    </Drawer>
  );
}

function Body({ anime }: { anime: Anime }) {
  const { timeZone } = useSettings();
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(anime.id);
  const when = formatAiring(anime, timeZone);
  const sources = useQuery(sourcesForAnime(anime.id));
  const changes = useQuery(changesForAnime(anime.id));
  const orig = originalTitle(anime);

  return (
    <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="flex gap-4 pt-3">
        <div className="h-36 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
          {anime.cover_url && <img src={anime.cover_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <DrawerTitle className="text-[20px] font-bold leading-tight">{title(anime)}</DrawerTitle>
          <DrawerDescription className="mt-1 text-[13px] text-muted-foreground">{orig ?? "Título original: Por confirmar"}</DrawerDescription>
          <button
            onClick={() => toggle(anime.id)}
            className={cn(
              "mt-3 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all active:scale-95",
              saved ? "bg-primary/20 text-primary" : "bg-primary text-primary-foreground",
            )}
          >
            {saved ? "Guardado · Quitar" : "Guardar"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-foreground/80">{anime.synopsis || `Sinopsis: ${TBC}`}</p>

      <section className="glass-soft mt-4 divide-y divide-border rounded-2xl px-4">
        <Field label="Fecha" value={when?.date} />
        <Field label="Día" value={when?.weekday} />
        <Field label="Hora" value={when?.time} />
        <Field label="Zona horaria" value={when?.hasTime ? `${when.zone} (${timeZone})` : TBC} />
        <Field label="Mes y año" value={when?.monthYear} />
        <Field label="Estado de la fecha" value={<span className={anime.date_confirmed ? "text-success" : "text-warning"}>{anime.date_confirmed ? "Confirmada" : "Por confirmar"}</span>} />
      </section>

      <section className="glass-soft mt-3 divide-y divide-border rounded-2xl px-4">
        <Field label="Temporada" value={seasonLabel(anime)} />
        <Field label="Episodio" value={anime.next_episode ? `${anime.next_episode}${anime.total_episodes ? ` de ${anime.total_episodes}` : ""}` : null} />
        <Field label="Estado" value={statusLabel(anime)} />
        <Field label="Géneros" value={anime.genres.length ? anime.genres.join(", ") : null} />
        <Field label="Estudio" value={anime.studio} />
        <Field label="Plataforma" value={anime.platforms.length ? anime.platforms.join(", ") : null} />
        <Field
          label="Fuente"
          value={
            anime.source_url ? (
              <a href={anime.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
                {anime.source_name} <ExternalLink className="h-3 w-3" />
              </a>
            ) : anime.source_name
          }
        />
        <Field label="Última actualización" value={formatStamp(anime.updated_at, timeZone)} />
      </section>

      {!!changes.data?.length && (
        <section className="mt-5">
          <h4 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Historial</h4>
          <div className="glass-soft divide-y divide-border rounded-2xl px-4">
            {changes.data.map((c) => (
              <div key={c.id} className="py-2.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="font-medium">{CHANGE_LABELS[c.kind] ?? c.kind}</span>
                  <span className="text-muted-foreground">{formatStamp(c.created_at, timeZone)}</span>
                </div>
                {(c.old_value || c.new_value) && (
                  <p className="text-muted-foreground">
                    {c.old_value ? `${fmtVal(c.old_value, timeZone)} → ` : ""}
                    {fmtVal(c.new_value, timeZone)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h4 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Fuentes asociadas</h4>
        <div className="glass-soft divide-y divide-border rounded-2xl px-4">
          {anime.source_url && (
            <a href={anime.source_url} target="_blank" rel="noreferrer" className="flex items-center justify-between py-2.5 text-[13px]">
              <span>{anime.source_name} · datos estructurados</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          )}
          {sources.data?.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="block py-2.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <span className="line-clamp-1 font-medium">{s.title ?? s.source_name}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {s.source_name} · detectado {formatStamp(s.detected_at, timeZone)}
                {s.published_at ? ` · publicado ${formatStamp(s.published_at, timeZone)}` : ""}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function fmtVal(v: string | null, tz: string) {
  if (!v) return TBC;
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return formatStamp(v, tz);
  return v;
}
