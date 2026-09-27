import { Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { type Anime, TBC, formatAiring, originalTitle, relative, statusLabel, title } from "@/lib/anime";
import { useSaved, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SaveButton({ anime, className }: { anime: Anime; className?: string }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(anime.id);
  return (
    <button
      aria-label={saved ? "Quitar de Guardados" : "Guardar"}
      aria-pressed={saved}
      onClick={(e) => {
        e.stopPropagation();
        toggle(anime.id);
      }}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
        saved ? "bg-primary/20 text-primary" : "glass-soft text-muted-foreground",
        className,
      )}
    >
      {saved ? <BookmarkCheck className="h-[18px] w-[18px]" /> : <Bookmark className="h-[18px] w-[18px]" />}
    </button>
  );
}

export function AnimeRow({ anime, onOpen, compact }: { anime: Anime; onOpen: () => void; compact?: boolean }) {
  const { timeZone } = useSettings();
  const when = formatAiring(anime, timeZone);
  const orig = originalTitle(anime);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="glass flex gap-3 rounded-2xl p-2.5 transition-transform duration-200 active:scale-[0.985]"
    >
      <div className="relative h-[104px] w-[74px] shrink-0 overflow-hidden rounded-xl bg-muted">
        {anime.cover_url && <img src={anime.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{title(anime)}</h3>
            {orig && !compact && <p className="truncate text-[12px] text-muted-foreground">{orig}</p>}
          </div>
          <SaveButton anime={anime} />
        </div>
        <div className="mt-auto space-y-1">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground/90">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {when ? `${when.short} · ${when.time}` : TBC}
            {when?.hasTime && <span className="text-muted-foreground">{when.zone}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-foreground/8 px-2 py-0.5">
              {anime.next_episode ? `Episodio ${anime.next_episode}` : statusLabel(anime)}
            </span>
            <span className={cn("rounded-full px-2 py-0.5", anime.date_confirmed ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
              {anime.date_confirmed ? "Confirmada" : "Por confirmar"}
            </span>
            {relative(anime) && <span>{relative(anime)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
