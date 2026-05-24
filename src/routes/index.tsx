import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Ic, T, COLORS } from "@/components/hazel/ui";
import {
  HomeScreen,
  BudgetScreen,
  CatDetailScreen,
  WalletScreen,
  ChatScreen,
  ChatView,
  ProfileScreen,
} from "@/components/hazel/screens";
import {
  AddCardSheet,
  SendSheet,
  MonthPickerSheet,
  SetBudgetSheet,
  AddCatSheet,
  FindPeopleScreen,
  EditProfileScreen,
} from "@/components/hazel/sheets";
import {
  SettingsRoot,
  CurrencyScreen,
  LanguageScreen,
  BackupScreen,
  AccountsScreen,
  CategoriesScreen,
  type SettingsScreen,
} from "@/components/hazel/settings";
import { ExpensesScreen, ExpenseDetailScreen, AddExpenseSheet } from "@/components/hazel/expenses";
import { SwapSheet, ReceiveSheet } from "@/components/hazel/extras";
import { PaySheet } from "@/components/hazel/paysheet";
import { WelcomeFlow, PinLock } from "@/components/hazel/onboarding";
import { SecurityScreen, HelpScreen } from "@/components/hazel/security";
import { NotificationsScreen, AppearanceScreen } from "@/components/hazel/prefs";
import { useHazelStore } from "@/lib/hazel/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HazelPay — Pay, budget, chat" },
      { name: "description", content: "HazelPay: send money, budget your month and chat with friends. South African Rand by default." },
    ],
  }),
  component: HazelApp,
});

/** Wallet phase = wallet (home), budget, expenses, settings.
 *  Chat phase = chat, find, profile. */
type Tab =
  | "wallet"
  | "budget"
  | "expenses"
  | "settings"
  | "chat"
  | "find"
  | "profile";

const CHAT_TABS: Tab[] = ["chat", "find", "profile"];
const WALLET_TABS: Tab[] = ["wallet", "budget", "expenses", "settings"];
const phaseOf = (t: Tab): "chat" | "wallet" => (CHAT_TABS.includes(t) ? "chat" : "wallet");

type Sub =
  | null
  | "assets"
  | "edit-profile"
  | "chat-view"
  | "cat-detail"
  | "expense-detail"
  | "security"
  | "help"
  | Exclude<SettingsScreen, "settings">;

const { W, S, AC } = COLORS;

