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
import { CreateGroupScreen, GroupChatView } from "@/components/hazel/groups";
import {
  AddCardSheet,
  SendSheet,
  MonthPickerSheet,
  SetBudgetSheet,
  AddCatSheet,
  FindPeopleScreen,
  EditProfileScreen,
  AddDebitOrderSheet,
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
import { ExpensesScreen, ExpenseDetailScreen, AddExpenseSheet, AddIncomeSheet } from "@/components/hazel/expenses";
import { SwapSheet, ReceiveSheet } from "@/components/hazel/extras";
import { PaySheet } from "@/components/hazel/paysheet";
import { WelcomeFlow, PinLock } from "@/components/hazel/onboarding";
import { SecurityScreen, HelpScreen } from "@/components/hazel/security";
import { NotificationsScreen, AppearanceScreen } from "@/components/hazel/prefs";
import { CallHistoryScreen } from "@/components/hazel/call-history";
import { useHazelStore } from "@/lib/hazel/store";
import { useAuth } from "@/hooks/use-auth";
import { AuthScreen } from "@/components/hazel/auth";
import { supabase } from "@/integrations/supabase/client";
import { useChatSync } from "@/lib/hazel/chat-sync";
import { useEnsureE2EEIdentity } from "@/lib/e2ee/init";
import { useCalls } from "@/lib/hazel/calls";
import { subscribeToPush } from "@/lib/hazel/push";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumens — Pay, budget, chat" },
      { name: "description", content: "Lumens: send money, budget your month and chat with friends. South African Rand by default." },
    ],
  }),
  component: HazelApp,
});

/** Wallet phase = wallet (home), assets, budget, expenses, settings.
 *  Chat phase = chat, find, profile. */
type Tab =
  | "wallet"
  | "assets"
  | "budget"
  | "expenses"
  | "settings"
  | "chat"
  | "call"
  | "find"
  | "profile";

const CHAT_TABS: Tab[] = ["chat", "call", "find", "profile"];
const WALLET_TABS: Tab[] = ["wallet", "assets", "budget", "expenses", "settings"];
const phaseOf = (t: Tab): "chat" | "wallet" => (CHAT_TABS.includes(t) ? "chat" : "wallet");

type Sub =
  | null
  | "edit-profile"
  | "chat-view"
  | "group-view"
  | "new-group"
  | "call-history"
  | "cat-detail"
  | "expense-detail"
  | "security"
  | "help"
  | Exclude<SettingsScreen, "settings">;

const { W, S, AC } = COLORS;

