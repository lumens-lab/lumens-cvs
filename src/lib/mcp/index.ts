import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTransactions from "./tools/list-transactions";
import createTransaction from "./tools/create-transaction";
import monthlySummary from "./tools/monthly-summary";
import listAccounts from "./tools/list-accounts";
import updateTransaction from "./tools/update-transaction";
import deleteTransaction from "./tools/delete-transaction";

// The OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lumens-mcp",
  title: "Lumens",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in Lumens user: read recent CashFlow transactions, record, update and delete income/expenses, view monthly summaries with category and account breakdowns, and list wallets. All tools act as the authenticated user, respect Lumens' row-level security, and are recorded in the tamper-evident audit log.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    monthlySummary,
    listAccounts,
  ],
});