import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ChevronLeft, ExternalLink, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { addSource, runManualSync } from "@/lib/admin.functions";
import { AdminVideos } from "@/components/app/AdminVideos";
import { formatStamp } from "@/lib/anime";
import { useSettings } from "@/lib/store";
import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración | Estrenos de anime" },
      { name: "description", content: "Panel de administración de fuentes y sincronización." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administración" },
      { property: "og:description", content: "Panel de administración." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

const input = "w-full rounded-xl bg-foreground/6 px-3 py-2.5 text-[15px] outline-none ring-primary/50 focus:ring-2";

function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="ambient min-h-screen">
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <Link to="/configuracion" className="mb-3 inline-flex items-center gap-1 text-[15px] text-primary">
          <ChevronLeft className="h-4 w-4" /> Configuración
        </Link>
        <h1 className="mb-5 text-[30px] font-bold tracking-tight">Administración</h1>
        {session === undefined ? null : session ? <Gate session={session} /> : <SignIn />}
      </main>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (error) toast.error(error.message);
    else if (mode === "up") toast.success("Revisa tu correo para confirmar la cuenta");
  };
  return (
    <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-5">
      <p className="text-sm text-muted-foreground">Acceso restringido a administradores.</p>
      <input className={input} type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className={input} type="password" placeholder="Contraseña" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-[15px] font-semibold text-primary-foreground disabled:opacity-60">
        {mode === "in" ? "Iniciar sesión" : "Crear cuenta"}
      </button>
      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-[13px] text-muted-foreground">
        {mode === "in" ? "Crear una cuenta" : "Ya tengo cuenta"}
      </button>
    </form>
  );
}

function Gate({ session }: { session: Session }) {
  const qc = useQueryClient();
  const role = useQuery({
    queryKey: ["role", session.user.id],
    queryFn: async () => {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      const { data: exists } = await supabase.rpc("admin_exists");
      return { isAdmin: !!isAdmin, exists: !!exists };
    },
  });
  if (!role.data) return null;
  if (role.data.isAdmin) return <Panel />;
  return (
    <div className="glass space-y-3 rounded-2xl p-5 text-sm">
      <p>Tu cuenta ({session.user.email}) no tiene permisos de administración.</p>
      {!role.data.exists && (
        <button
          onClick={async () => {
            await supabase.rpc("claim_first_admin");
            qc.invalidateQueries({ queryKey: ["role"] });
          }}
          className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"
        >
          Convertirme en el primer administrador
        </button>
      )}
      <button onClick={() => supabase.auth.signOut()} className="block text-muted-foreground">Cerrar sesión</button>
    </div>
  );
}

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

