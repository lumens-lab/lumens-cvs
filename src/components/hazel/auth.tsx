import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import logo from "@/assets/lumens-logo.png";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setMsg(err.message ?? "Something went wrong");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true); setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setMsg(result.error.message ?? "Google sign-in failed"); setBusy(false); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #ffffff 0%, #dbeafe 50%, #1e40af 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "Montserrat, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: 28,
        padding: 28,
        boxShadow: "0 30px 60px rgba(30,64,175,0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img src={logo} alt="Lumens" style={{ height: 96, objectFit: "contain" }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", color: "#0f1b3d", margin: "0 0 4px" }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p style={{ fontSize: 13, textAlign: "center", color: "#475569", margin: "0 0 20px" }}>
          {mode === "signup" ? "Join Lumens in seconds." : "Sign in to continue."}
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          style={{
            width: "100%", height: 46, borderRadius: 14,
            background: "#ffffff", color: "#1e293b",
            border: "1px solid #e2e8f0", fontWeight: 600, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            cursor: "pointer", marginBottom: 14,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.7l6.3 5.3C41.5 35.7 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", color: "#94a3b8", fontSize: 11 }}>
          <div style={{ flex: 1, height: 1, background: "#cbd5e1" }} /> OR <div style={{ flex: 1, height: 1, background: "#cbd5e1" }} />
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "signup" && (
            <input
              placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} style={inputStyle}
          />
          <input
            type="password" required placeholder="Password" minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle}
          />
          <button
            type="submit" disabled={busy}
            style={{
              height: 46, borderRadius: 14, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #1e40af, #3b82f6)",
              color: "#fff", fontWeight: 700, fontSize: 14, marginTop: 6,
              boxShadow: "0 10px 24px rgba(30,64,175,0.35)",
            }}
          >
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {msg && (
          <p style={{ fontSize: 12, color: "#0f1b3d", textAlign: "center", marginTop: 14 }}>{msg}</p>
        )}

        <p style={{ fontSize: 12, textAlign: "center", color: "#475569", marginTop: 18 }}>
          {mode === "signup" ? "Already have an account?" : "New to Lumens?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(null); }}
            style={{ background: "none", border: "none", color: "#1e40af", fontWeight: 700, cursor: "pointer" }}
          >
            {mode === "signup" ? "Sign in" : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 12, border: "1px solid #cbd5e1",
  padding: "0 14px", fontSize: 14, background: "rgba(255,255,255,0.7)",
  color: "#0f1b3d", outline: "none", fontFamily: "Montserrat, sans-serif",
};