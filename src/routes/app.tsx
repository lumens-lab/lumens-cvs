import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HazelApp } from "./index";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Lumens App — Pay, budget, chat" },
      { name: "description", content: "Lumens: send money, budget your month and chat with friends." },
    ],
  }),
  component: AppRouteComponent,
});

// Client-only render — HazelApp reads localStorage, window, and browser-only
// integrations (Supabase auth, service worker) that crash during SSR.
function AppRouteComponent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <AppBootFallback />;
  return <HazelApp />;
}

function AppBootFallback() {
  return (
    <main data-health-route="app" className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lumens app</p>
        <h1 className="mt-3 text-2xl font-semibold">Loading your wallet</h1>
        <div className="mx-auto mt-6 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </main>
  );
}