function HazelApp() {
  const { state } = useHazelStore();
  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<"wallet" | null>(null);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = state.settings.theme;
    document.body.classList.toggle("theme-light", t === "light");
    document.body.classList.toggle("theme-dark", t !== "light");
  }, [state.settings.theme]);

  const [tab, setTab] = useState<Tab>("wallet");
  const [sub, setSub] = useState<Sub>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any>(null);
  const [cardVis, setCardVis] = useState(false);
  const [txFilter, setTxFilter] = useState("");
  const [chatId, setChatId] = useState<number | null>(null);
  const [catCtx, setCatCtx] = useState<{ catId: string; monthKey: string } | null>(null);
  const [expenseId, setExpenseId] = useState<number | null>(null);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  }, []);

  const openSheet = (id: string, data?: any) => { setSheet(id); setSheetData(data ?? null); };
  const closeSheet = () => { setSheet(null); setSheetData(null); };
  const openSub = (id: Sub | "find-people" | "settings") => {
    // Legacy callers route certain ids to tabs instead of sub-screens.
    if (id === "find-people") { setTab("find"); setSub(null); return; }
    if (id === "settings") { setTab("settings"); setSub(null); return; }
    if (id === "profile") { setTab("profile"); setSub(null); return; }
    setSub(id);
  };
  const closeSub = () => setSub(null);

  const togglePhase = () => {
    const next = phaseOf(tab) === "chat" ? "wallet" : "chat";
    if (next === "wallet" && state.pin && !unlocked) { setPendingPhase("wallet"); return; }
    setTab(next);
    setSub(null);
  };

  // Sub-screen routing (full-page overlays)
  const withNav = (node: React.ReactNode) => (
    <Shell>
      {node}
      <BottomNav tab={tab} setTab={(t) => { setTab(t); setSub(null); }} togglePhase={togglePhase} />
    </Shell>
  );

  if (!mounted) return <Shell>{null}</Shell>;
  if (!state.onboarded) return <WelcomeFlow onDone={() => { setUnlocked(true); }} />;
  if (state.pin && !unlocked) {
    return <PinLock onUnlock={() => { setUnlocked(true); if (pendingPhase) { setTab(pendingPhase); setPendingPhase(null); } }} />;
  }

  if (sub === "assets") return withNav(<WalletScreen openSheet={openSheet} cardVis={cardVis} setCardVis={setCardVis} />);
  if (sub === "edit-profile") return withNav(<EditProfileScreen onBack={closeSub} />);
  if (sub === "set-currency") return withNav(<CurrencyScreen onBack={() => setSub(null)} />);
  if (sub === "set-language") return withNav(<LanguageScreen onBack={() => setSub(null)} />);
  if (sub === "set-backup") return withNav(<BackupScreen onBack={() => setSub(null)} />);
  if (sub === "set-accounts") return withNav(<AccountsScreen onBack={() => setSub(null)} />);
  if (sub === "set-income-cats") return withNav(<CategoriesScreen kind="income" onBack={() => setSub(null)} />);
  if (sub === "set-expense-cats") return withNav(<CategoriesScreen kind="expense" onBack={() => setSub(null)} />);
  if (sub === "set-notifications") return withNav(<NotificationsScreen onBack={() => setSub(null)} />);
  if (sub === "set-appearance") return withNav(<AppearanceScreen onBack={() => setSub(null)} />);
  if (sub === "security") return withNav(<SecurityScreen onBack={() => setSub(null)} onChangePin={() => { /* future */ }} />);
  if (sub === "help") return withNav(<HelpScreen onBack={() => setSub(null)} />);
  if (sub === "expense-detail" && expenseId != null) return withNav(<ExpenseDetailScreen id={expenseId} onBack={() => { setSub(null); setExpenseId(null); }} />);
  if (sub === "cat-detail" && catCtx)
    return (
      <Shell>
        <CatDetailScreen
          catId={catCtx.catId}
          monthKey={catCtx.monthKey}
          onBack={() => setSub(null)}
          onPickMonth={() => openSheet("month-picker", { monthKey: catCtx.monthKey, onPick: (k: string) => setCatCtx({ ...catCtx, monthKey: k }) })}
        />
        <BottomNav tab={tab} setTab={(t) => { setTab(t); setSub(null); }} togglePhase={togglePhase} />
        <Sheets sheet={sheet} sheetData={sheetData} closeSheet={closeSheet} chatId={chatId} />
      </Shell>
    );

  if (sub === "chat-view" && chatId != null) {
    return (
      <Shell hideNav>
        <ChatView
          contactId={chatId}
          onBack={() => { setSub(null); setChatId(null); }}
          onSendMoney={() => openSheet("send", { fromChat: true, chatId })}
        />
        <Sheets sheet={sheet} sheetData={sheetData} closeSheet={closeSheet} chatId={chatId} />
      </Shell>
    );
  }

  return (
    <Shell>
      {tab === "wallet" && (
        <HomeScreen
          goAnalytics={() => setTab("budget")}
          openSheet={openSheet}
          openSub={openSub}
          cardVis={cardVis}
          setCardVis={setCardVis}
          txFilter={txFilter}
          setTxFilter={setTxFilter}
          greeting={greeting}
        />
      )}
      {tab === "budget" && (
        <BudgetScreen
          openSheet={openSheet}
          openCatDetail={(catId: string, monthKey: string) => { setCatCtx({ catId, monthKey }); setSub("cat-detail"); }}
        />
      )}
      {tab === "expenses" && (
        <ExpensesScreen
          openAdd={() => openSheet("add-expense")}
          openDetail={(id) => { setExpenseId(id); setSub("expense-detail"); }}
        />
      )}
      {tab === "settings" && (
        <SettingsRoot go={(s) => { if (s === "settings") return; setSub(s); }} onBack={() => setTab("wallet")} />
      )}
      {tab === "chat" && (
        <ChatScreen
          openSub={openSub}
          openChat={(id: number) => { setChatId(id); setSub("chat-view"); }}
        />
      )}
      {tab === "find" && <FindPeopleScreen onBack={() => setTab("chat")} />}
      {tab === "profile" && <ProfileScreen openSub={openSub} />}

      <BottomNav tab={tab} setTab={(t) => { setTab(t); setSub(null); }} togglePhase={togglePhase} />
      <Sheets sheet={sheet} sheetData={sheetData} closeSheet={closeSheet} chatId={chatId} />
    </Shell>
  );
}

