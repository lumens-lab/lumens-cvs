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
  if (!mounted) return null;
  return <HazelApp />;
}