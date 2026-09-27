import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Globe, Bell, Moon, RefreshCw, Rss, Activity, Info, Clock, ShieldCheck } from "lucide-react";
import { Screen } from "@/components/app/TabBar";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { formatStamp, lastSyncQuery } from "@/lib/anime";
import { useSettings } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración | Estrenos de anime" },
      { name: "description", content: "Zona horaria, notificaciones, apariencia y estado de sincronización." },
      { property: "og:title", content: "Configuración | Estrenos de anime" },
      { property: "og:description", content: "Zona horaria, notificaciones y estado del sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Configuracion,
});

function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center gap-3 px-4 py-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/8 text-foreground/80">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-[15px]">{label}</span>
      <div className="text-right text-[14px] text-muted-foreground">{children}</div>
    </div>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      {title && <h2 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>}
      <div className="glass divide-y divide-border overflow-hidden rounded-2xl">{children}</div>
    </section>
  );
}

const zones = typeof Intl !== "undefined" && "supportedValuesOf" in Intl ? (Intl as any).supportedValuesOf("timeZone") as string[] : ["UTC"];

function Configuracion() {
  const { settings, update, timeZone, detectedZone } = useSettings();
  const sync = useQuery(lastSyncQuery);
  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: async () => (await supabase.from("news_sources").select("id, name, enabled").order("name")).data ?? [],
  });

  const toggleNotifications = async (on: boolean): Promise<void> => {
    if (on) {
      if (typeof Notification === "undefined") { toast.error("Este dispositivo no admite notificaciones"); return; }
      const p = await Notification.requestPermission();
      if (p !== "granted") { toast.error("Permiso de notificaciones denegado"); return; }
    }
    update({ notifications: on, lastSeenChange: new Date().toISOString() });
  };

  const run = sync.data;
  const ok = run && run.status === "success";

  return (
    <Screen title="Configuración">
      <Group title="Preferencias">
        <Row icon={Globe} label="Zona horaria">
          <select
            value={settings.timeZone ?? ""}
            onChange={(e) => update({ timeZone: e.target.value || null })}
            className="max-w-[160px] truncate bg-transparent text-right text-[14px] text-muted-foreground outline-none"
          >
            <option value="">Automática ({detectedZone})</option>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </Row>
        <Row icon={Bell} label="Notificaciones">
          <Switch checked={settings.notifications} onCheckedChange={toggleNotifications} />
        </Row>
        <Row icon={Moon} label="Apariencia">
          <select
            value={settings.appearance}
            onChange={(e) => update({ appearance: e.target.value as "dark" | "oled" })}
            className="bg-transparent text-right text-[14px] text-muted-foreground outline-none"
          >
            <option value="dark">Oscuro</option>
            <option value="oled">Negro puro</option>
          </select>
        </Row>
      </Group>

      <Group title="Sincronización">
        <Row icon={RefreshCw} label="Frecuencia">Cada 2 horas</Row>
        <Row icon={Clock} label="Última sincronización">{formatStamp(run?.finished_at, timeZone)}</Row>
        <Row icon={Activity} label="Estado del sistema">
          {run ? (
            <span className={ok ? "text-success" : "text-destructive"}>{ok ? "Sincronización correcta" : "Error de sincronización"}</span>
          ) : "Pendiente"}
        </Row>
      </Group>

      <Group title="Fuentes utilizadas">
        <Row icon={Rss} label="AniList">API estructurada</Row>
        <Row icon={Rss} label="MyAnimeList (Jikan)">Verificación</Row>
        {sources.data?.map((s) => (
          <Row key={s.id} icon={Rss} label={s.name}>{s.enabled ? "Activa" : "Inactiva"}</Row>
        ))}
      </Group>

      <Group title="Información">
        <Row icon={Info} label="Versión">1.0</Row>
        <Row icon={Globe} label="Hora mostrada en">{timeZone}</Row>
      </Group>

      <Link to="/admin" className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        <span className="flex-1">Acceso de administración</span>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </Screen>
  );
}