function HazelApp() {
  const { state, set } = useHazelStore();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<"wallet" | null>(null);
  const [pinChallenge, setPinChallenge] = useState<null | { onOk: () => void; title?: string; subtitle?: string }>(null);
  useEffect(() => { setMounted(true); }, []);
  // Populate profile from Supabase + signup metadata on auth.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const meta: any = user.user_metadata || {};
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      set((s) => {
        s.profile = {
          name: data?.display_name || meta.full_name || meta.name || s.profile.name || "",
          email: user.email || s.profile.email || "",
          username: data?.username || s.profile.username || "",
          phone: data?.phone || meta.phone || s.profile.phone || "",
          dob: data?.dob || s.profile.dob || "",
          avatar: data?.avatar_url || meta.avatar_url || s.profile.avatar || "",
          cover: data?.cover_url || s.profile.cover || "",
        };
      });
    })();
    return () => { cancelled = true; };
  }, [user, set]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = state.settings.theme;
    const body = document.body;
    ["theme-light", "theme-dark", "theme-hazel", "theme-peach", "theme-graphite", "theme-deepnavy"].forEach((c) => body.classList.remove(c));
    body.classList.add(`theme-${t}`);
  }, [state.settings.theme]);

  const [tab, setTab] = useState<Tab>("wallet");
  const [sub, setSub] = useState<Sub>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any>(null);
  const [cardVis, setCardVis] = useState(false);
  const [txFilter, setTxFilter] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [catCtx, setCatCtx] = useState<{ catId: string; monthKey: string } | null>(null);
  useChatSync(user?.id ?? null);
  useEnsureE2EEIdentity(user?.id ?? null);
  // Hoisted call state so video calls can be started from anywhere
  // (chat header dropdown, calls tab, incoming-call ringer).
  const calls = useCalls(user?.id ?? null);
  // Best-effort push subscription registration. Silently no-ops without
  // service worker support or notification permission.
  useEffect(() => {
    if (!user?.id) return;
    if (!state.settings?.notifications?.chat && !state.settings?.notifications?.transactions) return;
    const t = setTimeout(() => { subscribeToPush(user.id); }, 1500);
    return () => clearTimeout(t);
  }, [user?.id, state.settings?.notifications?.chat, state.settings?.notifications?.transactions]);
  const [expenseId, setExpenseId] = useState<number | null>(null);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  }, []);

  const openSheet = (id: string, data?: any) => { setSheet(id); setSheetData(data ?? null); };
  const closeSheet = () => { setSheet(null); setSheetData(null); };
  const openSub = (id: Sub | "find-people" | "settings" | "profile") => {
    // Legacy callers route certain ids to tabs instead of sub-screens.
    if (id === "find-people") { setTab("find"); setSub(null); return; }
    if (id === "settings") { setTab("settings"); setSub(null); return; }
    if (id === "profile") { setTab("profile"); setSub(null); return; }
    if (id === ("assets" as any)) { setTab("assets"); setSub(null); return; }
    setSub(id);
  };
  const closeSub = () => setSub(null);

  const requirePin = (onOk: () => void, title?: string, subtitle?: string) => {
    if (!state.pin) return onOk();
    setPinChallenge({ onOk, title, subtitle });
  };

  const guardedSetCardVis = (next: boolean) => {
    if (next && state.pin && !cardVis) {
      requirePin(() => setCardVis(true), "Reveal card details", "Enter PIN to view your card number");
    } else {
      setCardVis(next);
    }
  };

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
  if (authLoading) return <Shell>{null}</Shell>;
  // Order: Welcome flow first, then Auth, then PIN unlock.
  if (!state.onboarded) return <WelcomeFlow onDone={() => { setUnlocked(true); }} />;
  if (!user) return <AuthScreen />;
  if (state.pin && !unlocked) {
    return <PinLock onUnlock={() => { setUnlocked(true); if (pendingPhase) { setTab(pendingPhase); setPendingPhase(null); } }} />;
  }
  if (pinChallenge) {
    return (
      <PinLock
        title={pinChallenge.title}
        subtitle={pinChallenge.subtitle}
        onUnlock={() => { const fn = pinChallenge.onOk; setPinChallenge(null); fn(); }}
        onCancel={() => setPinChallenge(null)}
      />
    );
  }

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
  if (sub === "call-history") return withNav(
    <CallHistoryScreen
      onBack={() => setSub(null)}
      onCall={(id, mode) => { calls.startCall(id, mode); setSub(null); setTab('call'); }}
    />
  );
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
        <Sheets sheet={sheet} sheetData={sheetData} closeSheet={closeSheet} chatId={chatId} requirePin={requirePin} />
      </Shell>
    );

  if (sub === "chat-view" && chatId != null) {
    return (
      <Shell hideNav>
        <ChatView
          contactId={chatId}
          onBack={() => { setSub(null); setChatId(null); }}
          onSendMoney={() => openSheet("send", { fromChat: true, chatId })}
          onVideoCall={() => { if (chatId) { calls.startCall(chatId, 'video'); setSub(null); setTab('call'); } }}
          onVoiceCall={() => { if (chatId) { calls.startCall(chatId, 'audio'); setSub(null); setTab('call'); } }}
        />
        <Sheets sheet={sheet} sheetData={sheetData} closeSheet={closeSheet} chatId={chatId} requirePin={requirePin} />
      </Shell>
    );
  }

  if (sub === "group-view" && groupId != null) {
    return (
      <Shell hideNav>
        <GroupChatView groupId={groupId} onBack={() => { setSub(null); setGroupId(null); }} />
      </Shell>
    );
  }

  if (sub === "new-group") {
    return withNav(
      <CreateGroupScreen
        onBack={() => setSub(null)}
        onCreated={(id) => { setGroupId(id); setSub("group-view"); }}
      />
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
          setCardVis={guardedSetCardVis}
          txFilter={txFilter}
          setTxFilter={setTxFilter}
          greeting={greeting}
        />
      )}
      {tab === "assets" && (
        <WalletScreen openSheet={openSheet} cardVis={cardVis} setCardVis={guardedSetCardVis} />
      )}
      {tab === "budget" && (
        <BudgetScreen
          openSheet={openSheet}
          openCatDetail={(catId: string, monthKey: string) => { setCatCtx({ catId, monthKey }); setSub("cat-detail"); }}
        />
      )}
      {tab === "expenses" && (
        <ExpensesScreen
          openAdd={(kind?: "expense" | "income") => openSheet(kind === "income" ? "add-income" : "add-expense")}
          openDetail={(id) => { setExpenseId(id); setSub("expense-detail"); }}
        />
      )}
      {tab === "settings" && (
        <SettingsRoot go={(s) => { if (s === "settings") return; setSub(s); }} onBack={() => setTab("wallet")} />
      )}
      {tab === "chat" && (
        <ChatScreen
          openSub={openSub}
          openChat={(id: string) => { setChatId(id); setSub("chat-view"); }}
          openGroup={(id: string) => { setGroupId(id); setSub("group-view"); }}
          openNewGroup={() => setSub("new-group")}
        />
      )}
      {tab === "call" && <CallScreen calls={calls} />}
      {tab === "find" && (
        <FindPeopleScreen
          onBack={() => setTab("chat")}
          onOpenChat={(id: string) => { setChatId(id); setTab("chat"); setSub("chat-view"); }}
        />
      )}
      {tab === "profile" && <ProfileScreen openSub={openSub} />}

      <BottomNav tab={tab} setTab={(t) => { setTab(t); setSub(null); }} togglePhase={togglePhase} />
      <Sheets sheet={sheet} sheetData={sheetData} closeSheet={closeSheet} chatId={chatId} requirePin={requirePin} />
    </Shell>
  );
}

