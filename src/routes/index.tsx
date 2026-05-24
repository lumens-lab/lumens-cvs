import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HazelPay — Pay, budget, chat" },
      { name: "description", content: "HazelPay: send money, budget your month and chat with friends. South African Rand by default." },
    ],
  }),
  component: HazelApp,
});

type Tab = "home" | "budget" | "wallet" | "chat" | "profile";
type Sub =
  | null
  | "find-people"
  | "edit-profile"
  | "chat-view"
  | "cat-detail"
  | SettingsScreen;

const { W, S, AC } = COLORS;

function HazelApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [sub, setSub] = useState<Sub>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any>(null);
  const [cardVis, setCardVis] = useState(false);
  const [txFilter, setTxFilter] = useState("");
  const [chatId, setChatId] = useState<number | null>(null);
  const [catCtx, setCatCtx] = useState<{ catId: string; monthKey: string } | null>(null);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  }, []);

  const openSheet = (id: string, data?: any) => { setSheet(id); setSheetData(data ?? null); };
  const closeSheet = () => { setSheet(null); setSheetData(null); };
  const openSub = (id: Sub) => setSub(id);
  const closeSub = () => setSub(null);

  // Sub-screen routing (full-page overlays)
  if (sub === "find-people") return <Shell><FindPeopleScreen onBack={closeSub} /></Shell>;
  if (sub === "edit-profile") return <Shell><EditProfileScreen onBack={closeSub} /></Shell>;
  if (sub === "settings") return <Shell><SettingsRoot go={(s) => setSub(s)} onBack={closeSub} /></Shell>;
  if (sub === "set-currency") return <Shell><CurrencyScreen onBack={() => setSub("settings")} /></Shell>;
  if (sub === "set-language") return <Shell><LanguageScreen onBack={() => setSub("settings")} /></Shell>;
  if (sub === "set-backup") return <Shell><BackupScreen onBack={() => setSub("settings")} /></Shell>;
  if (sub === "set-accounts") return <Shell><AccountsScreen onBack={() => setSub("settings")} /></Shell>;
  if (sub === "set-income-cats") return <Shell><CategoriesScreen kind="income" onBack={() => setSub("settings")} /></Shell>;
  if (sub === "set-expense-cats") return <Shell><CategoriesScreen kind="expense" onBack={() => setSub("settings")} /></Shell>;
  if (sub === "cat-detail" && catCtx)
    return (
      <Shell>
        <CatDetailScreen
          catId={catCtx.catId}
          monthKey={catCtx.monthKey}
          onBack={() => setSub(null)}
          onPickMonth={() => openSheet("month-picker", { monthKey: catCtx.monthKey, onPick: (k: string) => setCatCtx({ ...catCtx, monthKey: k }) })}
        />
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
      {tab === "home" && (
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
      {tab === "wallet" && <WalletScreen openSheet={openSheet} cardVis={cardVis} setCardVis={setCardVis} />}
      {tab === "chat" && (
        <ChatScreen
          openSub={openSub}
          openChat={(id: number) => { setChatId(id); setSub("chat-view"); }}
        />
      )}
      {tab === "profile" && <ProfileScreen openSub={openSub} />}

      <BottomNav tab={tab} setTab={setTab} />
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

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "Home", label: "Home" },
    { id: "budget", icon: "PieChart", label: "Budget" },
    { id: "wallet", icon: "Wallet", label: "Wallet" },
    { id: "chat", icon: "MessageCircle", label: "Chat" },
    { id: "profile", icon: "User", label: "Profile" },
  ];
  return (
    <div className="safe-bottom" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", justifyContent: "center", pointerEvents: "none",
    }}>
      <div style={{
        pointerEvents: "auto",
        width: "100%", maxWidth: 480, padding: "10px 14px 14px",
        background: "linear-gradient(180deg, transparent, rgba(0,21,53,0.95) 30%, #001535)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
      }}>
        {items.map((it) => {
          const a = tab === it.id;
          return (
            <T key={it.id} onClick={() => setTab(it.id)} style={{
              flex: 1, padding: "8px 0", background: "none", border: "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              color: a ? AC : "rgba(255,255,255,0.45)",
            }}>
              <Ic n={it.icon} s={20} c={a ? AC : "rgba(255,255,255,0.45)"} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{it.label}</span>
              {a && <div style={{ width: 4, height: 4, borderRadius: 2, background: AC }} />}
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
    </>
  );
}
