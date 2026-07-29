import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth } from "../supabase";
import { auditToolCall } from "../audit";

export default defineTool({
  name: "delete_transaction",
  title: "Delete CashFlow transaction",
  description:
    "Permanently delete one of the signed-in user's Lumens CashFlow transactions by its id. Row-level security ensures only the owner's transactions can be deleted.",
  inputSchema: {
    id: z.string().uuid().describe("UUID of the transaction to delete."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("txs").delete().eq("id", input.id).select();
    if (error) {
      await auditToolCall(ctx, "delete_transaction", input, { success: false, detail: error.message });
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const deleted = (data ?? []).length;
    await auditToolCall(ctx, "delete_transaction", input, {
      success: deleted > 0,
      detail: deleted > 0 ? "deleted" : "no matching row",
    });
    if (!deleted)
      return {
        content: [{ type: "text", text: "No transaction found with that id for this user." }],
        isError: true,
      };
    return {
      content: [{ type: "text", text: `Deleted transaction ${input.id}` }],
      structuredContent: { deleted: data?.[0] },
    };
  },
});