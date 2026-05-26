import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/lumens-logo.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Lumens" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 6) return setMsg("Password must be at least 6 characters.");
    if (pw !== pw2) return setMsg("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg("Password updated. Redirecting…");
    setTimeout(() => nav({ to: "/" }), 1200);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#ffffff 0%,#dbeafe 50%,#1e40af 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "Montserrat, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, padding: 28, borderRadius: 28,
        background: "rgba(255,255,255,0.55)", backdropFilter: "blur(22px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 30px 60px rgba(30,64,175,0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img src={logo} alt="Lumens" style={{ height: 156, objectFit: "contain" }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", color: "#0f1b3d", margin: "0 0 16px" }}>
          Set a new password
        </h1>
        {!ready ? (
          <p style={{ fontSize: 13, textAlign: "center", color: "#475569" }}>Waiting for reset link…</p>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="password" required minLength={6} placeholder="New password" value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ height: 44, borderRadius: 12, border: "1px solid #cbd5e1", padding: "0 14px", fontSize: 14, background: "rgba(255,255,255,0.7)", color: "#0f1b3d", outline: "none" }} />
            <input type="password" required minLength={6} placeholder="Confirm new password" value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              style={{ height: 44, borderRadius: 12, border: "1px solid #cbd5e1", padding: "0 14px", fontSize: 14, background: "rgba(255,255,255,0.7)", color: "#0f1b3d", outline: "none" }} />
            <button type="submit" disabled={busy} style={{
              height: 46, borderRadius: 14, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#1e40af,#3b82f6)",
              color: "#fff", fontWeight: 700, fontSize: 14, marginTop: 6,
              boxShadow: "0 10px 24px rgba(30,64,175,0.35)",
            }}>{busy ? "Updating…" : "Update password"}</button>
          </form>
        )}
        {msg && <p style={{ fontSize: 12, color: "#0f1b3d", textAlign: "center", marginTop: 14 }}>{msg}</p>}
      </div>
    </div>
  );
}