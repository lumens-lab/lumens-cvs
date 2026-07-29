import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

/** Truncate/scrub tool input so audit metadata stays small and non-sensitive. */
function summarize(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string") out[k] = v.length > 80 ? v.slice(0, 80) + "…" : v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else out[k] = typeof v;
  }
  return out;
}

/**
 * Append an MCP tool call to the tamper-evident `audit_events` chain.
 * Fire-and-forget: audit failures never break the tool response.
 */
export async function auditToolCall(
  ctx: ToolContext,
  tool: string,
  input: unknown,
  result: { success: boolean; detail?: string },
): Promise<void> {
  try {
    if (!ctx.isAuthenticated()) return;
    const sb = supabaseForUser(ctx);
    const { error } = await sb.rpc("audit_log", {
      p_kind: `mcp.tool.${tool}`.slice(0, 64),
      p_meta: {
        tool,
        client_id: ctx.getClientId?.() ?? null,
        user_id: ctx.getUserId?.() ?? null,
        input: summarize(input),
        success: result.success,
        detail: result.detail ? String(result.detail).slice(0, 200) : null,
        at: new Date().toISOString(),
      } as never,
    });
    if (error) console.warn("[mcp/audit] log failed", error.message);
  } catch (err) {
    console.warn("[mcp/audit] log threw", err);
  }
}