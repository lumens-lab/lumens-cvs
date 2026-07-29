import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth } from "../supabase";
import { auditToolCall } from "../audit";

export default defineTool({
  name: "monthly_summary",
  title: "Monthly CashFlow summary",
  description:
    "Return total income, total expenses, net, a per-category breakdown, and cashflow per wallet/account for the signed-in user for a given YYYY-MM month (defaults to current month).",
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
      .select("amt, cat, account_id, to_account_id")
      .gte("date", start)
      .lt("date", end);
    if (error) {
      await auditToolCall(ctx, "monthly_summary", { month: m }, { success: false, detail: error.message });
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    const real = rows.filter((r) => r.cat !== "__transfer__");
    const transfers = rows.filter((r) => r.cat === "__transfer__");
    const income = real.filter((r) => r.amt > 0).reduce((s, r) => s + r.amt, 0);
    const expense = real.filter((r) => r.amt < 0).reduce((s, r) => s + Math.abs(r.amt), 0);

    // Per-category breakdown (transfers excluded).
    const catMap = new Map<string, { category: string; income: number; expense: number; net: number; count: number }>();
    for (const r of real) {
      const key = r.cat ?? "Other";
      const e = catMap.get(key) ?? { category: key, income: 0, expense: 0, net: 0, count: 0 };
      if (r.amt > 0) e.income += r.amt;
      else e.expense += Math.abs(r.amt);
      e.net += r.amt;
      e.count += 1;
      catMap.set(key, e);
    }
    const categories = [...catMap.values()].sort((a, b) => b.expense - a.expense);

    // Cashflow per account, including transfers (out of account_id, into to_account_id).
    const accMap = new Map<string, { account_id: string | null; inflow: number; outflow: number; net: number; count: number }>();
    const acc = (id: string | null) => {
      const key = id ?? "unassigned";
      const e = accMap.get(key) ?? { account_id: id ?? null, inflow: 0, outflow: 0, net: 0, count: 0 };
      accMap.set(key, e);
      return e;
    };
    for (const r of real) {
      const e = acc(r.account_id ?? null);
      if (r.amt > 0) e.inflow += r.amt;
      else e.outflow += Math.abs(r.amt);
      e.net += r.amt;
      e.count += 1;
    }
    for (const r of transfers) {
      const amt = Math.abs(r.amt);
      const from = acc(r.account_id ?? null);
      from.outflow += amt;
      from.net -= amt;
      from.count += 1;
      if (r.to_account_id) {
        const to = acc(r.to_account_id);
        to.inflow += amt;
        to.net += amt;
        to.count += 1;
      }
    }
    const accounts = [...accMap.values()];

    const summary = {
      month: m,
      income,
      expense,
      net: income - expense,
      count: real.length,
      transfer_count: transfers.length,
      categories,
      accounts,
    };
    await auditToolCall(ctx, "monthly_summary", { month: m }, { success: true });
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});