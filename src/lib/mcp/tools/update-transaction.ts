import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth } from "../supabase";
import { auditToolCall } from "../audit";

export default defineTool({
  name: "update_transaction",
  title: "Update CashFlow transaction",
  description:
    "Update fields (amount, direction, date, category, note, merchant, name) on one of the signed-in user's Lumens CashFlow transactions. Only the provided fields change.",
  inputSchema: {
    id: z.string().uuid().describe("UUID of the transaction to update."),
    amount: z.number().positive().optional().describe("New positive amount; combine with direction."),
    direction: z
      .enum(["income", "expense"])
      .optional()
      .describe("Direction for the amount. Defaults to the transaction's current direction."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("New ISO date (YYYY-MM-DD)."),
    cat: z.string().min(1).optional().describe("New category name."),
    note: z.string().optional().describe("New note text."),
    merchant: z.string().optional().describe("New merchant name."),
    name: z.string().min(1).optional().describe("New short label."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const sb = supabaseForUser(ctx);

    const { data: existing, error: readErr } = await sb
      .from("txs")
      .select("id, amt")
      .eq("id", input.id)
      .maybeSingle();
    if (readErr) {
      await auditToolCall(ctx, "update_transaction", input, { success: false, detail: readErr.message });
      return { content: [{ type: "text", text: readErr.message }], isError: true };
    }
    if (!existing) {
      await auditToolCall(ctx, "update_transaction", input, { success: false, detail: "not found" });
      return {
        content: [{ type: "text", text: "No transaction found with that id for this user." }],
        isError: true,
      };
    }

    const patch: Record<string, unknown> = {};
    if (input.amount !== undefined || input.direction !== undefined) {
      const dir = input.direction ?? (existing.amt < 0 ? "expense" : "income");
      const magnitude = input.amount ?? Math.abs(existing.amt);
      patch.amt = dir === "expense" ? -Math.abs(magnitude) : Math.abs(magnitude);
    }
    if (input.date !== undefined) patch.date = input.date;
    if (input.cat !== undefined) patch.cat = input.cat;
    if (input.note !== undefined) patch.note = input.note;
    if (input.merchant !== undefined) patch.merchant = input.merchant;
    if (input.name !== undefined) patch.name = input.name;

    if (Object.keys(patch).length === 0) {
      await auditToolCall(ctx, "update_transaction", input, { success: false, detail: "no fields" });
      return { content: [{ type: "text", text: "No fields to update were provided." }], isError: true };
    }

    const { data, error } = await sb.from("txs").update(patch).eq("id", input.id).select().single();
    if (error) {
      await auditToolCall(ctx, "update_transaction", input, { success: false, detail: error.message });
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    await auditToolCall(ctx, "update_transaction", input, { success: true });
    return {
      content: [{ type: "text", text: `Updated transaction ${data.id}` }],
      structuredContent: { transaction: data },
    };
  },
});