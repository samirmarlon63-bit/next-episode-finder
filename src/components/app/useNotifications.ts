// Client side of the notification system: reads server change events for saved
// titles and shows system notifications when enabled. Events are produced by
// the server sync (anime_changes), so a push provider can be plugged in later.
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CHANGE_LABELS } from "@/lib/anime";
import { useSaved, useSettings } from "@/lib/store";

export function useChangeNotifications() {
  const { ids } = useSaved();
  const { settings, update } = useSettings();

  useEffect(() => {
    if (!settings.notifications || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let cancelled = false;
    const check = async () => {
      const since = settings.lastSeenChange ?? new Date(Date.now() - 3600_000).toISOString();
      const { data } = await supabase
        .from("anime_changes")
        .select("id, kind, anime_id, created_at, new_value, animes(title_english, title_romaji)")
        .gt("created_at", since)
        .order("created_at", { ascending: true })
        .limit(50);
      if (cancelled || !data?.length) return;
      for (const c of data) {
        const relevant = c.kind === "new_anime" || ids.includes(c.anime_id);
        if (!relevant) continue;
        const a = c.animes as { title_english: string | null; title_romaji: string | null } | null;
        new Notification(CHANGE_LABELS[c.kind] ?? "Actualización", { body: a?.title_english ?? a?.title_romaji ?? "" });
      }
      update({ lastSeenChange: data[data.length - 1]!.created_at });
    };
    check();
    const t = setInterval(check, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.notifications, ids.join(",")]);
}