function Panel() {
  const qc = useQueryClient();
  const { timeZone } = useSettings();
  const sync = useServerFn(runManualSync);
  const add = useServerFn(addSource);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", feed_url: "", trust: 2 });

  const runs = useQuery({
    queryKey: ["admin", "runs"],
    queryFn: async () => (await supabase.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(8)).data ?? [],
  });
  const sources = useQuery({
    queryKey: ["admin", "sources"],
    queryFn: async () => (await supabase.from("news_sources").select("*").order("created_at")).data ?? [],
  });
  const pending = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: async () =>
      (await supabase.from("discoveries").select("*, animes(title_english, title_romaji)").in("status", ["pending", "conflict"]).neq("event_type", "verification").order("detected_at", { ascending: false }).limit(30)).data ?? [],
  });
  const recent = useQuery({
    queryKey: ["admin", "recent"],
    queryFn: async () =>
      (await supabase.from("animes").select("id, title_english, title_romaji, created_at, source_name").order("created_at", { ascending: false }).limit(15)).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await sync();
      if (r.skipped) toast.message(r.reason);
      else toast.success(`Sincronización: ${r.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setRunning(false);
      refresh();
      qc.invalidateQueries({ queryKey: ["animes"] });
    }
  };

  return (
    <>
      <Section
        title="Sincronización"
        action={
          <button onClick={runNow} disabled={running} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[13px] font-semibold text-primary-foreground disabled:opacity-60">
            <Play className="h-3.5 w-3.5" /> {running ? "Ejecutando" : "Sincronizar ahora"}
          </button>
        }
      >
        {runs.data?.map((r) => (
          <div key={r.id} className="px-4 py-3 text-[13px]">
            <div className="flex justify-between">
              <span className={r.status === "success" ? "text-success" : r.status === "running" ? "text-muted-foreground" : "text-destructive"}>
                {r.status} · {r.trigger}
              </span>
              <span className="text-muted-foreground">{formatStamp(r.started_at, timeZone)}</span>
            </div>
            <p className="text-muted-foreground">{Object.entries(r.stats as Record<string, number>).map(([k, v]) => `${k}: ${v}`).join(" · ") || "Sin datos"}</p>
            {(r.errors as string[]).map((e, i) => (
              <p key={i} className="text-destructive">{e}</p>
            ))}
          </div>
        ))}
        {!runs.data?.length && <p className="px-4 py-3 text-[13px] text-muted-foreground">Sin sincronizaciones todavía.</p>}
      </Section>

      <Section title="Fuentes de noticias">
        {sources.data?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.name} <span className="text-muted-foreground">· confianza {s.trust}</span></p>
              <p className="truncate text-muted-foreground">{s.feed_url}</p>
              <p className="text-muted-foreground">Revisada: {formatStamp(s.last_checked_at, timeZone)}</p>
              {s.last_error && <p className="text-destructive">{s.last_error}</p>}
            </div>
            <Switch
              checked={s.enabled}
              onCheckedChange={async (v) => {
                await supabase.from("news_sources").update({ enabled: v }).eq("id", s.id);
                refresh();
              }}
            />
            <button
              aria-label="Eliminar fuente"
              onClick={async () => {
                await supabase.from("news_sources").delete().eq("id", s.id);
                refresh();
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <form
          className="space-y-2 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await add({ data: form });
              toast.success(`Fuente añadida (${r.items} publicaciones leídas)`);
              setForm({ name: "", url: "", feed_url: "", trust: 2 });
              refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Error");
            }
          }}
        >
          <input className={input} placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={input} placeholder="URL del sitio" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
          <input className={input} placeholder="URL del feed RSS/Atom" type="url" value={form.feed_url} onChange={(e) => setForm({ ...form, feed_url: e.target.value })} required />
          <select className={input} value={form.trust} onChange={(e) => setForm({ ...form, trust: Number(e.target.value) })}>
            <option value={3}>Confianza alta</option>
            <option value={2}>Confianza media</option>
            <option value={1}>Confianza baja</option>
          </select>
          <button className="w-full rounded-full bg-foreground/10 py-2 text-[14px] font-semibold">Agregar fuente</button>
        </form>
      </Section>

      <Section title="Pendiente de confirmar">
        {pending.data?.map((d) => {
          const info = d.info as { anime_title?: string; summary?: string; date?: string };
          const a = d.animes as { title_english: string | null; title_romaji: string | null } | null;
          return (
            <div key={d.id} className="px-4 py-3 text-[13px]">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{a?.title_english ?? a?.title_romaji ?? info.anime_title ?? d.title}</span>
                <span className={d.status === "conflict" ? "text-warning" : "text-muted-foreground"}>{d.status === "conflict" ? "Conflicto de fecha" : "Sin verificar"}</span>
              </div>
              <p className="text-muted-foreground">{info.summary ?? d.title}{info.date ? ` · ${info.date}` : ""}</p>
              <div className="mt-1 flex items-center gap-3">
                <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
                  {d.source_name} <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  className="text-muted-foreground"
                  onClick={async () => {
                    await supabase.from("discoveries").update({ status: "ignored" }).eq("id", d.id);
                    refresh();
                  }}
                >
                  Descartar
                </button>
              </div>
            </div>
          );
        })}
        {!pending.data?.length && <p className="px-4 py-3 text-[13px] text-muted-foreground">No hay información pendiente.</p>}
      </Section>

      <Section title="Detectados recientemente">
        {recent.data?.map((a) => (
          <div key={a.id} className="flex justify-between px-4 py-2.5 text-[13px]">
            <span className="truncate">{a.title_english ?? a.title_romaji}</span>
            <span className="shrink-0 text-muted-foreground">{formatStamp(a.created_at, timeZone)}</span>
          </div>
        ))}
      </Section>

      <AdminVideos timeZone={timeZone} />

      <button onClick={() => supabase.auth.signOut()} className="text-[14px] text-muted-foreground">Cerrar sesión</button>
    </>
  );
}