function Shell({ children, hideNav }: { children: React.ReactNode; hideNav?: boolean }) {
  return (
    <div className="safe-top" style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: hideNav ? 0 : 0 }}>
      {children}
      <div id="hazel-toast" />
      <style>{`
        #hazel-toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); z-index: 999; padding: 10px 20px; border-radius: 14px; font-size: 13px; font-weight: 600; color: #001535; pointer-events: none; white-space: nowrap; backdrop-filter: blur(16px); background: rgba(37,99,235,0.9); border: 1px solid rgba(37,99,235,0.4); box-shadow: 0 4px 20px rgba(0,0,0,0.3); opacity: 0; transition: opacity .2s, transform .2s; }
        #hazel-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        #hazel-toast.hide { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      `}</style>
    </div>
  );
}

function BottomNav({ tab, setTab, togglePhase }: { tab: Tab; setTab: (t: Tab) => void; togglePhase: () => void }) {
  const phase = phaseOf(tab);
  // Per spec: chat phase → Find + Profile (chat removed). Wallet phase → Assets + Budget + Expenses + Settings (wallet/home stays as the toggle target).
  const items: { id: Tab; icon: string; label: string }[] =
    phase === "chat"
      ? [
          { id: "chat", icon: "MessageCircle", label: "Chat" },
          { id: "call", icon: "Phone", label: "Call" },
          { id: "find", icon: "UserSearch", label: "Find" },
          { id: "profile", icon: "CircleUserRound", label: "Profile" },
        ]
      : [
          { id: "assets", icon: "Layers", label: "Assets" },
          { id: "budget", icon: "PieChart", label: "Budget" },
          { id: "expenses", icon: "ReceiptText", label: "Expenses" },
          { id: "settings", icon: "Settings2", label: "Settings" },
        ];

  const toggleIcon = phase === "chat" ? "Wallet" : "MessagesSquare";
  const toggleLabel = phase === "chat" ? "Wallet" : "Chat";

  return (
    <div
      className="safe-bottom"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 12,
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        padding: "0 10px",
        pointerEvents: "none",
      }}
    >
      {/* Toggle (left circle) */}
      <button
        onClick={togglePhase}
        aria-label={`Switch to ${toggleLabel}`}
        style={{
          pointerEvents: "auto",
          width: 56,
          height: 56,
          borderRadius: 28,
          background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Ic n={toggleIcon} s={20} c={"#fff" as any} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(255,255,255,0.85)" }}>{toggleLabel}</span>
      </button>

      {/* Floating glass nav */}
      <div
        key={phase}
        className="nav-pop"
        style={{
          pointerEvents: "auto",
          height: 56,
          flex: "0 1 auto",
          padding: "0 8px",
          borderRadius: 28,
          background: "rgba(8,28,68,0.55)",
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 0,
        }}
      >
        {items.map((it) => {
          const a = tab === it.id;
          return (
            <T
              key={it.id}
              onClick={() => setTab(it.id)}
              style={{
                background: a
                  ? "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))"
                  : "transparent",
                border: a ? "1px solid rgba(255,255,255,0.22)" : "1px solid transparent",
                padding: "6px 10px",
                borderRadius: 22,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                color: a ? "#fff" : "rgba(255,255,255,0.65)",
                fontSize: 9,
                fontWeight: 700,
                minHeight: 44,
                minWidth: 50,
                backdropFilter: a ? "blur(18px)" : "none",
                WebkitBackdropFilter: a ? "blur(18px)" : "none",
                boxShadow: a ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px rgba(0,0,0,0.25)" : "none",
                transition: "background .25s ease, color .2s ease, border-color .2s ease",
              }}
            >
              <Ic n={it.icon} s={18} c={a ? "#fff" : "rgba(255,255,255,0.7)"} />
              <span style={{ letterSpacing: "0.02em" }}>{it.label}</span>
            </T>
          );
        })}
      </div>
    </div>
  );
}

