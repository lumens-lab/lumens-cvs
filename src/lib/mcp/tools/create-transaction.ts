import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth } from "../supabase";

export default defineTool({
  name: "create_transaction",
  title: "Create CashFlow transaction",
  description:
    "Record a new income or expense in the signed-in user's Lumens CashFlow. Amount is always positive; direction chooses income vs expense.",
  inputSchema: {
    name: z.string().min(1).describe("Short label, e.g. 'Groceries'."),
    amount: z.number().positive().describe("Positive amount in the user's currency."),
    direction: z.enum(["income", "expense"]).describe("income or expense"),
    cat: z.string().default("Other").describe("Category name."),
    date: z
      .string()
      .describe("ISO date, e.g. 2026-07-16. Defaults to today.")
      .optional(),
    note: z.string().optional(),
    merchant: z.string().optional(),
    account_id: z.string().uuid().optional().describe("Wallet/account UUID."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const sb = supabaseForUser(ctx);
    const amt = input.direction === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount);
    const row = {
      user_id: ctx.getUserId()!,
      name: input.name,
      amt,
      cat: input.cat,
      icon: "Wallet",
      date: input.date ?? new Date().toISOString().slice(0, 10),
      note: input.note ?? null,
      merchant: input.merchant ?? null,
      account_id: input.account_id ?? null,
    };
    const { data, error } = await sb.from("txs").insert(row).select().single();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created transaction ${data.id}` }],
      structuredContent: { transaction: data },
    };
  },
});