import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { runVideoSync } from "@/lib/sync/videos.server";

export const Route = createFileRoute("/api/public/sync-videos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        return Response.json(await runVideoSync("videos-cron"));
      },
    },
  },
});
