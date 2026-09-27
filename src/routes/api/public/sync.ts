import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { runSync } from "@/lib/sync/run.server";

export const Route = createFileRoute("/api/public/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const result = await runSync("cron");
        return Response.json(result);
      },
    },
  },
});
