import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth } from "../supabase";

export default defineTool({
  name: "list_transactions",
  title: "List CashFlow transactions",
  description:
    "List the signed-in user's recent Lumens CashFlow transactions (income and expenses). Positive amt is income, negative amt is an expense.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).default(50).describe("Max rows to return."),
    type: z
      .enum(["all", "income", "expense"])
      .default("all")
      .describe("Filter by transaction direction."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, type }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("txs")
      .select("id, name, cat, amt, date, merchant, note, account_id")
      .order("date", { ascending: false })
      .limit(limit);
    if (type === "income") q = q.gt("amt", 0);
    if (type === "expense") q = q.lt("amt", 0);
    const { data, error } = await q;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { transactions: data ?? [] },
    };
  },
});