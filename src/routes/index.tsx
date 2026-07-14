import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "lumens — Money, reimagined." },
      { name: "description", content: "The private, encrypted way to send money, budget your month, and chat with friends. Get the lumens app." },
      { property: "og:title", content: "lumens — Money, reimagined." },
      { property: "og:description", content: "The private, encrypted way to send money, budget your month, and chat with friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingRoute,
});

/**
 * Landing page. The rich marketing HTML lives at `public/marketing.html`
 * (Tailwind CDN + custom fonts + iconify). We render it in a full-viewport
 * iframe so we don't have to fight React hydration for a script-heavy static
 * site. Every CTA in that file links to `/app` which mounts the PWA.
 */
function LandingRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    // Match the marketing page background to avoid a white flash on load.
    return <div style={{ position: "fixed", inset: 0, background: "#0a0a0b" }} />;
  }
  return (
    <iframe
      src="/marketing.html"
      title="lumens"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: 0, background: "#0a0a0b" }}
    />
  );
}