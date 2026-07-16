import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth } from "../supabase";

export default defineTool({
  name: "monthly_summary",
  title: "Monthly CashFlow summary",
  description:
    "Return total income, total expenses, and net for the signed-in user for a given YYYY-MM month (defaults to current month).",
  inputSchema: {
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .describe("Month in YYYY-MM. Defaults to current month."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ month }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const m = month ?? new Date().toISOString().slice(0, 7);
    const start = `${m}-01`;
    const [y, mo] = m.split("-").map(Number);
    const endDate = new Date(Date.UTC(y, mo, 1));
    const end = endDate.toISOString().slice(0, 10);
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("txs")
      .select("amt, cat")
      .gte("date", start)
      .lt("date", end);
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const income = rows.filter((r) => r.amt > 0 && r.cat !== "__transfer__").reduce((s, r) => s + r.amt, 0);
    const expense = rows.filter((r) => r.amt < 0 && r.cat !== "__transfer__").reduce((s, r) => s + Math.abs(r.amt), 0);
    const summary = { month: m, income, expense, net: income - expense, count: rows.length };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});