/** Encrypted voice-call screen — UI scaffold over confirmed contacts. */
function CallScreen({ calls }: { calls: ReturnType<typeof useCalls> }) {
  const { state } = useHazelStore();
  const { state: call, startCall } = calls;
  const [q, setQ] = useState("");
  const list = state.contacts.filter((c) =>
    c.confirmed && (!q || c.name.toLowerCase().includes(q.toLowerCase()))
  );
  // The active-call UI is rendered globally by <GlobalCallOverlay /> so the
  // callee gets a ringer from any tab/screen, not just when sitting on Calls.
  void call;

  return (
    <div className="afi" style={{ padding: "14px 20px 140px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h1 style={{ color: W, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Calls</h1>
        <div style={{ ...{ padding: "6px 10px", borderRadius: 999, background: "rgba(37,99,235,0.12)", color: AC as any, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" } }}>
          END-TO-END
        </div>
      </div>
      <div className="frost" style={{ padding: 10, borderRadius: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <Ic n="Search" s={16} c={S as any} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search confirmed contacts"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: W, fontSize: 13 }}
        />
      </div>
      {list.length === 0 ? (
        <div className="frost" style={{ padding: 28, borderRadius: 20, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: "rgba(37,99,235,0.12)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic n="PhoneOff" s={22} c={AC as any} />
          </div>
          <div style={{ color: W, fontSize: 15, fontWeight: 700 }}>No contacts yet</div>
          <div style={{ color: S, fontSize: 12, marginTop: 6 }}>Add confirmed contacts to start an encrypted call.</div>
        </div>
      ) : (
        list.map((c) => (
          <div key={c.id} className="frost" style={{ padding: 12, borderRadius: 16, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: "linear-gradient(135deg,#2563eb,#2563eb)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{c.ini}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: W, fontSize: 14, fontWeight: 700 }}>{c.name}</div>
              <div style={{ color: S, fontSize: 11 }}>{c.on ? "Online" : "Offline"}</div>
            </div>
            <T onClick={() => startCall(c.id, "audio")} style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(37,99,235,0.18)", border: "1px solid rgba(37,99,235,0.35)", color: AC as any, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic n="Phone" s={18} />
            </T>
          </div>
        ))
      )}
    </div>
  );
}

function Sheets({ sheet, sheetData, closeSheet, chatId, requirePin }: any) {
  return (
    <>
      <AddCardSheet open={sheet === "add-card"} onClose={closeSheet} />
      <SendSheet
        open={sheet === "send"}
        onClose={closeSheet}
        fromChat={sheetData?.fromChat}
        recip={sheetData?.fromChat && chatId != null ? undefined : null}
        requirePin={requirePin}
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
      <AddIncomeSheet open={sheet === "add-income"} onClose={closeSheet} />
      <SwapSheet open={sheet === "swap"} onClose={closeSheet} />
      <ReceiveSheet open={sheet === "receive"} onClose={closeSheet} />
      <PaySheet open={sheet === "pay"} onClose={closeSheet} />
      <AddDebitOrderSheet open={sheet === "add-debit-order"} onClose={closeSheet} order={sheetData?.order} />
    </>
  );
}
