import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauth } from "../supabase";

export default defineTool({
  name: "list_accounts",
  title: "List wallets & accounts",
  description: "List the signed-in user's Lumens wallets/accounts with their configured opening balances.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("accounts").select("*").order("created_at", { ascending: true });
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { accounts: data ?? [] },
    };
  },
});