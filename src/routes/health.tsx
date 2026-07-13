import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

type ProbeStatus = "checking" | "ok" | "error";

type Probe = {
  label: string;
  path: string;
  expected: string;
  status: ProbeStatus;
  detail: string;
};

const INITIAL_PROBES: Probe[] = [
  { label: "Landing page", path: "/", expected: "Marketing landing page", status: "checking", detail: "Waiting for browser check" },
  { label: "App", path: "/app", expected: "Lumens PWA", status: "checking", detail: "Waiting for browser check" },
  { label: "Marketing asset", path: "/marketing.html", expected: "Imported website HTML", status: "checking", detail: "Waiting for browser check" },
  { label: "Health API", path: "/api/health", expected: "JSON health response", status: "checking", detail: "Waiting for browser check" },
];

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Lumens Health — Route Status" },
      { name: "description", content: "Route health status for the Lumens landing page and app." },
    ],
  }),
  component: HealthPage,
});

function HealthPage() {
  const [probes, setProbes] = useState<Probe[]>(INITIAL_PROBES);
  const [healthJson, setHealthJson] = useState<string>("Checking /api/health…");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    let cancelled = false;
    setOrigin(window.location.origin);

    async function runProbe(probe: Probe): Promise<Probe> {
      try {
        const response = await fetch(probe.path, { cache: "no-store" });
        const contentType = response.headers.get("content-type") || "";
        const ok = response.ok;
        let detail = `${response.status} ${response.statusText || "OK"}`.trim();

        if (probe.path === "/api/health") {
          const data = await response.json();
          detail = data?.ok ? "Healthy JSON response" : "JSON response did not report ok";
          if (!cancelled) setHealthJson(JSON.stringify(data, null, 2));
        } else if (probe.path === "/marketing.html") {
          const text = await response.text();
          detail = text.includes("Money, reimagined") || text.includes("lumens")
            ? "Marketing HTML found"
            : "HTML loaded, expected Lumens text missing";
        } else if (contentType.includes("text/html")) {
          detail = "Route returned HTML";
        }

        return { ...probe, status: ok ? "ok" : "error", detail };
      } catch (error) {
        return { ...probe, status: "error", detail: error instanceof Error ? error.message : "Request failed" };
      }
    }

    Promise.all(INITIAL_PROBES.map(runProbe)).then((results) => {
      if (!cancelled) setProbes(results);
    });

    return () => { cancelled = true; };
  }, []);

  const allOk = useMemo(() => probes.every((probe) => probe.status === "ok"), [probes]);

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <section className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Lumens route health</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              {allOk ? "Routes are responding" : "Checking routes"}
            </h1>
          </div>
          <span className="inline-flex w-fit items-center rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground">
            {origin || "Current origin"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {probes.map((probe) => (
            <article key={probe.path} className="rounded-md border border-border bg-card p-5 text-card-foreground">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{probe.label}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{probe.expected}</p>
                </div>
                <StatusPill status={probe.status} />
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Path</dt>
                  <dd className="font-mono">{probe.path}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Result</dt>
                  <dd className="text-right">{probe.detail}</dd>
                </div>
              </dl>
              <a className="mt-5 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href={probe.path}>
                Open {probe.path}
              </a>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-md border border-border bg-card p-5 text-card-foreground">
          <h2 className="text-lg font-semibold">Routing architecture</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><span className="font-mono text-foreground">/</span> serves the marketing landing page.</li>
            <li><span className="font-mono text-foreground">/app</span> serves the full Lumens PWA.</li>
            <li><span className="font-mono text-foreground">/api/health</span> returns machine-readable health JSON.</li>
            <li>This project uses TanStack Start file-based routing; Lovable hosting handles direct loads and refreshes for app routes.</li>
          </ul>
        </section>

        <section className="mt-6 rounded-md border border-border bg-card p-5 text-card-foreground">
          <h2 className="text-lg font-semibold">Health API response</h2>
          <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-muted p-4 text-xs text-muted-foreground">{healthJson}</pre>
        </section>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: ProbeStatus }) {
  const label = status === "ok" ? "OK" : status === "error" ? "Error" : "Checking";
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground">
      {label}
    </span>
  );
}