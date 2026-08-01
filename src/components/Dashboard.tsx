import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { HabitsApp } from "./HabitsApp";
import { FinanceApp } from "./FinanceApp";
import { PlannerApp } from "./PlannerApp";
import { NotesApp } from "./NotesApp";
import { SettingsApp } from "./SettingsApp";
import { 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  Clock, 
  BookOpen,
  ArrowRight,
  Target
} from "lucide-react";
import {
  StackLogo,
  CommandCenterIcon,
  FinanceTrackerIcon,
  FocusPlannerIcon,
  HabitsTrackerIcon,
  QuickNotesIcon,
  SettingsNavIcon
} from "./AppIcons";


interface DashboardProps {
  user: User;
}

export type ActiveTab = "hub" | "habits" | "finance" | "planner" | "notes" | "settings";

export interface WorkspaceSettings {
  theme: "dark" | "light";
  currency: string;
  pomodoroFocus: number;
  pomodoroBreak: number;
  dailyHabitTarget: number;
  displayName: string;
}

const defaultSettings: WorkspaceSettings = {
  theme: "dark",
  currency: "USD",
  pomodoroFocus: 25,
  pomodoroBreak: 5,
  dailyHabitTarget: 2,
  displayName: ""
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("hub");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const userKey = user.email || user.uid;

  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    return { ...defaultSettings, displayName: user.displayName || "Productive Self" };
  });

  const applyTheme = (_themeName: "dark" | "light") => {
    const root = document.documentElement;
    root.classList.remove("theme-light");
  };

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (db && userKey) {
        try {
          const docRef = doc(db, "user", userKey, "productivity", "settings");
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as Partial<WorkspaceSettings>;
            const merged = { ...defaultSettings, ...data };
            setSettings(merged);
          }
        } catch (e) {
          console.error("Error fetching workspace settings:", e);
        }
      }
    };
    fetchSettings();
  }, [userKey]);

  const saveWorkspaceSettings = async (updated: WorkspaceSettings) => {
    setSettings(updated);
    if (db && userKey) {
      try {
        const docRef = doc(db, "user", userKey, "productivity", "settings");
        await setDoc(docRef, updated, { merge: true });
      } catch (e) {
        console.error("Error saving workspace settings:", e);
      }
    }
  };

  // Snapshot states for the main hub view
  const [habitRate, setHabitRate] = useState(0);
  const [habitCount, setHabitCount] = useState(0);
  const [netBalance, setNetBalance] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [todoRemaining, setTodoRemaining] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [habitInsight, setHabitInsight] = useState({
    rate: 0,
    count: 0,
    featuredHabit: "No habits tracked yet",
    bestStreak: 0,
    goalProgress: 0,
    goalTarget: 0,
  });
  const [financeInsight, setFinanceInsight] = useState({
    count: 0,
    netBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    featuredLabel: "No transactions yet",
    latestCategory: "No category yet",
    liquidBalance: 0,
    investmentBalance: 0,
  });
  const [plannerInsight, setPlannerInsight] = useState({
    remaining: 0,
    featuredTask: "Everything is clear for now",
  });
  const [notesInsight, setNotesInsight] = useState({
    count: 0,
    featuredTitle: "No notes yet",
    featuredSnippet: "Capture your next idea here",
  });

  // Sync summary metrics in realtime
  useEffect(() => {
    if (!db || !userKey) return;

    let habits: any[] = [];
    let tasks: any[] = [];
    let notes: any[] = [];
    let financeV2: any | null = null;
    let financeLegacy: any | null = null;

    const recomputeOverview = () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const thisMonthKey = new Date().toISOString().slice(0, 7);

        const completedToday = habits.filter((h: any) => (h.completedDates || []).includes(todayStr)).length;
        const rate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;
        const sortedHabits = [...habits].sort((a: any, b: any) => (b.streak || 0) - (a.streak || 0));
        const configuredGoal = Math.max(settings.dailyHabitTarget || defaultSettings.dailyHabitTarget, 1);
        const goalTarget = habits.length > 0 ? habits.length : configuredGoal;
        const goalProgress = habits.length > 0 ? Math.min(100, Math.round((completedToday / goalTarget) * 100)) : 0;

        setHabitCount(habits.length);
        setHabitRate(rate);
        setHabitInsight({
          rate,
          count: habits.length,
          featuredHabit: sortedHabits[0]?.name || "No habits tracked yet",
          bestStreak: sortedHabits[0]?.streak || 0,
          goalProgress,
          goalTarget,
        });

        const financeDoc = financeV2 ?? financeLegacy;
        const transactions: any[] = financeDoc?.transactions || [];
        const accounts: any[] = financeDoc?.accounts || [];

        const income = transactions.filter((t: any) => t.type === "income").reduce((sum: number, t: any) => sum + t.amount, 0);
        const expense = transactions.filter((t: any) => t.type === "expense").reduce((sum: number, t: any) => sum + t.amount, 0);
        const monthIncome = transactions
          .filter((t: any) => t.type === "income" && (t.date || "").startsWith(thisMonthKey))
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        const monthExpense = transactions
          .filter((t: any) => t.type === "expense" && (t.date || "").startsWith(thisMonthKey))
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        const sortedTxs = [...transactions].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        const latestTx = sortedTxs[0];
        const expenseCategory = [...transactions.filter((t: any) => t.type === "expense")]
          .sort((a: any, b: any) => b.amount - a.amount)[0];
        const accountBalance = (account: any) => (account.startBalance || 0) + (account.transactionBalance || 0);
        const liquidBalance = accounts
          .filter((account: any) => account.type === "Bank" || account.type === "Physical Cash")
          .reduce((sum: number, account: any) => sum + accountBalance(account), 0);
        const investmentBalance = accounts
          .filter((account: any) => account.type !== "Bank" && account.type !== "Physical Cash")
          .reduce((sum: number, account: any) => sum + accountBalance(account), 0);
        const totalBalance = accounts.length > 0 ? liquidBalance + investmentBalance : income - expense;

        setExpenseCount(transactions.length);
        setNetBalance(totalBalance);
        setFinanceInsight({
          count: transactions.length,
          netBalance: totalBalance,
          monthlyIncome: monthIncome,
          monthlyExpense: monthExpense,
          featuredLabel: latestTx ? `${latestTx.type === "income" ? "Income" : "Expense"} • ${latestTx.note || "Recorded recently"}` : "No transactions yet",
          latestCategory: expenseCategory?.note || "No category yet",
          liquidBalance,
          investmentBalance,
        });

        const openTasks = tasks.filter((t: any) => t.status !== "Done" && !t.completed);
        setTodoRemaining(openTasks.length);
        setPlannerInsight({
          remaining: openTasks.length,
          featuredTask: openTasks[0]?.text || "Everything is clear for now",
        });

        const sortedNotes = [...notes].sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        const latestNote = sortedNotes[0];
        setNoteCount(notes.length);
        setNotesInsight({
          count: notes.length,
          featuredTitle: latestNote?.title || "No notes yet",
          featuredSnippet: latestNote?.body ? latestNote.body.substring(0, 80) : "Capture your next idea here",
        });
      } catch (e) {
        console.error("Error recomputing overview data:", e);
      }
    };

    const unsubs = [
      onSnapshot(doc(db, "user", userKey, "productivity", "habits"), (snap) => {
        habits = snap.exists() && Array.isArray(snap.data().habits) ? snap.data().habits : [];
        recomputeOverview();
      }),
      onSnapshot(doc(db, "user", userKey, "productivity", "planner"), (snap) => {
        tasks = snap.exists() && Array.isArray(snap.data().tasks) ? snap.data().tasks : [];
        recomputeOverview();
      }),
      onSnapshot(doc(db, "user", userKey, "productivity", "notes"), (snap) => {
        notes = snap.exists() && Array.isArray(snap.data().notes) ? snap.data().notes : [];
        recomputeOverview();
      }),
      onSnapshot(doc(db, "user", userKey, "productivity", "finance_v2"), (snap) => {
        financeV2 = snap.exists() ? snap.data() : null;
        recomputeOverview();
      }),
      onSnapshot(doc(db, "user", userKey, "productivity", "finance"), (snap) => {
        financeLegacy = snap.exists() ? snap.data() : null;
        recomputeOverview();
      }),
    ];

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [userKey, settings.dailyHabitTarget]);

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutConfirm(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const formatWorkspaceCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: settings.currency || "USD",
        minimumFractionDigits: 2,
      }).format(value);
    } catch (e) {
      return `${settings.currency || "USD"} ${value.toFixed(2)}`;
    }
  };

  const menuItems = [
    { id: "hub" as ActiveTab, label: "Command Center", icon: <CommandCenterIcon size={25} className="nav-icon text-indigo-400" /> },
    { id: "habits" as ActiveTab, label: "Habit Tracker", icon: <HabitsTrackerIcon size={20} className="nav-icon text-amber-400" /> },
    { id: "finance" as ActiveTab, label: "Finance Tracker", icon: <FinanceTrackerIcon size={20} className="nav-icon text-emerald-400" /> },
    { id: "planner" as ActiveTab, label: "Focus Planner", icon: <FocusPlannerIcon size={20} className="nav-icon text-blue-400" /> },
    { id: "notes" as ActiveTab, label: "Quick Notes", icon: <QuickNotesIcon size={20} className="nav-icon text-rose-400" /> },
    { id: "settings" as ActiveTab, label: "Settings", icon: <SettingsNavIcon size={20} className="nav-icon text-purple-400" /> }
  ];

  const overviewNarrative = habitInsight.rate >= 70
    ? `Momentum is strong with ${habitInsight.goalProgress}% of your ${habitInsight.goalTarget} ${habitInsight.goalTarget === 1 ? "habit" : "habits"} goal completed today.`
    : habitInsight.count === 0
      ? `You are building momentum with ${plannerInsight.remaining} open priorities. Add your first habit to start tracking daily consistency.`
      : `You are building momentum with ${plannerInsight.remaining} open priorities and ${habitInsight.rate}% habit completion today.`;

  const habitGoalPillText = habitInsight.goalTarget <= 0
    ? "Set your habit goal in Settings"
    : habitInsight.count === 0
    ? "No habit goal yet. Add your first habit"
    : `${habitInsight.goalProgress}% of your ${habitInsight.goalTarget} ${habitInsight.goalTarget === 1 ? "habit" : "habits"} goal`;

  const shortenValue = (value: string, max = 72) => value.length > max ? `${value.slice(0, max - 1)}…` : value;

  return (
    <div className="dashboard-root-container">
      {/* Mobile Header Banner */}
      <header className="mobile-dashboard-header">
        <div className="logo-badge compact">
          <StackLogo size={28} className="logo-icon" />
          <span className="logo-text">Stack</span>
        </div>
        <button className="menu-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Main Sidebar Wrapper */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <div className="logo-badge">
            <StackLogo size={32} className="logo-icon" />
            <span className="logo-text">Stack</span>
          </div>
          
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Card & Log Out */}
        <div className="sidebar-bottom">
          <div className="user-profile-card">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="user-avatar" />
            ) : (
              <div className="user-avatar placeholder">
                {user.displayName ? user.displayName[0].toUpperCase() : "U"}
              </div>
            )}
            <div className="user-info">
              <span className="user-name">{user.displayName || "Developer"}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
          <button className="signout-item-btn" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Active panel renderer */}
      <main className="dashboard-main-panel">
        {activeTab === "hub" && (
          <div className="overview-hub-pane animate-fade-in">
            <div className="hub-greeting-banner">
              <div className="greeting-text-wrapper">
                <div className="badge">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Command Center</span>
                </div>
                <h1 className="greeting-title">
                  Welcome back, <span className="gradient-text">{user.displayName ? user.displayName.split(" ")[0] : "Productive Self"}</span>!
                </h1>
                <p className="greeting-subtitle">
                  {overviewNarrative} Your workspace is tuned for calm, focused momentum.
                </p>
              </div>
              <div className="hub-hero-pills">
                <div className="hero-pill">
                  <Target className="w-4 h-4" />
                  <span>{plannerInsight.remaining} priorities left</span>
                </div>
                <div className="hero-pill">
                  <Sparkles className="w-4 h-4" />
                  <span>{habitGoalPillText}</span>
                </div>
              </div>
            </div>

            <div className="overview-insight-strip">
              <div className="overview-insight-card main">
                <span className="insight-label">Momentum snapshot</span>
                <h3>Everything is moving in the right direction.</h3>
                <p>
                  {habitInsight.rate >= 70
                    ? `Your habits are trending strong today, and your focus list is already well under control.`
                    : `Your routine is steadily building, and ${plannerInsight.remaining} open tasks still deserve attention.`}
                </p>
                <span className="insight-footnote">
                  {financeInsight.monthlyExpense > 0
                    ? `This month you’ve logged ${formatWorkspaceCurrency(financeInsight.monthlyExpense)} in spending alongside ${formatWorkspaceCurrency(financeInsight.monthlyIncome)} in income.`
                    : "Add a finance entry to start turning your cashflow into useful insight."}
                </span>
              </div>
              <div className="overview-insight-card side">
                <span className="insight-label">Live pulse</span>
                <div className="overview-mini-stat-list">
                  <div className="mini-stat-card">
                    <span>{habitInsight.count}</span>
                    <small>Tracked habits</small>
                  </div>
                  <div className="mini-stat-card">
                    <span>{noteCount}</span>
                    <small>Saved notes</small>
                  </div>
                  <div className="mini-stat-card">
                    <span>{expenseCount}</span>
                    <small>Finance entries</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="overview-grid">
              <div className="hub-widget-card habits group" onClick={() => setActiveTab("habits")}>
                <div className="widget-header">
                  <div className="icon-box purple">
                    <HabitsTrackerIcon size={20} />
                  </div>
                  <span className="widget-tag">Habits</span>
                </div>
                <h3 className="widget-title">Habit Consistency</h3>
                <div className="widget-metric-row">
                  <span className="metric-large">{habitRate}%</span>
                  <span className="metric-desc">Completed today</span>
                </div>
                <div className="widget-progress-bar">
                  <div className="progress-fill purple" style={{ width: `${habitInsight.rate}%` }}></div>
                </div>
                <div className="widget-spark-indicators">
                  <span className="indicator-chip">⭐ {habitInsight.featuredHabit}</span>
                  <span className="indicator-chip">🔥 {habitInsight.bestStreak} day streak</span>
                </div>
                <span className="widget-footer-text">{habitCount} habits tracked and ready for review</span>
              </div>

              <div className="hub-widget-card finance group" onClick={() => setActiveTab("finance")}>
                <div className="widget-header">
                  <div className="icon-box emerald">
                    <FinanceTrackerIcon size={20} />
                  </div>
                  <span className="widget-tag">Cashflow</span>
                </div>
                <h3 className="widget-title">Smart Ledger Snapshot</h3>
                <div className="finance-snapshot-stack">
                  <div className="finance-snapshot-chip">
                    <span className="finance-snapshot-label">Liquid</span>
                    <strong>{formatWorkspaceCurrency(financeInsight.liquidBalance)}</strong>
                  </div>
                  <div className="finance-snapshot-chip">
                    <span className="finance-snapshot-label">Investments</span>
                    <strong>{formatWorkspaceCurrency(financeInsight.investmentBalance)}</strong>
                  </div>
                  <div className="finance-snapshot-chip total">
                    <span className="finance-snapshot-label">Total net</span>
                    <strong className={netBalance >= 0 ? 'text-green-400' : 'text-red-400'}>{formatWorkspaceCurrency(netBalance)}</strong>
                  </div>
                </div>
                <div className="widget-spark-indicators">
                  <span className="indicator-chip">↗ {formatWorkspaceCurrency(financeInsight.monthlyIncome)} earned</span>
                  <span className="indicator-chip">↘ {formatWorkspaceCurrency(financeInsight.monthlyExpense)} spent</span>
                </div>
                <span className="widget-footer-text">{financeInsight.featuredLabel} • {financeInsight.latestCategory}</span>
              </div>

              <div className="hub-widget-card planner group" onClick={() => setActiveTab("planner")}>
                <div className="widget-header">
                  <div className="icon-box blue">
                    <FocusPlannerIcon size={20} />
                  </div>
                  <span className="widget-tag">Focus</span>
                </div>
                <h3 className="widget-title">Focus Queue</h3>
                <div className="widget-metric-row">
                  <span className="metric-large">{todoRemaining}</span>
                  <span className="metric-desc">Open priorities</span>
                </div>
                <div className="widget-quick-timer-status flex items-center gap-1.5 mt-4 text-sm text-blue-400">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>{shortenValue(plannerInsight.featuredTask)}</span>
                </div>
                <span className="widget-footer-text">Pomodoro sessions stay ready for your next deep work block</span>
              </div>

              <div className="hub-widget-card notes group" onClick={() => setActiveTab("notes")}>
                <div className="widget-header">
                  <div className="icon-box amber">
                    <QuickNotesIcon size={20} />
                  </div>
                  <span className="widget-tag">Scratchpad</span>
                </div>
                <h3 className="widget-title">Latest Note</h3>
                <div className="widget-metric-row">
                  <span className="metric-large">{notesInsight.count}</span>
                  <span className="metric-desc">Drafts saved</span>
                </div>
                <div className="widget-quick-timer-status flex items-center gap-1.5 mt-4 text-sm text-amber-400">
                  <BookOpen className="w-4 h-4" />
                  <span>{shortenValue(notesInsight.featuredTitle)}</span>
                </div>
                <span className="widget-footer-text">{shortenValue(notesInsight.featuredSnippet)}</span>
              </div>
            </div>

            <div className="overview-snippets-section">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">App snapshots</p>
                  <h2>See the best moments from each workspace tool.</h2>
                </div>
                <button className="section-link-btn" onClick={() => setActiveTab("settings")}>
                  Customize experience <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="snippet-grid">
                <button className="snippet-card habits-card" onClick={() => setActiveTab("habits")}>
                  <div className="snippet-topline">
                    <div className="snippet-icon purple"><HabitsTrackerIcon size={16} /></div>
                    <span className="snippet-kicker">Habits</span>
                  </div>
                  <h3>Daily rhythm</h3>
                  <p>{habitInsight.featuredHabit} is your strongest routine right now.</p>
                  <div className="snippet-chip-row">
                    <span>{habitInsight.rate}% today</span>
                    <span>{habitInsight.bestStreak} day streak</span>
                  </div>
                </button>

                <button className="snippet-card finance-card" onClick={() => setActiveTab("finance")}>
                  <div className="snippet-topline">
                    <div className="snippet-icon emerald"><FinanceTrackerIcon size={16} /></div>
                    <span className="snippet-kicker">Finance</span>
                  </div>
                  <h3>Cashflow pulse</h3>
                  <p>{financeInsight.featuredLabel}</p>
                  <div className="snippet-chip-row">
                    <span>{formatWorkspaceCurrency(financeInsight.monthlyExpense)} spent</span>
                    <span>{formatWorkspaceCurrency(financeInsight.monthlyIncome)} earned</span>
                  </div>
                </button>

                <button className="snippet-card planner-card" onClick={() => setActiveTab("planner")}>
                  <div className="snippet-topline">
                    <div className="snippet-icon blue"><FocusPlannerIcon size={16} /></div>
                    <span className="snippet-kicker">Focus</span>
                  </div>
                  <h3>Next deep work</h3>
                  <p>{shortenValue(plannerInsight.featuredTask)}</p>
                  <div className="snippet-chip-row">
                    <span>{plannerInsight.remaining} open</span>
                    <span>Pomodoro ready</span>
                  </div>
                </button>

                <button className="snippet-card notes-card" onClick={() => setActiveTab("notes")}>
                  <div className="snippet-topline">
                    <div className="snippet-icon amber"><QuickNotesIcon size={16} /></div>
                    <span className="snippet-kicker">Notes</span>
                  </div>
                  <h3>Latest idea</h3>
                  <p>{shortenValue(notesInsight.featuredSnippet)}</p>
                  <div className="snippet-chip-row">
                    <span>{notesInsight.count} saved</span>
                    <span>{notesInsight.featuredTitle}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "habits" && <HabitsApp userId={userKey} />}
        {activeTab === "finance" && <FinanceApp userId={userKey} globalCurrency={settings.currency} />}
        
        {/* Render PlannerApp continuously to keep Pomodoro timer running on tab switches */}
        <div style={{ display: activeTab === "planner" ? "block" : "none" }}>
          <PlannerApp userId={userKey} globalFocusTime={settings.pomodoroFocus} globalBreakTime={settings.pomodoroBreak} />
        </div>
        
        {activeTab === "notes" && <NotesApp userId={userKey} />}
        {activeTab === "settings" && <SettingsApp userId={userKey} settings={settings} onSave={saveWorkspaceSettings} email={user.email || ""} />}
      </main>

      {/* Custom Glassmorphic Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="signout-modal-overlay" onClick={() => setShowSignOutConfirm(false)}>
          <div className="signout-modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="signout-modal-header">
              <div className="signout-icon-badge">
                <LogOut className="w-5 h-5 text-rose-400" />
              </div>
              <div className="signout-text-content">
                <h3 className="signout-modal-title">Sign Out of Stack</h3>
                <p className="signout-modal-desc">Are you sure you want to log out of your workspace?</p>
              </div>
            </div>
            <div className="signout-modal-actions">
              <button
                type="button"
                className="signout-btn-cancel"
                onClick={() => setShowSignOutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="signout-btn-confirm"
                onClick={confirmSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
