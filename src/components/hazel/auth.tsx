import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import logo from "@/assets/lumens-logo.png";

type Step = "signin" | "s1" | "s2" | "forgot" | "success";

/**
 * Multi-step signup + sign-in flow rebuilt to match the dark-navy design
 * from the lumens reference HTML. Renders after PIN is created.
 */
export function AuthScreen() {
  const [step, setStep] = useState<Step>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const pwScore = (p: string) =>
    [p.length >= 8, /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;

  const oauth = async (provider: "google" | "apple") => {
    setBusy(true); setErr(null);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) { setErr(r.error.message ?? `${provider} sign-in failed`); setBusy(false); }
  };

  const nextFromS1 = () => {
    setErr(null);
    if (name.trim().length < 2) return setErr("Please enter your full name");
    if (!emailRe.test(email.trim())) return setErr("Please enter a valid email");
    setStep("s2");
  };

  const completeSignup = async () => {
    setErr(null);
    if (password.length < 8) return setErr("Password must be at least 8 characters");
    if (password !== confirm) return setErr("Passwords don't match");
    if (!terms) return setErr("Please accept the Terms of Service");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
      });
      if (error) throw error;
      setStep("success");
    } catch (e: any) {
      setErr(e.message ?? "Sign up failed");
    } finally { setBusy(false); }
  };

  const signin = async () => {
    setErr(null);
    if (!emailRe.test(email.trim())) return setErr("Please enter a valid email");
    if (!password) return setErr("Enter your password");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (e: any) {
      setErr(e.message ?? "Sign in failed");
    } finally { setBusy(false); }
  };

  const forgot = async () => {
    setErr(null);
    if (!emailRe.test(email.trim())) return setErr("Enter your email first");
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setErr("Check your email for a reset link.");
    } catch (e: any) { setErr(e.message ?? "Reset failed"); }
    finally { setBusy(false); }
  };

  return (
    <div style={shellStyle}>
      <style>{css}</style>
      <div style={{ width: "100%", maxWidth: 440, position: "relative", padding: "max(56px, env(safe-area-inset-top)) 24px max(36px, env(safe-area-inset-bottom))", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        {step === "signin" && (
          <Section eyebrow="Welcome back" title="Sign in to\nlumens" subtitle="Good to see you again.">
            <Field label="Email address">
              <input style={inp} placeholder="you@example.com" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" right={<a onClick={forgot} style={linkA}>Forgot?</a>}>
              <PwInput value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw((s) => !s)} placeholder="Your password" autoComplete="current-password" />
            </Field>
            <Divider text="or continue with" />
            <SocialRow onGoogle={() => oauth("google")} onApple={() => oauth("apple")} busy={busy} />
            <Cta onClick={signin} busy={busy}>Sign in →</Cta>
            {err && <Err>{err}</Err>}
            <Sub>New to lumens? <a onClick={() => { setStep("s1"); setErr(null); }} style={linkA}>Create account</a></Sub>
          </Section>
        )}

        {step === "s1" && (
          <Section eyebrow="Create account" title="Join lumens" subtitle="Private by default. Yours forever." progress={33} step="STEP 1/2" onBack={() => setStep("signin")}>
            <Field label="Full name">
              <input style={inp} placeholder="Your full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email address">
              <input style={inp} placeholder="you@example.com" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Divider text="or sign up with" />
            <SocialRow onGoogle={() => oauth("google")} onApple={() => oauth("apple")} busy={busy} />
            <Cta onClick={nextFromS1} busy={busy}>Continue →</Cta>
            {err && <Err>{err}</Err>}
            <Sub>Already have an account? <a onClick={() => { setStep("signin"); setErr(null); }} style={linkA}>Sign in</a></Sub>
          </Section>
        )}

        {step === "s2" && (
          <Section eyebrow="Security" title="Create a\nstrong password" subtitle="Use a mix of letters, numbers, and symbols." progress={100} step="STEP 2/2" onBack={() => setStep("s1")}>
            <Field label="Password">
              <PwInput value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw((s) => !s)} placeholder="Enter password" autoComplete="new-password" />
            </Field>
            <PwStrength score={pwScore(password)} />
            <Field label="Confirm password">
              <PwInput value={confirm} onChange={setConfirm} show={showPw} toggle={() => setShowPw((s) => !s)} placeholder="Confirm password" autoComplete="new-password" />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "rgba(160,200,255,0.7)", marginTop: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#0055ff" }} />
              I agree to the <a style={linkA}>Terms</a> and <a style={linkA}>Privacy Policy</a>
            </label>
            <Cta onClick={completeSignup} busy={busy}>Create account →</Cta>
            {err && <Err>{err}</Err>}
          </Section>
        )}

        {step === "success" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 18 }}>
            <img src={logo} alt="Lumens" style={{ width: 300, height: "auto", filter: "drop-shadow(0 0 20px rgba(80,150,255,0.6))" }} />
            <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>You're in! 🎉</h1>
            <p style={{ color: "rgba(160,200,255,0.7)", fontSize: 14, maxWidth: 320, lineHeight: 1.6 }}>
              Welcome to lumens. Check your email to confirm your account, then sign in to continue.
            </p>
            <button onClick={() => setStep("signin")} style={ctaStyle}>Open lumens →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── building blocks ──────────────────────────────────────────────── */