function Shell({ children, hideNav }: { children: React.ReactNode; hideNav?: boolean }) {
  return (
    <div style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: hideNav ? 0 : 0 }}>
      {children}
      <div id="hazel-toast" />
      <style>{`
        #hazel-toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); z-index: 999; padding: 10px 20px; border-radius: 14px; font-size: 13px; font-weight: 600; color: #001535; pointer-events: none; white-space: nowrap; backdrop-filter: blur(16px); background: rgba(94,234,212,0.9); border: 1px solid rgba(94,234,212,0.4); box-shadow: 0 4px 20px rgba(0,0,0,0.3); opacity: 0; transition: opacity .2s, transform .2s; }
        #hazel-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        #hazel-toast.hide { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      `}</style>
    </div>
  );
}

function BottomNav({ tab, setTab, togglePhase }: { tab: Tab; setTab: (t: Tab) => void; togglePhase: () => void }) {
  const phase = phaseOf(tab);
  // Per spec: chat phase → Find + Profile (chat removed). Wallet phase → Budget + Expenses + Settings (wallet removed).
  const items: { id: Tab; icon: string; label: string }[] =
    phase === "chat"
      ? [
          { id: "find", icon: "Search", label: "Find" },
          { id: "profile", icon: "User", label: "Profile" },
        ]
      : [
          { id: "budget", icon: "PieChart", label: "Budget" },
          { id: "expenses", icon: "Receipt", label: "Expenses" },
          { id: "settings", icon: "Settings", label: "Settings" },
        ];

  const toggleIcon = phase === "chat" ? "Wallet" : "MessageCircle";
  const toggleLabel = phase === "chat" ? "Wallet" : "Chat";

  return (
    <div
      className="safe-bottom"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 14,
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        padding: "0 14px",
        pointerEvents: "none",
      }}
    >
      {/* Toggle (left circle) */}
      <button
        onClick={togglePhase}
        aria-label={`Switch to ${toggleLabel}`}
        style={{
          pointerEvents: "auto",
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "rgba(94,234,212,0.18)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(94,234,212,0.35)",
          color: AC,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Ic n={toggleIcon} s={18} c={AC} />
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.04em" }}>{toggleLabel}</span>
      </button>

      {/* Floating glass nav */}
      <div
        style={{
          pointerEvents: "auto",
          height: 52,
          flex: "0 1 auto",
          padding: "0 6px",
          borderRadius: 26,
          background: "rgba(8,28,68,0.55)",
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        {items.map((it) => {
          const a = tab === it.id;
          return (
            <T
              key={it.id}
              onClick={() => setTab(it.id)}
              style={{
                background: a ? "rgba(94,234,212,0.16)" : "transparent",
                border: "none",
                padding: "8px 12px",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: a ? AC : "rgba(255,255,255,0.65)",
                fontSize: 11,
                fontWeight: 700,
                minHeight: 40,
              }}
            >
              <Ic n={it.icon} s={16} c={a ? AC : "rgba(255,255,255,0.65)"} />
              <span>{it.label}</span>
            </T>
          );
        })}
      </div>
    </div>
  );
}

function Sheets({ sheet, sheetData, closeSheet, chatId }: any) {
  return (
    <>
      <AddCardSheet open={sheet === "add-card"} onClose={closeSheet} />
      <SendSheet
        open={sheet === "send"}
        onClose={closeSheet}
        fromChat={sheetData?.fromChat}
        recip={sheetData?.fromChat && chatId != null ? undefined : null}
      />
      <MonthPickerSheet
        open={sheet === "month-picker"}
        onClose={closeSheet}
        monthKey={sheetData?.monthKey}
        onPick={sheetData?.onPick ?? (() => {})}
      />
      <SetBudgetSheet
        open={sheet === "set-budget"}
        onClose={closeSheet}
        current={sheetData?.current}
        onSave={sheetData?.onSave ?? (() => {})}
      />
      <AddCatSheet open={sheet === "add-expense-cat"} onClose={closeSheet} kind="expense" />
      <AddExpenseSheet open={sheet === "add-expense"} onClose={closeSheet} />
      <SwapSheet open={sheet === "swap"} onClose={closeSheet} />
      <ReceiveSheet open={sheet === "receive"} onClose={closeSheet} />
      <PaySheet open={sheet === "pay"} onClose={closeSheet} />
    </>
  );
}
