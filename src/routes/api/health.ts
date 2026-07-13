import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return Response.json(
          {
            ok: true,
            service: "lumens",
            router: "TanStack Start file routes",
            origin,
            routes: {
              landing: {
                path: "/",
                expected: "marketing landing page",
                source: "/marketing.html",
              },
              app: {
                path: "/app",
                expected: "Lumens PWA app",
              },
            },
            notes: [
              "This project serves the landing page at / and the app at /app.",
              "Deep routes are handled by TanStack Start/Lovable hosting, not a React Router index.html fallback.",
            ],
            checked_at: new Date().toISOString(),
          },
          {
            headers: {
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});