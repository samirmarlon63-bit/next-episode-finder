import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { runManualVideoSync, scanVideoProvider } from "@/lib/admin.functions";
import { formatStamp } from "@/lib/anime";

const input = "w-full rounded-xl bg-foreground/6 px-3 py-2.5 text-[15px] outline-none ring-primary/50 focus:ring-2";

const KINDS: Record<string, { label: string; hint: string }> = {
  youtube_playlist: { label: "Lista de YouTube", hint: "URL o ID de una lista oficial (list=PL...)" },
  youtube_channel: { label: "Canal de YouTube", hint: "ID del canal oficial (UC...)" },
  rss: { label: "Feed RSS/Atom", hint: "URL del feed de un distribuidor autorizado" },
  json: { label: "API JSON", hint: 'URL + configuración, p. ej. {"itemsPath":"data.episodes","titleField":"title","urlField":"url"}' },
};

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className="glass divide-y divide-border overflow-hidden rounded-2xl">{children}</div>
    </section>
  );
}

function detectKind(url: string) {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/\.(mp4|m3u8|webm)(\?|$)/i.test(url)) return "video";
  return "external";
}

export function AdminVideos({ timeZone }: { timeZone: string }) {
  const qc = useQueryClient();
  const syncAll = useServerFn(runManualVideoSync);
  const scanOne = useServerFn(scanVideoProvider);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "v"] });
    qc.invalidateQueries({ queryKey: ["videos"] });
  };

  const animes = useQuery({
    queryKey: ["admin", "v", "animes"],
    queryFn: async () => (await supabase.from("video_animes").select("*, video_episodes(count)").order("title")).data ?? [],
  });
  const providers = useQuery({
    queryKey: ["admin", "v", "providers"],
    queryFn: async () => (await supabase.from("video_providers").select("*, video_animes(title)").order("created_at")).data ?? [],
  });
  const detected = useQuery({
    queryKey: ["admin", "v", "detected"],
    queryFn: async () =>
      (await supabase.from("video_sources").select("id, label, url, created_at, video_episodes(number, video_animes(title))").not("provider_id", "is", null).order("created_at", { ascending: false }).limit(25)).data ?? [],
  });

  const [a, setA] = useState({ title: "", cover_url: "", synopsis: "", status: "airing" });
  const [p, setP] = useState({ name: "", kind: "youtube_playlist", url: "", video_anime_id: "", config: "" });
  const [e, setE] = useState({ video_anime_id: "", number: "", label: "", url: "" });

  const runAll = async () => {
    setBusy("all");
    try {
      const r = await syncAll();
      if (r.skipped) toast.message(r.reason);
      else toast.success(`Escaneo: ${r.stats.episodes_new} capítulos nuevos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(null);
      refresh();
    }
  };

  return (
    <>
      <Section title="Videos · animes">
        {animes.data?.map((v) => (
          <div key={v.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
            {v.cover_url ? <img src={v.cover_url} alt="" className="h-12 w-9 rounded-md object-cover" /> : <div className="h-12 w-9 rounded-md bg-foreground/10" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{v.title}</p>
              <p className="text-muted-foreground">{(v.video_episodes as unknown as { count: number }[])[0]?.count ?? 0} capítulos · revisado {formatStamp(v.last_synced_at, timeZone)}</p>
              {v.last_sync_error && <p className="text-destructive">{v.last_sync_error}</p>}
            </div>
            <select
              className="rounded-lg bg-foreground/6 px-2 py-1 text-[12px]"
              value={v.status}
              onChange={async (ev) => {
                await supabase.from("video_animes").update({ status: ev.target.value }).eq("id", v.id);
                refresh();
              }}
            >
              <option value="airing">En emisión</option>
              <option value="finished">Finalizado</option>
            </select>
            <button
              aria-label="Cambiar portada"
              className="text-[12px] text-primary"
              onClick={async () => {
                const url = window.prompt("URL de la portada", v.cover_url ?? "");
                if (url === null) return;
                await supabase.from("video_animes").update({ cover_url: url || null }).eq("id", v.id);
                refresh();
              }}
            >
              Portada
            </button>
            <button
              aria-label="Eliminar anime"
              className="text-muted-foreground hover:text-destructive"
              onClick={async () => {
                if (!window.confirm(`¿Eliminar ${v.title} y sus capítulos?`)) return;
                await supabase.from("video_animes").delete().eq("id", v.id);
                refresh();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <form
          className="space-y-2 p-4"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const { error } = await supabase.from("video_animes").insert({ title: a.title, cover_url: a.cover_url || null, synopsis: a.synopsis || null, status: a.status });
            if (error) { toast.error(error.message); return; }
            toast.success("Anime agregado");
            setA({ title: "", cover_url: "", synopsis: "", status: "airing" });
            refresh();
          }}
        >
          <input className={input} placeholder="Nombre del anime" value={a.title} onChange={(ev) => setA({ ...a, title: ev.target.value })} required />
          <input className={input} placeholder="URL de la portada (opcional)" type="url" value={a.cover_url} onChange={(ev) => setA({ ...a, cover_url: ev.target.value })} />
          <textarea className={input} rows={2} placeholder="Sinopsis (opcional)" value={a.synopsis} onChange={(ev) => setA({ ...a, synopsis: ev.target.value })} />
          <button className="w-full rounded-full bg-foreground/10 py-2 text-[14px] font-semibold">Agregar anime</button>
        </form>
      </Section>

      <Section
        title="Videos · fuentes automáticas"
        action={
          <button onClick={runAll} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[13px] font-semibold text-primary-foreground disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${busy === "all" ? "animate-spin" : ""}`} /> Escanear todo
          </button>
        }
      >
        {providers.data?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {s.name} <span className="text-muted-foreground">· {KINDS[s.kind]?.label ?? s.kind}</span>
              </p>
              <p className="truncate text-muted-foreground">{s.url}</p>
              <p className="text-muted-foreground">
                {(s.video_animes as { title: string } | null)?.title ?? "Detecta el anime por el título"} · {formatStamp(s.last_scan_at, timeZone)}
              </p>
              {s.last_scan_message && <p className={s.last_scan_status === "error" ? "text-destructive" : "text-muted-foreground"}>{s.last_scan_message}</p>}
            </div>
            <button
              aria-label="Escanear ahora"
              disabled={!!busy}
              className="text-primary disabled:opacity-50"
              onClick={async () => {
                setBusy(s.id);
                try {
                  const r = await scanOne({ data: { id: s.id } });
                  if (r.ok) toast.success(`${r.added} capítulos nuevos`);
                  else toast.error(r.error);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Error");
                } finally {
                  setBusy(null);
                  refresh();
                }
              }}
            >
              <RefreshCw className={`h-4 w-4 ${busy === s.id ? "animate-spin" : ""}`} />
            </button>
            <Switch
              checked={s.enabled}
              onCheckedChange={async (val) => {
                await supabase.from("video_providers").update({ enabled: val }).eq("id", s.id);
                refresh();
              }}
            />
            <button
              aria-label="Eliminar fuente"
              className="text-muted-foreground hover:text-destructive"
              onClick={async () => {
                if (!window.confirm("¿Eliminar la fuente y los enlaces que encontró?")) return;
                await supabase.from("video_providers").delete().eq("id", s.id);
                refresh();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <form
          className="space-y-2 p-4"
          onSubmit={async (ev) => {
            ev.preventDefault();
            let config = {};
            if (p.config.trim()) {
              try {
                config = JSON.parse(p.config);
              } catch {
                toast.error("La configuración no es un JSON válido"); return;
              }
            }
            const { data, error } = await supabase
              .from("video_providers")
              .insert({ name: p.name, kind: p.kind, url: p.url, video_anime_id: p.video_anime_id || null, config })
              .select("id")
              .single();
            if (error) { toast.error(error.message); return; }
            setP({ name: "", kind: "youtube_playlist", url: "", video_anime_id: "", config: "" });
            refresh();
            toast.message("Fuente agregada, escaneando...");
            try {
              const r = await scanOne({ data: { id: data.id } });
              if (r.ok) toast.success(`${r.found} capítulos reconocidos, ${r.added} nuevos`);
              else toast.error(r.error);
            } finally {
              refresh();
            }
          }}
        >
          <p className="text-[12px] text-muted-foreground">Solo canales oficiales, distribuidores con licencia o contenido propio.</p>
          <input className={input} placeholder="Nombre (p. ej. Muse Asia)" value={p.name} onChange={(ev) => setP({ ...p, name: ev.target.value })} required />
          <select className={input} value={p.kind} onChange={(ev) => setP({ ...p, kind: ev.target.value })}>
            {Object.entries(KINDS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input className={input} placeholder={KINDS[p.kind]!.hint} value={p.url} onChange={(ev) => setP({ ...p, url: ev.target.value })} required />
          <select className={input} value={p.video_anime_id} onChange={(ev) => setP({ ...p, video_anime_id: ev.target.value })}>
            <option value="">Detectar el anime por el título</option>
            {animes.data?.map((v) => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
          <textarea
            className={`${input} font-mono text-[12px]`}
            rows={2}
            placeholder='Configuración opcional (JSON), p. ej. {"episodeRegex":"Ep\\s*(\\d+)"}'
            value={p.config}
            onChange={(ev) => setP({ ...p, config: ev.target.value })}
          />
          <button className="w-full rounded-full bg-foreground/10 py-2 text-[14px] font-semibold">Agregar y escanear</button>
        </form>
      </Section>

      <Section title="Videos · capítulo manual">
        <form
          className="space-y-2 p-4"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const { data: ep, error } = await supabase
              .from("video_episodes")
              .upsert({ video_anime_id: e.video_anime_id, number: Number(e.number) }, { onConflict: "video_anime_id,number" })
              .select("id")
              .single();
            if (error) { toast.error(error.message); return; }
            const { error: e2 } = await supabase.from("video_sources").insert({ episode_id: ep.id, label: e.label || "Oficial", kind: detectKind(e.url), url: e.url });
            if (e2) { toast.error(e2.message); return; }
            await supabase.from("video_animes").update({ updated_at: new Date().toISOString() }).eq("id", e.video_anime_id);
            toast.success("Capítulo agregado");
            setE({ ...e, number: String(Number(e.number) + 1), url: "" });
            refresh();
          }}
        >
          <select className={input} value={e.video_anime_id} onChange={(ev) => setE({ ...e, video_anime_id: ev.target.value })} required>
            <option value="">Elige el anime</option>
            {animes.data?.map((v) => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input className={`${input} w-24`} placeholder="Nº" type="number" step="0.5" min="0" value={e.number} onChange={(ev) => setE({ ...e, number: ev.target.value })} required />
            <input className={input} placeholder="Nombre del enlace (p. ej. Crunchyroll)" value={e.label} onChange={(ev) => setE({ ...e, label: ev.target.value })} />
          </div>
          <input className={input} placeholder="URL (YouTube, video propio .mp4 o plataforma oficial)" type="url" value={e.url} onChange={(ev) => setE({ ...e, url: ev.target.value })} required />
          <button className="w-full rounded-full bg-foreground/10 py-2 text-[14px] font-semibold">Agregar capítulo</button>
        </form>
      </Section>

      <Section title="Videos · detectados recientemente">
        {detected.data?.map((d) => {
          const ep = d.video_episodes as { number: number; video_animes: { title: string } | null } | null;
          return (
            <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <div className="min-w-0 flex-1">
                <p className="truncate">{ep?.video_animes?.title} · Cap. {ep?.number}</p>
                <p className="text-muted-foreground">{d.label} · {formatStamp(d.created_at, timeZone)}</p>
              </div>
              <button
                aria-label="Borrar enlace"
                className="text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  await supabase.from("video_sources").delete().eq("id", d.id);
                  refresh();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        {!detected.data?.length && <p className="px-4 py-3 text-[13px] text-muted-foreground">Aún no hay capítulos detectados.</p>}
      </Section>
    </>
  );
}
