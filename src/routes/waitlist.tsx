import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Get early access to lumens" },
      { name: "description", content: "lumens is in private beta. Join the list and we'll let you know the moment your account is ready." },
      { property: "og:title", content: "Get early access to lumens" },
      { property: "og:description", content: "Join the lumens private beta list and get notified when access opens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WaitlistRoute,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().max(32, "Phone number is too long").optional().or(z.literal("")),
  country: z.string().trim().max(64).optional().or(z.literal("")),
  note: z.string().trim().max(500, "Keep it under 500 characters").optional().or(z.literal("")),
});

const field: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

function WaitlistRoute() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "", note: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    const v = parsed.data;
    const { error } = await supabase.from("waitlist_signups").insert({
      name: v.name,
      email: v.email.toLowerCase(),
      phone: v.phone || null,
      country: v.country || null,
      note: v.note || null,
    });
    setBusy(false);
    if (error) { setErr("Something went wrong. Please try again."); return; }
    setDone(true);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0b", color: "#fff", display: "flex", justifyContent: "center", padding: "48px 20px 80px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <Link to="/" style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "none" }}>← Back to lumens</Link>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "22px 0 8px" }}>Get early access</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, marginBottom: 26 }}>
          lumens is in private beta. Leave your details and we'll notify you the moment your account is ready.
        </p>

        {done ? (
          <div style={{ borderRadius: 18, padding: 22, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>You're on the list</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.6 }}>
              Thanks {form.name.split(" ")[0]}. We'll email {form.email.toLowerCase()} as soon as access opens.
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <input style={field} placeholder="Full name" value={form.name} onChange={upd("name")} maxLength={100} autoComplete="name" />
            <input style={field} placeholder="Email address" type="email" value={form.email} onChange={upd("email")} maxLength={255} autoComplete="email" />
            <input style={field} placeholder="Phone (optional)" value={form.phone} onChange={upd("phone")} maxLength={32} autoComplete="tel" />
            <input style={field} placeholder="Country (optional)" value={form.country} onChange={upd("country")} maxLength={64} />
            <textarea style={{ ...field, minHeight: 92, resize: "vertical" }} placeholder="What would you use lumens for? (optional)" value={form.note} onChange={upd("note")} maxLength={500} />
            {err && <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div>}
            <button type="submit" disabled={busy} style={{ padding: 15, borderRadius: 14, border: "none", background: "#2563eb", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Sending…" : "Notify me"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 26, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          Already have access? <a href="/app" style={{ color: "#60a5fa", textDecoration: "none", fontWeight: 600 }}>Open the app →</a>
        </div>
      </div>
    </main>
  );
}