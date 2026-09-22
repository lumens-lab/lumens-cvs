import { createFileRoute } from "@tanstack/react-router";
import html from "@/marketing/privacy.html?raw";

/**
 * Marketing page served as its own server-rendered document so the copy is
 * crawlable at a real URL (no iframe). Source lives in src/marketing/.
 */
export const Route = createFileRoute("/privacy")({
  server: {
    handlers: {
      GET: () =>
        new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=0, must-revalidate",
          },
        }),
    },
  },
});
