import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTransactions from "./tools/list-transactions";
import createTransaction from "./tools/create-transaction";
import monthlySummary from "./tools/monthly-summary";
import listAccounts from "./tools/list-accounts";

// The OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lumens-mcp",
  title: "Lumens",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in Lumens user: read recent CashFlow transactions, record new income/expenses, view monthly summaries, and list wallets. All tools act as the authenticated user and respect Lumens' row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTransactions, createTransaction, monthlySummary, listAccounts],
});