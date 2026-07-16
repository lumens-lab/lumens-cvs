import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Minimal typed wrapper — the auth.oauth namespace is beta.
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResp = { data: OAuthDetails | null; error: { message: string } | null };
const oauthApi = () => (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResp>;
    approveAuthorization: (id: string) => Promise<OAuthResp>;
    denyAuthorization: (id: string) => Promise<OAuthResp>;
  };
}).oauth;

function safeNext(loc: { pathname: string; searchStr: string }) {
  const p = loc.pathname + loc.searchStr;
  return p.startsWith("/") && !p.startsWith("//") ? p : "/app";
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Send to the app; it reads ?next= after auth and returns here.
      const next = safeNext(location);
      throw redirect({
        to: "/app",
        search: { next } as Record<string, string>,
      });
    }
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main style={{ padding: 24, color: "#fff", background: "#001535", minHeight: "100vh" }}>
      <h1>Authorization error</h1>
      <p>{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as OAuthDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setErr(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setErr(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setErr("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";
  const wrap: React.CSSProperties = {
    minHeight: "100vh", background: "#001535", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    fontFamily: "Montserrat, system-ui, sans-serif",
  };
  const card: React.CSSProperties = {
    maxWidth: 440, width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28,
  };
  const btn = (primary: boolean): React.CSSProperties => ({
    flex: 1, padding: 14, borderRadius: 12, border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: 14,
    background: primary ? "#2563eb" : "rgba(255,255,255,0.08)",
    color: primary ? "#fff" : "#fff", opacity: busy ? 0.6 : 1,
  });

  return (
    <main style={wrap}>
      <div style={card}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Connect {clientName} to Lumens</h1>
        <p style={{ opacity: 0.75, marginTop: 12, fontSize: 14, lineHeight: 1.5 }}>
          {clientName} will be able to use Lumens tools while you're signed in — read your recent CashFlow, add transactions, and view summaries. It cannot bypass Lumens' permissions.
        </p>
        {details?.client?.redirect_uri && (
          <p style={{ opacity: 0.5, fontSize: 12, wordBreak: "break-all", marginTop: 8 }}>
            Redirect: {details.client.redirect_uri}
          </p>
        )}
        {err && <p role="alert" style={{ color: "#fca5a5", fontSize: 13 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button disabled={busy} onClick={() => decide(false)} style={btn(false)}>Deny</button>
          <button disabled={busy} onClick={() => decide(true)} style={btn(true)}>Approve</button>
        </div>
      </div>
    </main>
  );
}