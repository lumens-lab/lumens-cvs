import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  imageDataUrl: z
    .string()
    .min(64)
    .max(8_500_000)
    .regex(/^data:image\/(png|jpe?g|webp|heic|heif);base64,/i, "Must be a base64 image data URL"),
});

const ReceiptSchema = z.object({
  merchant: z.string().max(200).nullable().optional(),
  total: z.number().nullable().optional(),
  date: z.string().max(40).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  items: z
    .array(z.object({ name: z.string().max(200), amt: z.number() }))
    .max(200)
    .nullable()
    .optional(),
});

/**
 * Receipt OCR via Lovable AI Gateway (Gemini vision).
 * Returns a strict structured object; on parse failure returns nulls.
 */
export const scanReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const prompt =
      "Extract structured data from this receipt image. Return STRICT JSON only — no markdown, no commentary. " +
      "Schema: { merchant: string | null, total: number | null, date: string | null (YYYY-MM-DD), currency: string | null (ISO code or symbol), items: [{name: string, amt: number}] | null }. " +
      "Use null for any field you can't confidently extract. Total is the grand total (after tax). Items are line items only.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${body.slice(0, 200)}`);
    }

    const json: any = await res.json().catch(() => null);
    const raw: string = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const safe = ReceiptSchema.safeParse(parsed);
    if (!safe.success) {
      return { merchant: null, total: null, date: null, currency: null, items: null };
    }
    return safe.data;
  });