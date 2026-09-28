import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const runManualSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runSync } = await import("./sync/run.server");
    return runSync("manual");
  });

export const runManualVideoSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runVideoSync } = await import("./sync/videos.server");
    return runVideoSync("videos-manual");
  });

export const addSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ name: z.string().min(2).max(80), url: z.string().url(), feed_url: z.string().url(), trust: z.number().int().min(1).max(3) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { fetchFeed } = await import("./sync/news.server");
    const items = await fetchFeed(data.feed_url).catch((e) => {
      throw new Error(`No se pudo leer el feed: ${e.message}`);
    });
    if (!items.length) throw new Error("El feed no contiene publicaciones legibles");
    const { error } = await context.supabase.from("news_sources").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true, items: items.length };
  });