function Section({ eyebrow, title, subtitle, progress, step, onBack, children }: any) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {onBack && (
        <button onClick={onBack} style={backBtn} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(160,200,255,0.8)" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      {progress != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 48, marginRight: 8, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(100,160,255,0.15)", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #0055ff, #2a9fff)", transition: "width .4s" }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(160,200,255,0.55)", letterSpacing: "1px" }}>{step}</div>
        </div>
      )}
      <div style={{ marginTop: progress != null ? 0 : 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#2a9fff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>{eyebrow}</div>
        <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, whiteSpace: "pre-line" }}>{String(title).replace(/\\n/g, "\n")}</h1>
        <p style={{ color: "rgba(160,200,255,0.65)", fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>{subtitle}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 28, flex: 1 }}>{children}</div>
    </div>
  );
}

function Field({ label, right, children }: any) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(160,200,255,0.7)", letterSpacing: "0.3px" }}>{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function PwInput({ value, onChange, show, toggle, placeholder, autoComplete }: any) {
  return (
    <div style={{ position: "relative" }}>
      <input style={{ ...inp, paddingRight: 44 }} type={show ? "text" : "password"} placeholder={placeholder} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={toggle} aria-label="Toggle password" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(160,200,255,0.6)", cursor: "pointer", padding: 6 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>
    </div>
  );
}

function PwStrength({ score }: { score: number }) {
  const labels = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: -4 }}>
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? colors[score] : "rgba(100,160,255,0.15)" }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontWeight: 700 }}>{labels[score]}</span>
    </div>
  );
}

function Divider({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(160,200,255,0.4)", fontSize: 11, fontWeight: 600, letterSpacing: "0.3px", margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(100,160,255,0.15)" }} />
      {text}
      <div style={{ flex: 1, height: 1, background: "rgba(100,160,255,0.15)" }} />
    </div>
  );
}

function SocialRow({ onGoogle, onApple, busy }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <button disabled={busy} onClick={onGoogle} style={socialBtn}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
        Google
      </button>
      <button disabled={busy} onClick={onApple} style={socialBtn}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(180,215,255,0.95)"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.52-1.31 3.02-2.54 4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
        Apple
      </button>
    </div>
  );
}

function Cta({ onClick, busy, children }: any) {
  return (
    <button onClick={onClick} disabled={busy} style={ctaStyle}>
      {busy ? "Please wait…" : children}
    </button>
  );
}

function Sub({ children }: any) {
  return <div style={{ textAlign: "center", color: "rgba(160,200,255,0.55)", fontSize: 13, marginTop: 14 }}>{children}</div>;
}

function Err({ children }: any) {
  return <div style={{ color: "#fca5a5", fontSize: 12, textAlign: "center", marginTop: 8 }}>{children}</div>;
}

/* ── styles ───────────────────────────────────────────────────────── */

const shellStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(ellipse at 50% 30%, #05165a 0%, #030a2e 60%)",
  display: "flex",
  justifyContent: "center",
  fontFamily: "Montserrat, sans-serif",
};

const inp: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  border: "1px solid rgba(100,160,255,0.18)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  fontSize: 14,
  padding: "0 14px",
  outline: "none",
  fontFamily: "inherit",
  WebkitAppearance: "none",
};

const ctaStyle: React.CSSProperties = {
  width: "100%",
  height: 52,
  borderRadius: 16,
  border: "none",
  background: "linear-gradient(135deg, #0055ff, #0033cc)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 28px rgba(0,80,255,0.45)",
  marginTop: 18,
  fontFamily: "inherit",
};

const socialBtn: React.CSSProperties = {
  height: 48,
  borderRadius: 14,
  border: "1px solid rgba(100,160,255,0.18)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(220,235,255,0.9)",
  fontSize: 13,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontFamily: "inherit",
};

const backBtn: React.CSSProperties = {
  position: "absolute",
  top: 14,
  left: 0,
  width: 38,
  height: 38,
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(100,160,255,0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const linkA: React.CSSProperties = {
  color: "#2a9fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 12,
  textDecoration: "none",
};

const css = `
  input::placeholder { color: rgba(160,200,255,0.4); }
  input:focus { border-color: #0055ff !important; background: rgba(0,80,255,0.06) !important; }
`;