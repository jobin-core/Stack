import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, TrendingUp, TrendingDown,
  Info, Calendar, Wallet,
  CreditCard, ArrowLeftRight, PieChart, List,
  Search, Briefcase,
  Percent, Gift, Utensils, Pizza, Coffee, ShoppingBag,
  Home, Key, Receipt, Tv, Gamepad2, Car, Plane,
  Activity, School, Heart, Smile, Film, Music,
  BookOpen, Camera, Shield, Coins, X, Pencil, Check, MoreVertical
} from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Interfaces
interface Account {
  id: string;
  name: string;
  accountId: string; // card digits suffix or code
  cardExpiry: string; // MM/YY
  startBalance: number;
  transactionBalance: number;
  type: "Bank" | "Physical Cash" | "Investment" | "Credit Card" | "Debit Card";
  color: string;
  includeInTotal: number; // 1 or 0
  creditLimit: number; // for Credit Cards
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string; // icon name string key
}

interface AccountTransaction {
  id: string;
  note: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  date: string; // YYYY-MM-DD
  categoryId: string; // empty/default for transfer
  accountId: string; // origin wallet
  targetAccountId?: string; // destination wallet (only for transfer)
}

interface ScheduledPayment {
  id: string;
  amount: number;
  note: string;
  type: "income" | "expense" | "transfer";
  accountId: string;
  targetAccountId?: string;
  categoryId: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  startDate: string;
  lastTriggeredDate?: string;
  nextTriggerDate: string;
  isActive: number; // 1 or 0
}

interface FinanceSettings {
  currency?: string;
}

interface FinanceAppProps {
  userId: string;
  globalCurrency?: string;
}

// Icon Mapping
const IconComponents: Record<string, React.ComponentType<any>> = {
  wallet: Wallet,
  card: CreditCard,
  transfer: ArrowLeftRight,
  salary: Coins,
  work: Briefcase,
  business: Briefcase,
  interest: Percent,
  rent_received: Home,
  gifts: Gift,
  savings: Wallet,
  stocks: TrendingUp,
  restaurant: Utensils,
  pizza: Pizza,
  coffee: Coffee,
  grocery: ShoppingBag,
  shopping: ShoppingBag,
  rent_paid: Key,
  bills: Receipt,
  utilities: Receipt,
  wifi: Receipt,
  gadgets: Tv,
  gaming: Gamepad2,
  car: Car,
  travel: Plane,
  medical: Activity,
  education: School,
  charity: Heart,
  celebration: Smile,
  entertainment: Film,
  music: Music,
  book: BookOpen,
  photography: Camera,
  sports: Activity,
  insurance: Shield,
  miscellaneous: Info
};

// Default Lists
const defaultCategories: Category[] = [
  { id: "cat-1", name: "Food", type: "expense", color: "#FF6B81", icon: "restaurant" },
  { id: "cat-2", name: "Rent & Bills", type: "expense", color: "#E056FD", icon: "rent_paid" },
  { id: "cat-3", name: "Shopping", type: "expense", color: "#F2C94C", icon: "shopping" },
  { id: "cat-4", name: "Transport", type: "expense", color: "#54A0FF", icon: "car" },
  { id: "cat-5", name: "Entertainment", type: "expense", color: "#BB6BD9", icon: "entertainment" },
  { id: "cat-6", name: "Taxes & Legal", type: "expense", color: "#8395A7", icon: "insurance" },
  { id: "cat-7", name: "Salary", type: "income", color: "#63CF93", icon: "salary" },
  { id: "cat-8", name: "Investments", type: "income", color: "#00E5A0", icon: "stocks" },
  { id: "cat-9", name: "Gifts & Grants", type: "income", color: "#FF7F50", icon: "gifts" },
  { id: "cat-10", name: "Refunds", type: "income", color: "#10AC84", icon: "miscellaneous" }
];

const defaultAccounts: Account[] = [
  {
    id: "acc-cash",
    name: "Physical Cash",
    accountId: "CASH",
    cardExpiry: "",
    startBalance: 0,
    transactionBalance: 0,
    type: "Physical Cash",
    color: "#F2994A",
    includeInTotal: 1,
    creditLimit: 0
  }
];

export const FinanceApp: React.FC<FinanceAppProps> = ({ userId, globalCurrency }) => {
  // Main Database States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [schedules, setSchedules] = useState<ScheduledPayment[]>([]);
  const [settings, setSettings] = useState<FinanceSettings>({});

  // Navigation & Control tabs: 'dashboard', 'transactions', 'wallets', 'schedules', 'analytics'
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [saveToastMsg, setSaveToastMsg] = useState<string>("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals Visibility
  const [showTxModal, setShowTxModal] = useState<boolean>(false);

  // Hidden account numbers toggle
  const [hideCardNumbers] = useState<boolean>(true);
  const [sidebarForm, setSidebarForm] = useState<"wallet" | "category">("wallet");
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".habit-menu-wrap")) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleGlobalPointerDown);
    return () => document.removeEventListener("mousedown", handleGlobalPointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const showSaveToast = (message: string) => {
    setSaveToastMsg(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setSaveToastMsg(""), 2200);
  };

  // Filter States inside Transactions Tab
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("All"); // 'All', 'income', 'expense', 'transfer'
  const [filterDate, setFilterDate] = useState<string>("Month"); // 'All', 'Month', 'Custom'
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Add Transaction Form States
  const [txNote, setTxNote] = useState<string>("");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txType, setTxType] = useState<"income" | "expense" | "transfer">("expense");
  const [txAccountId, setTxAccountId] = useState<string>("");
  const [txTargetAccountId, setTxTargetAccountId] = useState<string>("");
  const [txCategoryId, setTxCategoryId] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Add Account Form States
  const [accName, setAccName] = useState<string>("");
  const [accType, setAccType] = useState<Account["type"]>("Bank");
  const [accLast4, setAccLast4] = useState<string>("");
  const [accExpiry, setAccExpiry] = useState<string>("");
  const [accStartBalance, setAccStartBalance] = useState<string>("");
  const [accColor, setAccColor] = useState<string>("#2D9CDB");
  const [accIncludeTotal, setAccIncludeTotal] = useState<boolean>(true);
  const [accCreditLimit, setAccCreditLimit] = useState<string>("");

  // Add Category Form States
  const [catName, setCatName] = useState<string>("");
  const [catType, setCatType] = useState<"income" | "expense">("expense");
  const [catColor, setCatColor] = useState<string>("#FF6B81");
  const [catIcon, setCatIcon] = useState<string>("restaurant");

  // Add Scheduled Form States
  const [schNote, setSchNote] = useState<string>("");
  const [schAmount, setSchAmount] = useState<string>("");
  const [schType, setSchType] = useState<"income" | "expense" | "transfer">("expense");
  const [schAccountId, setSchAccountId] = useState<string>("");
  const [schTargetAccountId, setSchTargetAccountId] = useState<string>("");
  const [schCategoryId, setSchCategoryId] = useState<string>("");
  const [schFrequency, setSchFrequency] = useState<ScheduledPayment["frequency"]>("monthly");
  const [schStartDate, setSchStartDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Editing Mode States
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [isSnapshotCollapsed, setIsSnapshotCollapsed] = useState(true);
  const [showAllExpenseLegend, setShowAllExpenseLegend] = useState(false);
  const [showAllIncomeLegend, setShowAllIncomeLegend] = useState(false);
  const [isWalletFormCollapsed, setIsWalletFormCollapsed] = useState(true);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
  const [isRecurringFormCollapsed, setIsRecurringFormCollapsed] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 968);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  const currencyCode = (globalCurrency || settings.currency || "USD").toUpperCase();
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currencyCode} ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
  };

  const formatCurrencyCompact = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    } catch {
      const absVal = Math.abs(value);
      if (absVal >= 1_000_000_000) return `${currencyCode} ${(value / 1_000_000_000).toFixed(1)}B`;
      if (absVal >= 1_000_000) return `${currencyCode} ${(value / 1_000_000).toFixed(1)}M`;
      if (absVal >= 1_000) return `${currencyCode} ${(value / 1_000).toFixed(1)}K`;
      return `${currencyCode} ${value.toFixed(0)}`;
    }
  };

  // Helper date frequencies
  const addFrequency = (dateStr: string, frequency: string): string => {
    const date = new Date(dateStr + "T00:00:00");
    switch (frequency.toLowerCase()) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setDate(date.getDate() + 30);
    }
    return date.toISOString().split("T")[0];
  };

  // Load finance data
  useEffect(() => {
    const fetchData = async () => {
      try {
        let loadedAccounts: Account[] = [];
        let loadedCategories: Category[] = [];
        let loadedTransactions: AccountTransaction[] = [];
        let loadedSchedules: ScheduledPayment[] = [];
        let loadedSettings: Record<string, string> = {};
        let needsSave = false;

        if (db && userId) {
          const docRef = doc(db, "user", userId, "productivity", "finance_v2");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            loadedAccounts = data.accounts || [];
            loadedCategories = data.categories || [];
            loadedTransactions = data.transactions || [];
            loadedSchedules = data.schedules || [];
            loadedSettings = data.settings || {};
          } else {
            // Attempt migration from v1 simple finance doc
            const v1Ref = doc(db, "user", userId, "productivity", "finance");
            const v1Snap = await getDoc(v1Ref);
            if (v1Snap.exists() && v1Snap.data().transactions) {
              const legacyTx = v1Snap.data().transactions || [];
              loadedAccounts = [...defaultAccounts];
              loadedCategories = [...defaultCategories];

              // Migrate legacy format
              loadedTransactions = legacyTx.map((tx: any) => {
                // Match category ID
                const matchedCat = loadedCategories.find(c => c.name.toLowerCase() === tx.category.toLowerCase()) ||
                  loadedCategories.find(c => c.type === tx.type) ||
                  loadedCategories[0];
                return {
                  id: tx.id || Date.now() + Math.random().toString(),
                  note: tx.description || "Legacy Entry",
                  amount: tx.amount || 0,
                  type: tx.type,
                  date: tx.date || todayStr,
                  categoryId: matchedCat.id,
                  accountId: loadedAccounts[0]?.id || "acc-cash"
                };
              });
              needsSave = true;
            } else {
              // Fresh onboarding defaults
              loadedAccounts = [...defaultAccounts];
              loadedCategories = [...defaultCategories];
              needsSave = true;
            }
          }
        } else {
          loadedAccounts = [...defaultAccounts];
          loadedCategories = [...defaultCategories];
          needsSave = true;
        }

        // Always check transaction balances match sums
        loadedAccounts.forEach(acc => {
          let transSum = 0;
          loadedTransactions.forEach(t => {
            if (t.accountId === acc.id) {
              if (t.type === "income") transSum += t.amount;
              else transSum -= t.amount; // expense / transfer source
            }
            if (t.type === "transfer" && t.targetAccountId === acc.id) {
              transSum += t.amount; // transfer destination
            }
          });
          acc.transactionBalance = transSum;
        });

        // RUN SCHEDULED PAYMENTS PROCESSING ENGINE
        if (loadedSchedules.length > 0) {
          const engine = processScheduledPayments(loadedSchedules, loadedTransactions, loadedAccounts);
          if (engine.hasChanges) {
            loadedTransactions = [...engine.newTransactions, ...loadedTransactions];
            loadedSchedules = engine.updatedSchedules;
            loadedAccounts = engine.updatedAccounts;
            needsSave = true;
          }
        }

        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
        setTransactions(loadedTransactions);
        setSchedules(loadedSchedules);
        setSettings(loadedSettings);

        if (needsSave) {
          saveAllData(loadedAccounts, loadedCategories, loadedTransactions, loadedSchedules, loadedSettings);
        }
        setLoading(false);
      } catch (e) {
        console.error("Critical finance app fetch failed: ", e);
        setErrorMsg("Failed to synchronize cloud balances.");
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Sync / Save utility
  const saveAllData = async (
    accs: Account[],
    cats: Category[],
    txs: AccountTransaction[],
    schs: ScheduledPayment[],
    settingsParam: FinanceSettings = settings
  ): Promise<boolean> => {
    // Cloud firestore sync
    try {
      if (db && userId) {
        const docRef = doc(db, "user", userId, "productivity", "finance_v2");
        await setDoc(
          docRef,
          { accounts: accs, categories: cats, transactions: txs, schedules: schs, settings: settingsParam },
          { merge: true }
        );
        return true;
      }
      return false;
    } catch (e: any) {
      console.warn("Firestore finance sync failed: ", e);
      setErrorMsg("Cloud save failed. Your latest changes may not be persisted.");
      setTimeout(() => setErrorMsg(""), 3000);
      return false;
    }
  };

  // Scheduled Payments Processing Logic
  const processScheduledPayments = (
    schs: ScheduledPayment[],
    txs: AccountTransaction[],
    accs: Account[]
  ) => {
    const newTransactions: AccountTransaction[] = [];
    const updatedSchedules = schs.map(s => ({ ...s }));
    const updatedAccounts = accs.map(a => ({ ...a }));
    let hasChanges = false;

    updatedSchedules.forEach((schedule) => {
      if (schedule.isActive !== 1) return;

      let nextTrigger = schedule.nextTriggerDate;
      let lastTriggered = schedule.lastTriggeredDate;
      let localChanged = false;

      while (nextTrigger <= todayStr) {
        // Prevent inserting duplicates
        const exists = txs.some(t =>
          t.amount === schedule.amount &&
          t.date === nextTrigger &&
          t.note === schedule.note &&
          t.type === schedule.type &&
          t.accountId === schedule.accountId &&
          t.categoryId === schedule.categoryId
        ) || newTransactions.some(t =>
          t.amount === schedule.amount &&
          t.date === nextTrigger &&
          t.note === schedule.note &&
          t.type === schedule.type &&
          t.accountId === schedule.accountId &&
          t.categoryId === schedule.categoryId
        );

        if (!exists) {
          const newTx: AccountTransaction = {
            id: `sch-tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            note: schedule.note,
            amount: schedule.amount,
            type: schedule.type,
            date: nextTrigger,
            categoryId: schedule.categoryId,
            accountId: schedule.accountId,
            ...(schedule.type === "transfer" && schedule.targetAccountId
              ? { targetAccountId: schedule.targetAccountId }
              : {})
          };
          newTransactions.push(newTx);

          // Re-index origin wallet
          const originAcc = updatedAccounts.find(a => a.id === schedule.accountId);
          if (originAcc) {
            if (schedule.type === "income") originAcc.transactionBalance += schedule.amount;
            else originAcc.transactionBalance -= schedule.amount;
          }
          // Re-index target wallet if transfer
          if (schedule.type === "transfer" && schedule.targetAccountId) {
            const targetAcc = updatedAccounts.find(a => a.id === schedule.targetAccountId);
            if (targetAcc) targetAcc.transactionBalance += schedule.amount;
          }
        }

        lastTriggered = nextTrigger;
        nextTrigger = addFrequency(nextTrigger, schedule.frequency);
        localChanged = true;
        hasChanges = true;
      }

      if (localChanged) {
        schedule.lastTriggeredDate = lastTriggered;
        schedule.nextTriggerDate = nextTrigger;
      }
    });

    return {
      newTransactions,
      updatedSchedules,
      updatedAccounts,
      hasChanges
    };
  };

  const startEditTransaction = (tx: AccountTransaction) => {
    setOpenActionMenuId(null);
    setEditingTransactionId(tx.id);
    setTxNote(tx.note);
    setTxAmount(tx.amount.toString());
    setTxType(tx.type);
    setTxAccountId(tx.accountId);
    setTxTargetAccountId(tx.targetAccountId || "");
    setTxCategoryId(tx.categoryId || "");
    setTxDate(tx.date);
    setShowTxModal(true);
  };

  const cancelEditTransaction = () => {
    setEditingTransactionId(null);
    setTxNote("");
    setTxAmount("");
    setTxType("expense");
    setTxAccountId("");
    setTxTargetAccountId("");
    setTxCategoryId("");
    setTxDate(new Date().toISOString().split("T")[0]);
    setShowTxModal(false);
  };

  // Add Transaction Handler
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || parseFloat(txAmount) <= 0 || !txAccountId) {
      alert("Please specify a valid amount and source wallet.");
      return;
    }

    const matchedAccount = accounts.find(a => a.id === txAccountId);
    if (!matchedAccount) return;

    if (txType === "transfer" && !txTargetAccountId) {
      alert("Please select a target wallet for transfer.");
      return;
    }
    if (txType === "transfer" && txAccountId === txTargetAccountId) {
      alert("Source and target wallets must be different.");
      return;
    }

    const noteText = txNote.trim() || (txType === "transfer" ? "Transfer" : "Transaction");

    if (editingTransactionId) {
      const oldTx = transactions.find(t => t.id === editingTransactionId);
      if (!oldTx) return;

      // 1. Revert the old transaction's balances
      const revertedAcc = accounts.map(acc => {
        let balanceOffset = 0;
        if (acc.id === oldTx.accountId) {
          balanceOffset = oldTx.type === "income" ? -oldTx.amount : oldTx.amount;
        }
        if (oldTx.type === "transfer" && acc.id === oldTx.targetAccountId) {
          balanceOffset = -oldTx.amount;
        }
        return {
          ...acc,
          transactionBalance: acc.transactionBalance + balanceOffset
        };
      });

      // 2. Apply the updated transaction's details and balances
      const updatedAmount = parseFloat(txAmount);
      const updatedTx = transactions.map(t =>
        t.id === editingTransactionId ? {
          id: t.id,
          note: noteText,
          amount: updatedAmount,
          type: txType,
          date: txDate,
          categoryId: txType === "transfer" ? "" : (txCategoryId || categories.find(c => c.type === txType)?.id || ""),
          accountId: txAccountId,
          ...(txType === "transfer" ? { targetAccountId: txTargetAccountId } : {})
        } : t
      );

      const finalAcc = revertedAcc.map(acc => {
        let balanceOffset = 0;
        if (acc.id === txAccountId) {
          balanceOffset = txType === "income" ? updatedAmount : -updatedAmount;
        }
        if (txType === "transfer" && acc.id === txTargetAccountId) {
          balanceOffset = updatedAmount;
        }
        return {
          ...acc,
          transactionBalance: acc.transactionBalance + balanceOffset
        };
      });

      setTransactions(updatedTx);
      setAccounts(finalAcc);
      const didSave = await saveAllData(finalAcc, categories, updatedTx, schedules);
      if (didSave) {
        showSaveToast("Transaction updated");
        cancelEditTransaction();
      }
    } else {
      const newTx: AccountTransaction = {
        id: `tx-${Date.now()}`,
        note: noteText,
        amount: parseFloat(txAmount),
        type: txType,
        date: txDate,
        categoryId: txType === "transfer" ? "" : (txCategoryId || categories.find(c => c.type === txType)?.id || ""),
        accountId: txAccountId,
        ...(txType === "transfer" ? { targetAccountId: txTargetAccountId } : {})
      };

      const updatedTx = [newTx, ...transactions];
      const updatedAcc = accounts.map(acc => {
        let balanceOffset = 0;
        if (acc.id === txAccountId) {
          balanceOffset = txType === "income" ? newTx.amount : -newTx.amount;
        }
        if (txType === "transfer" && acc.id === txTargetAccountId) {
          balanceOffset = newTx.amount;
        }
        return {
          ...acc,
          transactionBalance: acc.transactionBalance + balanceOffset
        };
      });

      setTransactions(updatedTx);
      setAccounts(updatedAcc);
      const didSave = await saveAllData(updatedAcc, categories, updatedTx, schedules);
      if (didSave) {
        showSaveToast("Transaction saved");

        // Reset Form
        setTxNote("");
        setTxAmount("");
        setTxType("expense");
        setTxAccountId("");
        setTxTargetAccountId("");
        setTxCategoryId("");
        setShowTxModal(false);
      }
    }
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = async (id: string) => {
    setOpenActionMenuId(null);
    if (!window.confirm("Delete this transaction? This will restore balances.")) return;

    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;

    const updatedTx = transactions.filter(t => t.id !== id);
    const updatedAcc = accounts.map(acc => {
      let balanceOffset = 0;
      if (acc.id === txToDelete.accountId) {
        // Reverse original transaction impact
        balanceOffset = txToDelete.type === "income" ? -txToDelete.amount : txToDelete.amount;
      }
      if (txToDelete.type === "transfer" && acc.id === txToDelete.targetAccountId) {
        balanceOffset = -txToDelete.amount;
      }
      return {
        ...acc,
        transactionBalance: acc.transactionBalance + balanceOffset
      };
    });

    setTransactions(updatedTx);
    setAccounts(updatedAcc);
    const didSave = await saveAllData(updatedAcc, categories, updatedTx, schedules);
    if (didSave) {
      showSaveToast("Transaction deleted");
    }
  };

  // Toggle Account Inclusion in Totals
  const handleToggleAccountInTotal = (accountId: string, included: boolean) => {
    const updated = accounts.map(a =>
      a.id === accountId ? { ...a, includeInTotal: included ? 1 : 0 } : a
    );
    setAccounts(updated);
    saveAllData(updated, categories, transactions, schedules);
  };

  const startEditAccount = (acc: Account) => {
    setOpenActionMenuId(null);
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccLast4(acc.accountId === "••••" ? "" : acc.accountId);
    setAccExpiry(acc.cardExpiry);
    setAccStartBalance(acc.startBalance.toString());
    setAccColor(acc.color);
    setAccIncludeTotal(acc.includeInTotal === 1);
    setAccCreditLimit(acc.creditLimit ? acc.creditLimit.toString() : "");
    setIsWalletFormCollapsed(false);
    setTimeout(() => {
      document.querySelector(".app-sidebar-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
    setAccName("");
    setAccType("Bank");
    setAccLast4("");
    setAccExpiry("");
    setAccStartBalance("");
    setAccColor("#2D9CDB");
    setAccIncludeTotal(true);
    setAccCreditLimit("");
  };

  // Add Account Handler
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    if (editingAccountId) {
      const updatedAcc = accounts.map(a =>
        a.id === editingAccountId ? {
          ...a,
          name: accName.trim(),
          type: accType,
          accountId: accLast4.trim() || "••••",
          cardExpiry: accType.includes("Card") ? (accExpiry.trim() || "12/28") : "",
          startBalance: parseFloat(accStartBalance) || 0,
          color: accColor,
          includeInTotal: accIncludeTotal ? 1 : 0,
          creditLimit: accType === "Credit Card" ? (parseFloat(accCreditLimit) || 0) : 0
        } : a
      );
      setAccounts(updatedAcc);
      saveAllData(updatedAcc, categories, transactions, schedules);
      cancelEditAccount();
    } else {
      const newAcc: Account = {
        id: `acc-${Date.now()}`,
        name: accName.trim(),
        type: accType,
        accountId: accLast4.trim() || "••••",
        cardExpiry: accType.includes("Card") ? (accExpiry.trim() || "12/28") : "",
        startBalance: parseFloat(accStartBalance) || 0,
        transactionBalance: 0,
        color: accColor,
        includeInTotal: accIncludeTotal ? 1 : 0,
        creditLimit: accType === "Credit Card" ? (parseFloat(accCreditLimit) || 0) : 0
      };

      const updatedAcc = [...accounts, newAcc];
      setAccounts(updatedAcc);
      saveAllData(updatedAcc, categories, transactions, schedules);

      // Reset Form
      setAccName("");
      setAccType("Bank");
      setAccLast4("");
      setAccExpiry("");
      setAccStartBalance("");
      setAccColor("#2D9CDB");
      setAccIncludeTotal(true);
      setAccCreditLimit("");
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = (id: string) => {
    setOpenActionMenuId(null);
    if (accounts.length <= 1) {
      alert("You must keep at least one wallet account.");
      return;
    }
    if (!window.confirm("Delete this wallet? Note: All transactions linked to this wallet will also be permanently deleted.")) return;

    const updatedAcc = accounts.filter(a => a.id !== id);
    const updatedTx = transactions.filter(t => t.accountId !== id && t.targetAccountId !== id);

    // Recalculate transaction balances on remaining
    updatedAcc.forEach(acc => {
      let sum = 0;
      updatedTx.forEach(t => {
        if (t.accountId === acc.id) {
          if (t.type === "income") sum += t.amount;
          else sum -= t.amount;
        }
        if (t.type === "transfer" && t.targetAccountId === acc.id) {
          sum += t.amount;
        }
      });
      acc.transactionBalance = sum;
    });

    setAccounts(updatedAcc);
    setTransactions(updatedTx);
    saveAllData(updatedAcc, categories, updatedTx, schedules);
  };

  const startEditCategory = (cat: Category) => {
    setOpenActionMenuId(null);
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatColor(cat.color);
    setCatIcon(cat.icon);
    setIsWalletFormCollapsed(false);
    setTimeout(() => {
      document.querySelector(".app-sidebar-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setCatName("");
    setCatColor("#FF6B81");
    setCatIcon("restaurant");
  };

  // Add Category Handler
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategoryId) {
      const updatedCats = categories.map(c =>
        c.id === editingCategoryId ? {
          ...c,
          name: catName.trim(),
          type: catType,
          color: catColor,
          icon: catIcon
        } : c
      );
      setCategories(updatedCats);
      saveAllData(accounts, updatedCats, transactions, schedules);
      cancelEditCategory();
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: catName.trim(),
        type: catType,
        color: catColor,
        icon: catIcon
      };

      const updatedCats = [...categories, newCat];
      setCategories(updatedCats);
      saveAllData(accounts, updatedCats, transactions, schedules);

      setCatName("");
      setCatColor("#FF6B81");
      setCatIcon("restaurant");
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = (id: string) => {
    setOpenActionMenuId(null);
    if (categories.filter(c => c.type === "expense").length <= 1 || categories.filter(c => c.type === "income").length <= 1) {
      alert("Must maintain at least one category per transaction type.");
      return;
    }
    if (!window.confirm("Delete this category? Transactions linked to this category will revert to miscellaneous category.")) return;

    const fallbackCat = categories.find(c => c.id !== id && c.type === categories.find(x => x.id === id)?.type);
    if (!fallbackCat) return;

    const updatedCats = categories.filter(c => c.id !== id);
    const updatedTx = transactions.map(t => {
      if (t.categoryId === id) {
        return { ...t, categoryId: fallbackCat.id };
      }
      return t;
    });

    setCategories(updatedCats);
    setTransactions(updatedTx);
    saveAllData(accounts, updatedCats, updatedTx, schedules);
  };

  const startEditSchedule = (sch: ScheduledPayment) => {
    setOpenActionMenuId(null);
    setEditingScheduleId(sch.id);
    setSchNote(sch.note);
    setSchAmount(sch.amount.toString());
    setSchType(sch.type);
    setSchAccountId(sch.accountId);
    setSchTargetAccountId(sch.targetAccountId || "");
    setSchCategoryId(sch.categoryId || "");
    setSchFrequency(sch.frequency);
    setSchStartDate(sch.startDate);
    setIsRecurringFormCollapsed(false);
    setTimeout(() => {
      document.querySelector(".app-sidebar-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const cancelEditSchedule = () => {
    setEditingScheduleId(null);
    setSchNote("");
    setSchAmount("");
    setSchType("expense");
    setSchAccountId("");
    setSchTargetAccountId("");
    setSchCategoryId("");
    setSchFrequency("monthly");
    setSchStartDate(new Date().toISOString().split("T")[0]);
  };

  // Add Scheduled Payment Handler
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schAmount || parseFloat(schAmount) <= 0 || !schAccountId) {
      alert("Invalid schedule amount or wallet selection.");
      return;
    }
    if (schType === "transfer" && !schTargetAccountId) {
      alert("Please select a destination account for the transfer.");
      return;
    }

    if (editingScheduleId) {
      const updatedSchs = schedules.map(s =>
        s.id === editingScheduleId ? {
          ...s,
          amount: parseFloat(schAmount),
          note: schNote.trim() || "Recurring Payment",
          type: schType,
          accountId: schAccountId,
          categoryId: schType === "transfer" ? "" : (schCategoryId || categories.find(c => c.type === schType)?.id || ""),
          frequency: schFrequency,
          startDate: schStartDate,
          nextTriggerDate: schStartDate, // Reset next trigger so it evaluates with updated details
          ...(schType === "transfer" ? { targetAccountId: schTargetAccountId } : {})
        } : s
      );

      const engine = processScheduledPayments(updatedSchs, transactions, accounts);
      setSchedules(engine.updatedSchedules);
      if (engine.hasChanges) {
        setTransactions([...engine.newTransactions, ...transactions]);
        setAccounts(engine.updatedAccounts);
        saveAllData(engine.updatedAccounts, categories, [...engine.newTransactions, ...transactions], engine.updatedSchedules);
      } else {
        saveAllData(accounts, categories, transactions, engine.updatedSchedules);
      }
      cancelEditSchedule();
    } else {
      const newSch: ScheduledPayment = {
        id: `sch-${Date.now()}`,
        amount: parseFloat(schAmount),
        note: schNote.trim() || "Recurring Payment",
        type: schType,
        accountId: schAccountId,
        categoryId: schType === "transfer" ? "" : (schCategoryId || categories.find(c => c.type === schType)?.id || ""),
        frequency: schFrequency,
        startDate: schStartDate,
        nextTriggerDate: schStartDate,
        isActive: 1,
        ...(schType === "transfer" ? { targetAccountId: schTargetAccountId } : {})
      };

      const updatedSchs = [...schedules, newSch];

      // Process retroactively if start date is in the past
      const engine = processScheduledPayments(updatedSchs, transactions, accounts);

      setSchedules(engine.updatedSchedules);
      if (engine.hasChanges) {
        setTransactions([...engine.newTransactions, ...transactions]);
        setAccounts(engine.updatedAccounts);
        saveAllData(engine.updatedAccounts, categories, [...engine.newTransactions, ...transactions], engine.updatedSchedules);
      } else {
        saveAllData(accounts, categories, transactions, engine.updatedSchedules);
      }

      // Reset Form
      setSchNote("");
      setSchAmount("");
      setSchAccountId("");
      setSchTargetAccountId("");
      setSchCategoryId("");
      setSchFrequency("monthly");
      setSchStartDate(todayStr);
    }
  };

  // Toggle Schedule Pause state
  const handleToggleSchedule = (id: string, active: boolean) => {
    const updated = schedules.map(s => {
      if (s.id === id) {
        return { ...s, isActive: active ? 1 : 0 };
      }
      return s;
    });

    // Run engine to check if it missed cycles while paused
    if (active) {
      const engine = processScheduledPayments(updated, transactions, accounts);
      setSchedules(engine.updatedSchedules);
      if (engine.hasChanges) {
        setTransactions([...engine.newTransactions, ...transactions]);
        setAccounts(engine.updatedAccounts);
        saveAllData(engine.updatedAccounts, categories, [...engine.newTransactions, ...transactions], engine.updatedSchedules);
      } else {
        saveAllData(accounts, categories, transactions, updated);
      }
    } else {
      setSchedules(updated);
      saveAllData(accounts, categories, transactions, updated);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = (id: string) => {
    setOpenActionMenuId(null);
    if (!window.confirm("Permanently delete this scheduled payment?")) return;
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    saveAllData(accounts, categories, transactions, updated);
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ["Date", "Note", "Type", "Amount", "Source Wallet", "Destination Wallet", "Category"];
    const rows = filteredTransactions.map(t => {
      const originName = accounts.find(a => a.id === t.accountId)?.name || "Unknown";
      const targetName = t.targetAccountId ? (accounts.find(a => a.id === t.targetAccountId)?.name || "Unknown") : "";
      const catName = categories.find(c => c.id === t.categoryId)?.name || "";
      return [
        t.date,
        `"${t.note.replace(/"/g, '""')}"`,
        t.type,
        t.amount,
        originName,
        targetName,
        catName
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finance_ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Core Financial Math
  // Net balance = all included accounts (subtract credit card debt)
  const netBalance = accounts
    .filter(a => a.includeInTotal === 1)
    .reduce((sum, acc) => {
      const bal = acc.startBalance + acc.transactionBalance;
      if (acc.type === "Credit Card") {
        return sum - Math.abs(bal);
      }
      return sum + bal;
    }, 0);

  const liquidityBalance = accounts
    .filter(a => a.includeInTotal === 1 && (a.type === "Bank" || a.type === "Physical Cash"))
    .reduce((sum, acc) => sum + acc.startBalance + acc.transactionBalance, 0);

  const creditDebt = accounts
    .filter(a => a.includeInTotal === 1 && a.type === "Credit Card")
    .reduce((sum, acc) => sum + Math.abs(acc.startBalance + acc.transactionBalance), 0);

  const currentMonthStr = todayStr.substring(0, 7);
  const monthlyIncome = transactions
    .filter(t => t.type === "income" && t.date.startsWith(currentMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = transactions
    .filter(t => t.type === "expense" && t.date.startsWith(currentMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyNet = monthlyIncome - monthlyExpenses;

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const includedAccountsCount = accounts.filter(a => a.includeInTotal === 1).length;
  const activeSchedulesCount = schedules.filter(s => s.isActive === 1).length;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const topExpenseCategory = categories
    .filter(c => c.type === "expense")
    .map(category => {
      const total = transactions
        .filter(tx => tx.type === "expense" && tx.categoryId === category.id && tx.date.startsWith(currentMonthStr))
        .reduce((sum, tx) => sum + tx.amount, 0);
      return { ...category, total };
    })
    .sort((a, b) => b.total - a.total)[0];

  const financeHealthTone = monthlyNet >= 0 ? "positive" : "negative";
  const financeHealthLabel =
    monthlyIncome === 0 && monthlyExpenses === 0
      ? "Quiet month"
      : monthlyNet >= 0
        ? "Healthy cash flow"
        : "Spending above income";
  const financeHealthMessage =
    monthlyIncome === 0 && monthlyExpenses === 0
      ? "Start logging transactions to unlock clearer insights."
      : monthlyNet >= 0
        ? `You're ahead by ${formatCurrency(monthlyNet)} this month.`
        : `Expenses are outpacing income by ${formatCurrency(Math.abs(monthlyNet))}.`;


  // Filter Transaction Logic
  const filteredTransactions = transactions.filter(tx => {
    // 1. Text Search
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const originName = accounts.find(a => a.id === tx.accountId)?.name.toLowerCase() || "";
      const destName = tx.targetAccountId ? (accounts.find(a => a.id === tx.targetAccountId)?.name.toLowerCase() || "") : "";
      const catName = categories.find(c => c.id === tx.categoryId)?.name.toLowerCase() || "";
      const matchesText = tx.note.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q) ||
        originName.includes(q) ||
        destName.includes(q) ||
        catName.includes(q);
      if (!matchesText) return false;
    }

    // 2. Type Filter
    if (filterType !== "All" && tx.type !== filterType) {
      return false;
    }

    // 3. Date Filter
    if (filterDate === "Month") {
      const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
      if (!tx.date.startsWith(currentMonthStr)) return false;
    } else if (filterDate === "Custom") {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
    }

    return true;
  });

  // Filter Transaction metrics
  const filteredIncome = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpense = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const filteredTransferAmount = filteredTransactions
    .filter(t => t.type === "transfer")
    .reduce((sum, t) => sum + t.amount, 0);
  const filteredIncomeCount = filteredTransactions.filter(t => t.type === "income").length;
  const filteredExpenseCount = filteredTransactions.filter(t => t.type === "expense").length;
  const filteredTransferCount = filteredTransactions.filter(t => t.type === "transfer").length;
  const ledgerNetFlow = filteredIncome - filteredExpense;

  const resolveCategoryForAnalytics = (transaction: AccountTransaction) => {
    return categories.find(c => c.id === transaction.categoryId)
      || categories.find(c => c.name.toLowerCase() === transaction.categoryId.toLowerCase());
  };

  // Analytics Math: Expense Category Shares
  const expenseByCategory = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => {
      const resolvedCategory = resolveCategoryForAnalytics(t);
      const cat = resolvedCategory?.name || "Other";
      const color = resolvedCategory?.color || "#8395A7";
      if (!acc[cat]) acc[cat] = { amount: 0, color };
      acc[cat].amount += t.amount;
      return acc;
    }, {} as Record<string, { amount: number; color: string }>);

  const totalFilteredExpense = Object.values(expenseByCategory).reduce((sum, item) => sum + item.amount, 0);

  // Donut chart path parameters generator
  let accumulatedPercent = 0;
  const expenseChartSlices = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([name, data]) => {
    const percentage = totalFilteredExpense > 0 ? (data.amount / totalFilteredExpense) * 100 : 0;
    const offset = 25 - accumulatedPercent;
    accumulatedPercent += percentage;
    return {
      name,
      amount: data.amount,
      color: data.color,
      percent: percentage,
      strokeDash: `${percentage} ${100 - percentage}`,
      strokeOffset: offset
    };
    });

  // Income Category shares
  const incomeByCategory = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((acc, t) => {
      const resolvedCategory = resolveCategoryForAnalytics(t);
      const cat = resolvedCategory?.name || "Other";
      const color = resolvedCategory?.color || "#8395A7";
      if (!acc[cat]) acc[cat] = { amount: 0, color };
      acc[cat].amount += t.amount;
      return acc;
    }, {} as Record<string, { amount: number; color: string }>);

  const totalFilteredIncome = Object.values(incomeByCategory).reduce((sum, item) => sum + item.amount, 0);

  let accumulatedPercentIncome = 0;
  const incomeChartSlices = Object.entries(incomeByCategory)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([name, data]) => {
    const percentage = totalFilteredIncome > 0 ? (data.amount / totalFilteredIncome) * 100 : 0;
    const offset = 25 - accumulatedPercentIncome;
    accumulatedPercentIncome += percentage;
    return {
      name,
      amount: data.amount,
      color: data.color,
      percent: percentage,
      strokeDash: `${percentage} ${100 - percentage}`,
      strokeOffset: offset
    };
    });

  const totalWallets = accounts.length;
  const liquidWalletCount = accounts.filter(a => a.type === "Bank" || a.type === "Physical Cash").length;
  const investmentWalletCount = accounts.filter(a => a.type === "Investment").length;
  const totalCreditLimit = accounts
    .filter(a => a.type === "Credit Card")
    .reduce((sum, acc) => sum + acc.creditLimit, 0);
  const usedCreditLimit = accounts
    .filter(a => a.type === "Credit Card")
    .reduce((sum, acc) => sum + Math.abs(acc.startBalance + acc.transactionBalance), 0);
  const creditUtilizationRate = totalCreditLimit > 0 ? Math.round((usedCreditLimit / totalCreditLimit) * 100) : 0;
  const activeExpenseSchedules = schedules.filter(s => s.isActive === 1 && s.type === "expense");
  const activeIncomeSchedules = schedules.filter(s => s.isActive === 1 && s.type === "income");
  const recurringExpenseTotal = activeExpenseSchedules.reduce((sum, sch) => sum + sch.amount, 0);
  const recurringIncomeTotal = activeIncomeSchedules.reduce((sum, sch) => sum + sch.amount, 0);
  const nextScheduledPayment = [...schedules]
    .filter(s => s.isActive === 1)
    .sort((a, b) => a.nextTriggerDate.localeCompare(b.nextTriggerDate))[0];
  const largestExpenseSlice = expenseChartSlices[0];
  const largestIncomeSlice = incomeChartSlices[0];
  const legendVisibleLimit = 5;
  const visibleExpenseLegendSlices = showAllExpenseLegend
    ? expenseChartSlices
    : expenseChartSlices.slice(0, legendVisibleLimit);
  const visibleIncomeLegendSlices = showAllIncomeLegend
    ? incomeChartSlices
    : incomeChartSlices.slice(0, legendVisibleLimit);

  const walletAllocationBase = accounts
    .map(acc => ({ ...acc, balance: acc.startBalance + acc.transactionBalance }))
    .filter(acc => Math.abs(acc.balance) > 0);
  const totalWalletAllocationAbs = walletAllocationBase.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  let walletAllocationAccumulated = 0;
  const walletAllocationSlices = [...walletAllocationBase]
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .map(acc => {
      const allocationPercent = totalWalletAllocationAbs > 0
        ? (Math.abs(acc.balance) / totalWalletAllocationAbs) * 100
        : 0;
      const offset = 25 - walletAllocationAccumulated;
      walletAllocationAccumulated += allocationPercent;
      return {
        id: acc.id,
        name: acc.name,
        color: acc.color,
        balance: acc.balance,
        percent: allocationPercent,
        strokeDash: `${allocationPercent} ${100 - allocationPercent}`,
        strokeOffset: offset
      };
    });
  const walletAllocationTopSlices = walletAllocationSlices.slice(0, 5);
  const largestWalletSlice = walletAllocationSlices[0];
  const walletTypeTotals = accounts.reduce((accMap, acc) => {
    const balance = Math.abs(acc.startBalance + acc.transactionBalance);
    if (!accMap[acc.type]) accMap[acc.type] = 0;
    accMap[acc.type] += balance;
    return accMap;
  }, {} as Record<string, number>);
  const walletTypeMix = Object.entries(walletTypeTotals)
    .filter(([, total]) => total > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([type, total]) => ({
      type,
      total,
      percent: totalWalletAllocationAbs > 0 ? (total / totalWalletAllocationAbs) * 100 : 0
    }));
  const categoryUsageCounts = transactions.reduce((accMap, tx) => {
    if (!tx.categoryId) return accMap;
    const resolvedCategory = resolveCategoryForAnalytics(tx);
    if (!resolvedCategory) return accMap;
    accMap[resolvedCategory.id] = (accMap[resolvedCategory.id] || 0) + 1;
    return accMap;
  }, {} as Record<string, number>);

  const leadingAllocation = [...accounts]
    .map(acc => ({ ...acc, balance: acc.startBalance + acc.transactionBalance }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))[0];

  // Category Icon Renderer
  const renderCategoryIcon = (iconName: string, color: string, className = "w-4 h-4") => {
    const Component = IconComponents[iconName] || Info;
    return <Component className={className} style={{ color }} />;
  };

  const renderAccountTypeIcon = (accountType: Account["type"]) => {
    if (accountType === "Credit Card" || accountType === "Debit Card") return <CreditCard className="w-3 h-3" />;
    if (accountType === "Investment") return <Briefcase className="w-3 h-3" />;
    if (accountType === "Physical Cash") return <Coins className="w-3 h-3" />;
    return <Wallet className="w-3 h-3" />;
  };

  const renderTransactionRow = (tx: AccountTransaction) => {
    const wallet = accounts.find(a => a.id === tx.accountId);
    const destWallet = tx.targetAccountId ? accounts.find(a => a.id === tx.targetAccountId) : null;
    const cat = categories.find(c => c.id === tx.categoryId);
    const amountTone = tx.type === "income" ? "income" : tx.type === "transfer" ? "transfer" : "expense";
    const noteText = tx.note?.trim() || (tx.type === "transfer" ? "Transfer" : "Transaction");
    const accountText = tx.type === "transfer"
      ? `${wallet?.name || "Unknown wallet"}${destWallet ? ` -> ${destWallet.name}` : ""}`
      : (wallet?.name || "Unknown wallet");
    const categoryText = cat?.name || (tx.type === "transfer" ? "Internal transfer" : "Uncategorized");
    const displayDate = new Date(`${tx.date}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    return (
      <div key={tx.id} className={`ledger-row-card ${tx.type}`}>
        <div className="ledger-type-indicator">
          {tx.type === "transfer" ? (
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
          ) : tx.type === "income" ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          )}
        </div>

        <div className="ledger-details">
          <div className="ledger-title-row">
            <span className="ledger-desc" title={noteText}>{noteText}</span>
            <span className={`ledger-type-pill ${amountTone}`}>
              {tx.type === "income" ? "Income" : tx.type === "expense" ? "Expense" : "Transfer"}
            </span>
          </div>
          <div className="ledger-sub-info fin-flex fin-items-center fin-gap-2 text-xs text-slate-400">
            <span className="ledger-date">{displayDate}</span>
            <span className="ledger-account fin-flex fin-items-center fin-gap-1">
              <span className="bullet">•</span>
              {accountText}
            </span>
            <span className="bullet">•</span>
            <span className="ledger-category fin-flex fin-items-center fin-gap-1" title={categoryText}>
              {cat ? renderCategoryIcon(cat.icon, cat.color, "w-3 h-3") : <Info className="w-3 h-3 text-slate-500" />}
              {categoryText}
            </span>
          </div>
        </div>

        <div className="ledger-value-actions">
          <span className={`ledger-amount-chip ${amountTone}`}>
            {tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "-"}{formatCurrency(tx.amount)}
          </span>
          <div className="habit-menu-wrap">
            <button
              type="button"
              onClick={() => setOpenActionMenuId((current) => (current === `tx-${tx.id}` ? null : `tx-${tx.id}`))}
              className="action-icon-btn habit-menu-trigger"
              title="More actions"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {openActionMenuId === `tx-${tx.id}` && (
              <div className="habit-menu-popover" role="menu" aria-label="Transaction actions">
                <button type="button" className="habit-menu-item" onClick={() => startEditTransaction(tx)}>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button type="button" className="habit-menu-item danger" onClick={() => handleDeleteTransaction(tx.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="app-loader">
        <div className="spinner"></div>
        <p>Syncing finance ledger data...</p>
      </div>
    );
  }

  return (
    <div className="micro-app-container finance-app">
      {saveToastMsg && (
        <div className="finance-save-toast" role="status" aria-live="polite">
          <Check className="w-4 h-4" />
          <span>{saveToastMsg}</span>
        </div>
      )}

      {/* Alert display */}
      {errorMsg && (
        <div className="app-alert warn animate-bounce">
          <Info className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* App Tab Header */}
      <div className="finance-header-row">
        <div>
          <h2 className="app-title text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-400">
            Finance Tracker
          </h2>
          <p className="app-subtitle text-slate-400 text-sm">Ported multi-wallet accounting system.</p>
        </div>

        {/* Tab Selection */}
        <div className="fin-flex fin-items-center fin-gap-3">
          <div className="finance-tabs-list" style={{ margin: 0 }}>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`finance-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`finance-tab-btn ${activeTab === "transactions" ? "active" : ""}`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={`finance-tab-btn ${activeTab === "wallets" ? "active" : ""}`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Wallets</span>
            </button>
            <button
              onClick={() => setActiveTab("schedules")}
              className={`finance-tab-btn ${activeTab === "schedules" ? "active" : ""}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Recurring</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`finance-tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </div>

          <button
            onClick={() => setShowTxModal(true)}
            className="primary-btn"
            style={{ padding: "8px 16px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENTS: 1. DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="app-grid-layout animate-fade-in">
          {/* Left Sidebar Pane */}
          <div className="dashboard-left-column">
            <aside className="app-sidebar-card">
              <div className="fin-flex fin-justify-between fin-items-center fin-mb-4">
                <h3 className="card-sec-title !m-0">Aggregated Portfolio</h3>
              </div>

              {/* Net Worth stats box & Monthly Cashflow summary */}
              <div className="portfolio-networth-block fin-mb-5">
                <div className="fin-mb-3.5">
                  <div className="portfolio-networth-label">Total Net Worth</div>
                  <div className={`portfolio-networth-val fin-mt-1.5 ${netBalance >= 0 ? "text-green-400" : "text-rose-400"}`}>
                    {formatCurrency(netBalance)}
                  </div>
                </div>
                
                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", margin: "12px 0 10px" }}></div>
                
                <div>
                  <div className="portfolio-networth-label" style={{ fontSize: "9px" }}>Monthly Income</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono fin-mt-1">
                    {formatCurrency(monthlyIncome)}
                  </div>
                </div>
              </div>

              <div style={{ margin: "20px 0", borderTop: "1px solid var(--border-color)" }}></div>

              <div className="portfolio-snapshot-section">
                <div
                  className="fin-flex fin-justify-between fin-items-center fin-mb-3"
                  style={{ cursor: isMobile ? "pointer" : "default" }}
                  onClick={() => isMobile && setIsSnapshotCollapsed(!isSnapshotCollapsed)}
                >
                  <h4 className="stats-title !m-0">Accounts Snapshot</h4>
                  {isMobile && (
                    <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 fin-rounded-sm hover:text-white transition">
                      {isSnapshotCollapsed ? "Show" : "Hide"}
                    </span>
                  )}
                </div>

                {(!isMobile || !isSnapshotCollapsed) && (
                  <div className="portfolio-snapshot-list fin-space-y-1.5 animate-fade-in">
                    {accounts.map(acc => {
                      const bal = acc.startBalance + acc.transactionBalance;
                      const isIncluded = acc.includeInTotal === 1;
                      return (
                        <label 
                          key={acc.id} 
                          className={`portfolio-account-row fin-flex fin-justify-between fin-items-center text-xs p-2 fin-rounded-md transition-all cursor-pointer ${
                            isIncluded ? "bg-white/[0.02]" : "opacity-45 hover:opacity-70"
                          }`}
                        >
                          <div className="fin-flex fin-items-center fin-gap-2.5">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={(e) => handleToggleAccountInTotal(acc.id, e.target.checked)}
                              className="custom-checkbox"
                              title="Toggle inclusion in calculations"
                            />
                            <span className="w-2 h-2 fin-rounded-full" style={{ backgroundColor: acc.color, flexShrink: 0 }} />
                            <span className="text-slate-300 font-medium">{acc.name}</span>
                          </div>
                          <span className="text-slate-400 font-mono font-semibold">
                            {formatCurrency(bal)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <aside className="app-sidebar-card">
              <h3 className="card-sec-title">Expense Breakdown</h3>

              {totalFilteredExpense === 0 ? (
                <div className="h-48 fin-flex fin-justify-center fin-items-center">
                  <span className="text-slate-500 text-xs">No expenses logged inside filter criteria.</span>
                </div>
              ) : (
                <div className="analytics-donut-container dashboard-side-breakdown">
                  {/* SVG Donut Circle */}
                  <svg className="analytics-donut-svg" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" className="analytics-donut-circle-bg" />
                    {expenseChartSlices.map((slice, idx) => (
                      <circle
                        key={idx}
                        cx="21"
                        cy="21"
                        r="15.915"
                        className="analytics-donut-circle-segment"
                        stroke={slice.color}
                        strokeDasharray={slice.strokeDash}
                        strokeDashoffset={slice.strokeOffset}
                      />
                    ))}
                  </svg>

                  {/* Legend list */}
                  <div className="analytics-legend-list">
                    {visibleExpenseLegendSlices.map((slice, idx) => (
                      <div key={idx} className="analytics-legend-item">
                        <div className="legend-label-col">
                          <span className="legend-color-dot" style={{ backgroundColor: slice.color }} />
                          <span className="legend-label-text">{slice.name}</span>
                        </div>
                        <span className="legend-value-text">{Math.round(slice.percent)}%</span>
                      </div>
                    ))}
                  </div>
                  {expenseChartSlices.length > legendVisibleLimit && (
                    <button
                      type="button"
                      className="analytics-legend-toggle"
                      onClick={() => setShowAllExpenseLegend(prev => !prev)}
                    >
                      {showAllExpenseLegend
                        ? "Collapse"
                        : `Show ${expenseChartSlices.length - legendVisibleLimit} more`}
                    </button>
                  )}
                </div>
              )}
            </aside>

            <aside className="app-sidebar-card">
              <h3 className="card-sec-title">Income Breakdown</h3>

              {totalFilteredIncome === 0 ? (
                <div className="h-48 fin-flex fin-justify-center fin-items-center">
                  <span className="text-slate-500 text-xs">No income logged inside filter criteria.</span>
                </div>
              ) : (
                <div className="analytics-donut-container dashboard-side-breakdown">
                  {/* SVG Donut Circle */}
                  <svg className="analytics-donut-svg" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" className="analytics-donut-circle-bg" />
                    {incomeChartSlices.map((slice, idx) => (
                      <circle
                        key={idx}
                        cx="21"
                        cy="21"
                        r="15.915"
                        className="analytics-donut-circle-segment"
                        stroke={slice.color}
                        strokeDasharray={slice.strokeDash}
                        strokeDashoffset={slice.strokeOffset}
                      />
                    ))}
                  </svg>

                  {/* Legend list */}
                  <div className="analytics-legend-list">
                    {visibleIncomeLegendSlices.map((slice, idx) => (
                      <div key={idx} className="analytics-legend-item">
                        <div className="legend-label-col">
                          <span className="legend-color-dot" style={{ backgroundColor: slice.color }} />
                          <span className="legend-label-text">{slice.name}</span>
                        </div>
                        <span className="legend-value-text">{Math.round(slice.percent)}%</span>
                      </div>
                    ))}
                  </div>
                  {incomeChartSlices.length > legendVisibleLimit && (
                    <button
                      type="button"
                      className="analytics-legend-toggle"
                      onClick={() => setShowAllIncomeLegend(prev => !prev)}
                    >
                      {showAllIncomeLegend
                        ? "Collapse"
                        : `Show ${incomeChartSlices.length - legendVisibleLimit} more`}
                    </button>
                  )}
                </div>
              )}
            </aside>
          </div>

          {/* Right Main Panel */}
          <div className="app-main-content">
            <div className="content-header">
              <div>
                <h3 className="card-sec-title">Financial Snapshot</h3>
                <p className="text-slate-400 text-sm mt-1">A clearer view of cash flow, liabilities, and what needs attention this month.</p>
              </div>
              <span className="date-badge">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className={`finance-hero-panel ${financeHealthTone} fin-mb-6`}>
              <div className="finance-hero-copy">
                <span className="finance-hero-eyebrow">Monthly health</span>
                <h4 className="finance-hero-title">{financeHealthLabel}</h4>
                <p className="finance-hero-text">{financeHealthMessage}</p>
              </div>
              <div className="finance-hero-metrics">
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Savings rate</span>
                  <strong className="finance-hero-metric-value">{monthlyIncome > 0 ? `${Math.round(savingsRate)}%` : "—"}</strong>
                </div>
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Tracked wallets</span>
                  <strong className="finance-hero-metric-value">{includedAccountsCount}</strong>
                </div>
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Active recurring</span>
                  <strong className="finance-hero-metric-value">{activeSchedulesCount}</strong>
                </div>
              </div>
            </div>

            <div className="finance-summary-grid fin-mb-6">
              <div className="finance-summary-card net-balance">
                <div className="summary-card-header">
                  <span className="summary-label">Net Balance</span>
                  <span className="arrow-badge green">
                    <TrendingUp className="w-3 h-3" />
                  </span>
                </div>
                <p className="summary-value positive">{formatCurrency(netBalance)}</p>
                <p className="summary-desc">Current total cash and credit position.</p>
                <span className="summary-inline-meta">{includedAccountsCount} wallets included</span>
              </div>

              <div className="finance-summary-card income">
                <div className="summary-card-header">
                  <span className="summary-label">This month income</span>
                  <span className="arrow-badge green">
                    <TrendingUp className="w-3 h-3" />
                  </span>
                </div>
                <p className="summary-value positive">{formatCurrency(monthlyIncome)}</p>
                <p className="summary-desc">Income recorded this month.</p>
                <span className="summary-inline-meta">{transactions.filter(t => t.type === "income" && t.date.startsWith(currentMonthStr)).length} income entries</span>
              </div>

              <div className="finance-summary-card expenses">
                <div className="summary-card-header">
                  <span className="summary-label">This month expenses</span>
                  <span className="arrow-badge red">
                    <TrendingDown className="w-3 h-3" />
                  </span>
                </div>
                <p className="summary-value negative">-{formatCurrency(monthlyExpenses)}</p>
                <p className="summary-desc">Expenses recorded this month.</p>
                <span className="summary-inline-meta">
                  {topExpenseCategory?.total ? `Top: ${topExpenseCategory.name}` : "No dominant category yet"}
                </span>
              </div>

              <div className="finance-summary-card net-flow">
                <div className="summary-card-header">
                  <span className="summary-label">Month net flow</span>
                  <span className={`arrow-badge ${monthlyNet >= 0 ? 'green' : 'red'}`}>
                    {monthlyNet >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  </span>
                </div>
                <p className={`summary-value ${monthlyNet >= 0 ? 'positive' : 'negative'}`}>
                  {monthlyNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyNet))}
                </p>
                <p className="summary-desc">Net cashflow for the current month.</p>
                <span className="summary-inline-meta">{monthlyIncome > 0 ? `${Math.round(savingsRate)}% savings rate` : "No income baseline yet"}</span>
              </div>

              <div className="finance-summary-card liquidity">
                <div className="summary-card-header">
                  <span className="summary-label">Liquidity Assets</span>
                  <span className="arrow-badge teal">
                    <Wallet className="w-3 h-3" />
                  </span>
                </div>
                <p className="summary-value positive">{formatCurrency(liquidityBalance)}</p>
                <p className="summary-desc">Cash and bank holdings included in total liquidity.</p>
                <span className="summary-inline-meta">Ready for bills and transfers</span>
              </div>

              <div className="finance-summary-card liabilities">
                <div className="summary-card-header">
                  <span className="summary-label">Credit liabilities</span>
                  <span className="arrow-badge red">
                    <CreditCard className="w-3 h-3" />
                  </span>
                </div>
                <p className="summary-value negative">-{formatCurrency(creditDebt)}</p>
                <p className="summary-desc">Credit card debt included in your net worth.</p>
                <span className="summary-inline-meta">{accounts.filter(a => a.type === "Credit Card").length} credit accounts tracked</span>
              </div>
            </div>

            <div className="finance-insights-grid fin-mb-6">
              <div className="finance-insight-card">
                <span className="finance-insight-label">Top expense category</span>
                <strong className="finance-insight-value">
                  {topExpenseCategory?.total ? topExpenseCategory.name : "No expense data"}
                </strong>
                <span className="finance-insight-note">
                  {topExpenseCategory?.total ? formatCurrency(topExpenseCategory.total) : "Log a few expenses to surface patterns."}
                </span>
              </div>
              <div className="finance-insight-card">
                <span className="finance-insight-label">Recurring workload</span>
                <strong className="finance-insight-value">{activeSchedulesCount} active plans</strong>
                <span className="finance-insight-note">
                  {activeSchedulesCount > 0 ? "Recurring items are being tracked automatically." : "No recurring items scheduled yet."}
                </span>
              </div>
              <div className="finance-insight-card">
                <span className="finance-insight-label">Ledger activity</span>
                <strong className="finance-insight-value">{transactions.length} total entries</strong>
                <span className="finance-insight-note">
                  {recentTransactions.length > 0 ? `Latest update on ${recentTransactions[0].date}.` : "No activity recorded yet."}
                </span>
              </div>
            </div>

            <div className="content-header fin-mt-8">
              <div>
                <h3 className="card-sec-title">Recent Ledger Entries</h3>
                <p className="text-slate-400 text-sm mt-1">Latest five transactions from your active accounts.</p>
              </div>
              <button
                onClick={() => setActiveTab("transactions")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-transparent border-none cursor-pointer"
              >
                View Full Ledger
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="empty-state-view">
                <div className="empty-icon-wrapper">
                  <Info className="w-6 h-6 text-slate-500" />
                </div>
                <h4>No transactions logged yet</h4>
                <p>Click "New transaction" in the sidebar to add entries.</p>
              </div>
            ) : (
              <div className="ledger-rows fin-space-y-2">
                {recentTransactions.map(renderTransactionRow)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENTS: 2. TRANSACTIONS / LEDGER */}
      {activeTab === "transactions" && (
        <div className="app-grid-layout animate-fade-in">
          {/* Left Sidebar Filter Controls */}
          <aside className="app-sidebar-card">
            <div
              className="fin-flex fin-justify-between fin-items-center cursor-pointer"
              onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
              style={{ marginBottom: isMobile && isFilterCollapsed ? 0 : "16px" }}
            >
              <h3 className="card-sec-title" style={{ margin: 0 }}>Filter Transactions</h3>
              {isMobile && (
                <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 fin-rounded-sm hover:text-white transition">
                  {isFilterCollapsed ? "Show Filters" : "Hide Filters"}
                </span>
              )}
            </div>

            {(!isMobile || !isFilterCollapsed) && (
              <div className="fin-space-y-4 animate-fade-in">
                {/* Search text */}
                <div className="fin-space-y-1">
                  <label className="block text-slate-400 text-[11px] font-semibold uppercase">Keyword Search</label>
                  <div style={{ position: "relative" }}>
                    <Search className="w-4 h-4 text-slate-500" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: "12px" }} />
                    <input
                      type="text"
                      placeholder="Memo, category, wallet..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="custom-input fin-w-full"
                      style={{ paddingLeft: "36px" }}
                    />
                  </div>
                </div>

                {/* Type Chip filters */}
                <div className="fin-space-y-1">
                  <label className="block text-slate-400 text-[11px] font-semibold uppercase">Transaction Type</label>
                  <div className="sidebar-selector-group">
                    {["All", "income", "expense", "transfer"].map(t => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`sidebar-selector-btn ${filterType === t ? "active" : ""}`}
                      >
                        {t === "All" ? "All" : t === "income" ? "Inc" : t === "expense" ? "Exp" : "Xfer"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Filters */}
                <div className="fin-space-y-1">
                  <label className="block text-slate-400 text-[11px] font-semibold uppercase">Date filter</label>
                  <div className="sidebar-selector-group">
                    <button
                      onClick={() => setFilterDate("All")}
                      className={`sidebar-selector-btn ${filterDate === "All" ? "active" : ""}`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setFilterDate("Month")}
                      className={`sidebar-selector-btn ${filterDate === "Month" ? "active" : ""}`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setFilterDate("Custom")}
                      className={`sidebar-selector-btn ${filterDate === "Custom" ? "active" : ""}`}
                    >
                      Custom
                    </button>
                  </div>

                  {filterDate === "Custom" && (
                    <div className="fin-space-y-2 fin-mt-2 pt-2 border-t border-white/5 animate-fade-in">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Start Date</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="custom-input fin-w-full"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">End Date</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="custom-input fin-w-full"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ margin: "20px 0", borderTop: "1px solid var(--border-color)" }}></div>

                <button
                  onClick={handleExportCSV}
                  className="primary-btn fin-w-full"
                >
                  <span>Export CSV Sheet</span>
                </button>
              </div>
            )}
          </aside>

          {/* Right Main Ledger list */}
          <div className="app-main-content">
            <div className="content-header">
              <div>
                <h3 className="card-sec-title">Transaction Ledger</h3>
                <p className="text-slate-400 text-sm mt-1">Search, review, and clean up movement across every wallet from one place.</p>
              </div>
              <span className="total-txs-badge">{filteredTransactions.length} records matched</span>
            </div>

            <div className={`finance-hero-panel ${ledgerNetFlow >= 0 ? "positive" : "negative"} fin-mb-6`}>
              <div className="finance-hero-copy">
                <span className="finance-hero-eyebrow">Ledger overview</span>
                <h4 className="finance-hero-title">
                  {filteredTransactions.length === 0 ? "No matching entries" : `${filteredTransactions.length} entries in view`}
                </h4>
                <p className="finance-hero-text">
                  {filterDate === "Custom"
                    ? "You're looking at a custom date range with live keyword and type filters applied."
                    : filterDate === "Month"
                      ? "This view is focused on the current month so you can quickly spot cash flow patterns."
                      : "This view spans your full ledger so you can trace trends over time."}
                </p>
              </div>
              <div className="finance-hero-metrics">
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Net flow</span>
                  <strong className="finance-hero-metric-value">{ledgerNetFlow >= 0 ? "+" : "-"}{formatCurrency(Math.abs(ledgerNetFlow))}</strong>
                </div>
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Expenses</span>
                  <strong className="finance-hero-metric-value">{filteredExpenseCount}</strong>
                </div>
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Transfers</span>
                  <strong className="finance-hero-metric-value">{filteredTransferCount}</strong>
                </div>
              </div>
            </div>

            {/* Statistics summary of selected filters */}
            <div className="ledger-stats-banner fin-mb-4">
              <div>
                <span>Income</span>
                <span className="income-val">{formatCurrency(filteredIncome)}</span>
                <small>{filteredIncomeCount} entries</small>
              </div>
              <div>
                <span>Expense</span>
                <span className="expense-val">-{formatCurrency(filteredExpense)}</span>
                <small>{filteredExpenseCount} entries</small>
              </div>
              <div>
                <span>Net Flow</span>
                <span className={`net-val ${ledgerNetFlow >= 0 ? "pos" : "neg"}`}>
                  {ledgerNetFlow >= 0 ? "+" : "-"}{formatCurrency(Math.abs(ledgerNetFlow))}
                </span>
                <small>{filterType === "All" ? `${filteredTransferAmount > 0 ? `${formatCurrency(filteredTransferAmount)} transfers` : "All transaction types"}` : `${filterType} view active`}</small>
              </div>
            </div>

            <div className="finance-insights-grid fin-mb-6">
              <div className="finance-insight-card">
                <span className="finance-insight-label">Most active flow</span>
                <strong className="finance-insight-value">
                  {filteredExpense >= filteredIncome ? "Expenses lead" : "Income leads"}
                </strong>
                <span className="finance-insight-note">
                  {filteredExpense >= filteredIncome
                    ? `${formatCurrency(filteredExpense)} in outgoing transactions.`
                    : `${formatCurrency(filteredIncome)} in incoming transactions.`}
                </span>
              </div>
              <div className="finance-insight-card">
                <span className="finance-insight-label">Search state</span>
                <strong className="finance-insight-value">{searchQuery.trim() ? `"${searchQuery}"` : "No keyword filter"}</strong>
                <span className="finance-insight-note">
                  {searchQuery.trim() ? "Results are narrowed to your current search phrase." : "Use search to jump straight to notes, wallets, or categories."}
                </span>
              </div>
              <div className="finance-insight-card">
                <span className="finance-insight-label">Date scope</span>
                <strong className="finance-insight-value">{filterDate === "Month" ? "Current month" : filterDate === "Custom" ? "Custom range" : "All time"}</strong>
                <span className="finance-insight-note">
                  {filterDate === "Custom" && startDate && endDate ? `${startDate} to ${endDate}` : "Switch scope to compare short-term and long-term behavior."}
                </span>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="empty-state-view">
                <div className="empty-icon-wrapper">
                  <Search className="w-6 h-6 text-slate-500" />
                </div>
                <h4>No transactions found</h4>
                <p>No transaction matches your selected filter criteria.</p>
              </div>
            ) : (
              <div className="ledger-rows fin-space-y-2">
                {filteredTransactions.map(renderTransactionRow)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENTS: 3. WALLETS / CATEGORIES */}
      {activeTab === "wallets" && (
        <div className="app-grid-layout animate-fade-in">
          {/* Left Sidebar Creators */}
          <aside className="app-sidebar-card">
            {isMobile && (
              <div
                className="fin-flex fin-justify-between fin-items-center cursor-pointer"
                onClick={() => setIsWalletFormCollapsed(!isWalletFormCollapsed)}
                style={{ marginBottom: isWalletFormCollapsed ? 0 : "16px" }}
              >
                <h3 className="card-sec-title" style={{ margin: 0 }}>
                  {editingAccountId || editingCategoryId ? "Edit Wallet/Category" : "Create Wallet/Category"}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-1 fin-rounded-sm hover:text-white transition">
                  {isWalletFormCollapsed ? "Show Form" : "Hide Form"}
                </span>
              </div>
            )}

            {(!isMobile || !isWalletFormCollapsed) && (
              <div className="fin-space-y-4 animate-fade-in">
                {/* Mini internal selector tabs */}
                <div className="sidebar-selector-group fin-mb-4">
                  <button
                    type="button"
                    onClick={() => setSidebarForm("wallet")}
                    className={`sidebar-selector-btn ${sidebarForm === "wallet" ? "active" : ""}`}
                  >
                    {editingAccountId ? "Edit Wallet" : "Add Wallet"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarForm("category")}
                    className={`sidebar-selector-btn ${sidebarForm === "category" ? "active" : ""}`}
                  >
                    {editingCategoryId ? "Edit Category" : "Add Category"}
                  </button>
                </div>

                {/* Render selected form */}
                {sidebarForm === "wallet" ? (
                  <form onSubmit={handleAddAccount} className="fin-space-y-4">
                    <div className="fin-space-y-1">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Wallet Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Checking Account"
                        value={accName}
                        onChange={(e) => setAccName(e.target.value)}
                        className="custom-input fin-w-full"
                      />
                    </div>

                    <div className="fin-space-y-1">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Wallet Type</label>
                      <select
                        value={accType}
                        onChange={(e) => setAccType(e.target.value as Account["type"])}
                        className="custom-input custom-select fin-w-full"
                      >
                        <option value="Bank">Bank Checking</option>
                        <option value="Physical Cash">Cash Wallet</option>
                        <option value="Investment">Investment Ledger</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                      </select>
                    </div>

                    <div className="fin-grid fin-grid-cols-2 fin-gap-3">
                      <div className="fin-space-y-1">
                        <label className="block text-slate-400 text-[10px] font-semibold uppercase">Start Balance ({currencyCode})</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={accStartBalance}
                          onChange={(e) => setAccStartBalance(e.target.value)}
                          className="custom-input fin-w-full"
                        />
                      </div>

                      {accType === "Credit Card" && (
                        <div className="fin-space-y-1">
                          <label className="block text-slate-400 text-[10px] font-semibold uppercase">Credit Limit ({currencyCode})</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="5000"
                            value={accCreditLimit}
                            onChange={(e) => setAccCreditLimit(e.target.value)}
                            className="custom-input fin-w-full"
                          />
                        </div>
                      )}
                    </div>

                    <div className="fin-grid fin-grid-cols-2 fin-gap-3">
                      <div className="fin-space-y-1">
                        <label className="block text-slate-400 text-[10px] font-semibold uppercase">Card Suffix (Last 4)</label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="1234"
                          value={accLast4}
                          onChange={(e) => setAccLast4(e.target.value)}
                          className="custom-input fin-w-full font-mono"
                        />
                      </div>

                      <div className="fin-space-y-1">
                        <label className="block text-slate-400 text-[10px] font-semibold uppercase">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          placeholder="08/29"
                          value={accExpiry}
                          onChange={(e) => setAccExpiry(e.target.value)}
                          className="custom-input fin-w-full font-mono"
                        />
                      </div>
                    </div>

                    <div className="fin-space-y-2">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Theme Color</label>
                      <div className="color-selector-row">
                        {["#2D9CDB", "#F2994A", "#EB5757", "#00E5A0", "#BB6BD9"].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setAccColor(c)}
                            className={`color-dot-btn ${accColor === c ? "active" : ""}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="fin-flex fin-items-center fin-gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="accIncludeTotal"
                        checked={accIncludeTotal}
                        onChange={(e) => setAccIncludeTotal(e.target.checked)}
                        className="custom-checkbox"
                      />
                      <label htmlFor="accIncludeTotal" className="text-slate-400 text-xs font-semibold cursor-pointer">Include in aggregate sums</label>
                    </div>

                    {editingAccountId ? (
                      <div className="fin-flex fin-gap-2">
                        <button type="submit" className="primary-btn fin-w-full">
                          <Check className="w-4 h-4" />
                          <span>Save Wallet</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditAccount}
                          className="action-icon-btn delete"
                          style={{ height: "40px", width: "40px", flexShrink: 0, padding: 0 }}
                          title="Cancel edit"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button type="submit" className="primary-btn fin-w-full">
                        <Plus className="w-4 h-4" />
                        <span>Create Wallet</span>
                      </button>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleAddCategory} className="fin-space-y-4">
                    <div className="fin-space-y-1">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Category Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Subscriptions"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        className="custom-input fin-w-full"
                      />
                    </div>

                    <div className="fin-space-y-1">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Type</label>
                      <select
                        value={catType}
                        onChange={(e) => setCatType(e.target.value as "income" | "expense")}
                        className="custom-input custom-select fin-w-full"
                      >
                        <option value="expense">Expense category</option>
                        <option value="income">Income category</option>
                      </select>
                    </div>

                    <div className="fin-space-y-1">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Select Icon</label>
                      <div className="icon-selector-grid">
                        {Object.keys(IconComponents).map(iconName => {
                          const Component = IconComponents[iconName];
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => setCatIcon(iconName)}
                              className={`icon-select-btn ${catIcon === iconName ? "active" : ""}`}
                            >
                              <Component className="w-4 h-4 mx-auto" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="fin-space-y-2">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Theme Color</label>
                      <div className="color-selector-row">
                        {["#FF6B81", "#E056FD", "#F2C94C", "#54A0FF", "#BB6BD9", "#8395A7", "#63CF93", "#00E5A0"].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCatColor(c)}
                            className={`color-dot-btn ${catColor === c ? "active" : ""}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {editingCategoryId ? (
                      <div className="fin-flex fin-gap-2">
                        <button type="submit" className="primary-btn fin-w-full">
                          <Check className="w-4 h-4" />
                          <span>Save Category</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditCategory}
                          className="action-icon-btn delete"
                          style={{ height: "40px", width: "40px", flexShrink: 0, padding: 0 }}
                          title="Cancel edit"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button type="submit" className="primary-btn fin-w-full">
                        <Plus className="w-4 h-4" />
                        <span>Create Category</span>
                      </button>
                    )}
                  </form>
                )}
              </div>
            )}
          </aside>

          {/* Right Main Displays */}
          <div className="app-main-content">
            <div className="content-header">
              <div>
                <h3 className="card-sec-title">Accounts & Wallets</h3>
                <p className="text-slate-400 text-sm mt-1">Organize every account, see credit exposure, and keep categories tidy and consistent.</p>
              </div>
            </div>

            <div className="finance-insights-grid fin-mb-6">
              <div className="finance-insight-card">
                <span className="finance-insight-label">Wallet coverage</span>
                <strong className="finance-insight-value">{totalWallets} wallets</strong>
                <span className="finance-insight-note">{liquidWalletCount} liquid wallets and {investmentWalletCount} investment wallets tracked.</span>
              </div>
              <div className="finance-insight-card">
                <span className="finance-insight-label">Credit utilization</span>
                <strong className="finance-insight-value">{totalCreditLimit > 0 ? `${creditUtilizationRate}%` : "No credit lines"}</strong>
                <span className="finance-insight-note">
                  {totalCreditLimit > 0 ? `${formatCurrency(usedCreditLimit)} used out of ${formatCurrency(totalCreditLimit)}.` : "Add a credit card wallet to track credit exposure."}
                </span>
              </div>
              <div className="finance-insight-card">
                <span className="finance-insight-label">Category system</span>
                <strong className="finance-insight-value">{categories.length} categories</strong>
                <span className="finance-insight-note">Balances structure between {categories.filter(c => c.type === "income").length} income and {categories.filter(c => c.type === "expense").length} expense groups.</span>
              </div>
            </div>

            <div className="wallets-grid fin-mb-6">
              {accounts.map(acc => {
                const bal = acc.startBalance + acc.transactionBalance;
                const maskedDigits = hideCardNumbers ? `•••• ${acc.accountId.slice(-4)}` : acc.accountId;

                return (
                  <div
                    key={acc.id}
                    className="wallet-card"
                  >
                    <div className="wallet-card-header">
                      <div className="wallet-card-title-wrap">
                        <div className="wallet-card-topline">
                          <span className="wallet-card-icon" style={{ color: acc.color }}>
                            {renderAccountTypeIcon(acc.type)}
                          </span>
                          <span className="wallet-card-type">{acc.type}</span>
                        </div>
                        <h4 className="wallet-card-name" title={acc.name}>{acc.name}</h4>
                      </div>
                      <div className="habit-menu-wrap">
                        <button
                          type="button"
                          onClick={() => setOpenActionMenuId((current) => (current === `acc-${acc.id}` ? null : `acc-${acc.id}`))}
                          className="action-icon-btn habit-menu-trigger"
                          title="More actions"
                          aria-label="More actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openActionMenuId === `acc-${acc.id}` && (
                          <div className="habit-menu-popover" role="menu" aria-label="Wallet actions">
                            <button type="button" className="habit-menu-item" onClick={() => startEditAccount(acc)}>
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button type="button" className="habit-menu-item danger" onClick={() => handleDeleteAccount(acc.id)}>
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {acc.type === "Credit Card" ? (
                      <div className="fin-space-y-2">
                        <div className="fin-flex fin-justify-between fin-items-end">
                          <div>
                            <span className="wallet-card-bal-label">Outstanding Debt</span>
                            <span className="wallet-card-bal-val text-rose-400" style={{ fontSize: "20px" }}>{formatCurrency(Math.abs(bal))}</span>
                          </div>
                          <div className="text-right">
                            <span className="wallet-card-bal-label">Available Limit</span>
                            <span className="wallet-card-limit-val">{formatCurrency(acc.creditLimit - Math.abs(bal))}</span>
                          </div>
                        </div>

                        <div className="wallet-card-progress">
                          <div
                            className="wallet-card-progress-bar"
                            style={{ width: `${Math.min(100, (Math.abs(bal) / (acc.creditLimit || 1)) * 100)}%`, backgroundColor: 'var(--color-rose)' }}
                          />
                        </div>

                        <div className="fin-flex fin-justify-between text-[9px] text-slate-500">
                          <span>Limit: {formatCurrency(acc.creditLimit)}</span>
                          <span>Utilization: {acc.creditLimit > 0 ? Math.round((Math.abs(bal) / acc.creditLimit) * 100) : 0}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="wallet-card-balance-col">
                        <span className="wallet-card-bal-label">Current Balance</span>
                        <span className="wallet-card-bal-val">{formatCurrency(bal)}</span>
                        <span style={{ display: "block", marginTop: "4px", color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>Starting: {formatCurrency(acc.startBalance)}</span>
                      </div>
                    )}

                    <div className="wallet-card-footer">
                      <span title={maskedDigits}>{maskedDigits}</span>
                      <span className={`wallet-card-status-chip ${acc.includeInTotal === 1 ? "included" : "hidden"}`} title={acc.includeInTotal === 1 ? "Included in Net" : "Hidden from Net"}>
                        {acc.includeInTotal === 1 ? "Included in Net" : "Hidden from Net"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="content-header pt-4">
              <h3 className="card-sec-title">Active Categories</h3>
            </div>

            <div className="categories-grid">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="category-card"
                >
                  <div className="category-info">
                    <div className="category-icon-box">
                      {renderCategoryIcon(cat.icon, cat.color, "w-4 h-4")}
                    </div>
                    <div className="category-meta-col">
                      <span className="category-card-name" title={cat.name}>{cat.name}</span>
                      <div className="category-meta-row">
                        <span className={`category-card-type-pill ${cat.type}`}>{cat.type}</span>
                        <span className="category-card-usage">{categoryUsageCounts[cat.id] || 0} entries</span>
                      </div>
                    </div>
                  </div>

                  <div className="habit-menu-wrap">
                    <button
                      type="button"
                      onClick={() => setOpenActionMenuId((current) => (current === `cat-${cat.id}` ? null : `cat-${cat.id}`))}
                      className="action-icon-btn habit-menu-trigger"
                      title="More actions"
                      aria-label="More actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openActionMenuId === `cat-${cat.id}` && (
                      <div className="habit-menu-popover" role="menu" aria-label="Category actions">
                        <button type="button" className="habit-menu-item" onClick={() => startEditCategory(cat)}>
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button type="button" className="habit-menu-item danger" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENTS: 4. SCHEDULED PAYMENTS / RECURRING */}
      {activeTab === "schedules" && (
        <div className="app-grid-layout animate-fade-in">
          {/* Left Sidebar Creator */}
          <aside className="app-sidebar-card">
            <div
              className="fin-flex fin-justify-between fin-items-center cursor-pointer"
              onClick={() => setIsRecurringFormCollapsed(!isRecurringFormCollapsed)}
              style={{ marginBottom: isMobile && isRecurringFormCollapsed ? 0 : "16px" }}
            >
              <h3 className="card-sec-title" style={{ margin: 0 }}>
                {editingScheduleId ? "Edit Recurring Bill" : "Add Recurring Bill"}
              </h3>
              {isMobile && (
                <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 fin-rounded-sm hover:text-white transition">
                  {isRecurringFormCollapsed ? "Show Builder" : "Hide Builder"}
                </span>
              )}
            </div>

            {(!isMobile || !isRecurringFormCollapsed) && (
              <form onSubmit={handleAddSchedule} className="fin-space-y-4 animate-fade-in">
                <div className="sidebar-selector-group">
                  {(["expense", "income", "transfer"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSchType(t)}
                      className={`sidebar-selector-btn ${schType === t ? "active" : ""}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="fin-space-y-1">
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase">Amount ({currencyCode})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={schAmount}
                    onChange={(e) => setSchAmount(e.target.value)}
                    className="custom-input fin-w-full"
                  />
                </div>

                <div className="fin-space-y-1">
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase">Frequency</label>
                  <select
                    value={schFrequency}
                    onChange={(e) => setSchFrequency(e.target.value as ScheduledPayment["frequency"])}
                    className="custom-input custom-select fin-w-full"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="fin-space-y-1">
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase">Memo Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Netflix Subscription"
                    value={schNote}
                    onChange={(e) => setSchNote(e.target.value)}
                    className="custom-input fin-w-full"
                  />
                </div>

                <div className="fin-space-y-1">
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase">Start Date</label>
                  <input
                    type="date"
                    required
                    value={schStartDate}
                    onChange={(e) => setSchStartDate(e.target.value)}
                    className="custom-input fin-w-full"
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                <div className="fin-grid fin-grid-cols-2 fin-gap-3">
                  <div className="fin-space-y-1">
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase">
                      {schType === "transfer" ? "Source Account" : "Paying Wallet"}
                    </label>
                    <select
                      required
                      value={schAccountId}
                      onChange={(e) => setSchAccountId(e.target.value)}
                      className="custom-input custom-select fin-w-full"
                    >
                      <option value="">Select Wallet</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  {schType === "transfer" ? (
                    <div className="fin-space-y-1">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Target Account</label>
                      <select
                        required
                        value={schTargetAccountId}
                        onChange={(e) => setSchTargetAccountId(e.target.value)}
                        className="custom-input custom-select fin-w-full"
                      >
                        <option value="">Select Wallet</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="fin-space-y-1">
                      <label className="block text-slate-400 text-[10px] font-semibold uppercase">Category</label>
                      <select
                        required
                        value={schCategoryId}
                        onChange={(e) => setSchCategoryId(e.target.value)}
                        className="custom-input custom-select fin-w-full"
                      >
                        <option value="">Select Category</option>
                        {categories.filter(c => c.type === schType).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {editingScheduleId ? (
                  <div className="fin-flex fin-gap-2">
                    <button type="submit" className="primary-btn fin-w-full">
                      <Check className="w-4 h-4" />
                      <span>Save Bill</span>
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditSchedule}
                      className="action-icon-btn delete"
                      style={{ height: "40px", width: "40px", flexShrink: 0, padding: 0 }}
                      title="Cancel edit"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button type="submit" className="primary-btn fin-w-full">
                    <Plus className="w-4 h-4" />
                    <span>Create Schedule</span>
                  </button>
                )}
              </form>
            )}
          </aside>

          {/* Right Main Schedules list */}
          <div className="app-main-content">
            <div className="content-header">
              <div>
                <h3 className="card-sec-title">Recurring Payments</h3>
                <p className="text-slate-400 text-sm mt-1">Keep subscriptions, salary inflows, and repeating transfers visible before they surprise you.</p>
              </div>
              <span className="total-txs-badge">{schedules.length} scheduled items</span>
            </div>

            <div className={`finance-hero-panel ${activeSchedulesCount > 0 ? "positive" : "negative"} fin-mb-6`}>
              <div className="finance-hero-copy">
                <span className="finance-hero-eyebrow">Recurring overview</span>
                <h4 className="finance-hero-title">{activeSchedulesCount > 0 ? `${activeSchedulesCount} active recurring plans` : "No active recurring plans"}</h4>
                <p className="finance-hero-text">
                  {nextScheduledPayment
                    ? `Your next scheduled movement lands on ${nextScheduledPayment.nextTriggerDate}.`
                    : "Add recurring items to automate predictable income, bills, and transfers."}
                </p>
              </div>
              <div className="finance-hero-metrics">
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Recurring expense</span>
                  <strong className="finance-hero-metric-value">{formatCurrency(recurringExpenseTotal)}</strong>
                </div>
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Recurring income</span>
                  <strong className="finance-hero-metric-value">{formatCurrency(recurringIncomeTotal)}</strong>
                </div>
                <div className="finance-hero-metric-card">
                  <span className="finance-hero-metric-label">Next trigger</span>
                  <strong className="finance-hero-metric-value">{nextScheduledPayment ? nextScheduledPayment.nextTriggerDate : "—"}</strong>
                </div>
              </div>
            </div>

            {schedules.length === 0 ? (
              <div className="empty-state-view">
                <div className="empty-icon-wrapper">
                  <Calendar className="w-6 h-6 text-slate-600" />
                </div>
                <h4>No recurring payments registered</h4>
                <p>Use the form on the left to schedule subscriptions or recurring utility payments.</p>
              </div>
            ) : (
              <div className="wallets-grid recurring-grid">
                {schedules.map(sch => {
                  const originAcc = accounts.find(a => a.id === sch.accountId);
                  const targetAcc = sch.targetAccountId ? accounts.find(a => a.id === sch.targetAccountId) : null;
                  const cat = categories.find(c => c.id === sch.categoryId);
                  const indicatorColor = sch.type === "income" ? "#10b981" : sch.type === "transfer" ? "#f59e0b" : "#f43f5e";

                  return (
                    <div
                      key={sch.id}
                      className="wallet-card recurring-card animate-fade-in"
                      style={{
                        background: `radial-gradient(circle at top right, ${indicatorColor}20 0%, transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(21, 24, 37, 0.96) 100%)`
                      }}
                    >
                      <div className="recurring-card-header">
                        <div className="recurring-card-copy">
                          <div className="recurring-card-meta-row">
                            <span className={`ledger-type-pill ${sch.type === "income" ? "income" : sch.type === "transfer" ? "transfer" : "expense"}`}>
                              {sch.type}
                            </span>
                            <span className="recurring-frequency-chip capitalize font-bold bg-white/5 px-2 py-0.5 fin-rounded-sm text-[10px]">
                              {sch.frequency}
                            </span>
                          </div>
                          <h4 className="text-white text-base font-bold block recurring-card-title" style={{ margin: "12px 0 0" }} title={sch.note}>{sch.note}</h4>
                          <div className="recurring-route text-xs text-slate-400 fin-mt-2" title={targetAcc ? `${originAcc?.name || ""} → ${targetAcc.name}` : originAcc?.name || ""}>
                            <span>
                              {originAcc?.name}
                              {targetAcc && ` → ${targetAcc.name}`}
                            </span>
                          </div>
                        </div>

                        <div className="recurring-card-actions">
                          <button
                            onClick={() => handleToggleSchedule(sch.id, sch.isActive === 0)}
                            className={`recurring-status-chip ${sch.isActive === 1 ? "active" : "paused"
                              }`}
                          >
                            {sch.isActive === 1 ? "Active" : "Paused"}
                          </button>

                          <div className="habit-menu-wrap">
                            <button
                              type="button"
                              onClick={() => setOpenActionMenuId((current) => (current === `sch-${sch.id}` ? null : `sch-${sch.id}`))}
                              className="action-icon-btn habit-menu-trigger"
                              title="More actions"
                              aria-label="More actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openActionMenuId === `sch-${sch.id}` && (
                              <div className="habit-menu-popover" role="menu" aria-label="Schedule actions">
                                <button type="button" className="habit-menu-item" onClick={() => startEditSchedule(sch)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button type="button" className="habit-menu-item danger" onClick={() => handleDeleteSchedule(sch.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {cat && (
                        <div className="recurring-category-row fin-flex fin-items-center fin-gap-1 text-xs text-slate-400 fin-mt-3" title={cat.name}>
                          {renderCategoryIcon(cat.icon, cat.color, "w-3 h-3")}
                          <span>{cat.name}</span>
                        </div>
                      )}

                      <div className="recurring-card-footer">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Next Trigger Date</span>
                          <span className="text-slate-300 text-xs font-semibold font-mono">{sch.nextTriggerDate}</span>
                        </div>
                        <span className="text-white text-lg font-black font-mono">
                          {formatCurrency(sch.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENTS: 5. ANALYTICS DIAGRAMS */}
      {activeTab === "analytics" && (
        <div className="app-grid-layout animate-fade-in">
          {/* Left Sidebar Asset Allocation */}
          <aside className="app-sidebar-card">
            <h3 className="card-sec-title">Asset Allocation</h3>
            <p className="text-slate-400 text-sm" style={{ marginTop: "-6px", marginBottom: "18px" }}>
              See which wallets dominate your balance sheet and where risk is concentrated.
            </p>

            {walletAllocationSlices.length === 0 ? (
              <div className="h-48 fin-flex fin-justify-center fin-items-center">
                <span className="text-slate-500 text-xs">Add wallet balances to visualize allocation mix.</span>
              </div>
            ) : (
              <div className="allocation-shell">
                <div className="allocation-overview-section">
                  <div className="allocation-donut-wrap">
                    <svg className="allocation-donut-svg" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" className="analytics-donut-circle-bg" />
                      {walletAllocationSlices.map(slice => (
                        <circle
                          key={slice.id}
                          cx="21"
                          cy="21"
                          r="15.915"
                          className="analytics-donut-circle-segment"
                          stroke={slice.color}
                          strokeDasharray={slice.strokeDash}
                          strokeDashoffset={slice.strokeOffset}
                        />
                      ))}
                    </svg>
                    <div className="allocation-donut-center">
                      <span className="allocation-donut-label">Tracked Value</span>
                      <strong className="allocation-donut-value" title={formatCurrency(totalWalletAllocationAbs)}>{formatCurrencyCompact(totalWalletAllocationAbs)}</strong>
                    </div>
                  </div>

                  <div className="allocation-signal-grid">
                    <div className="allocation-signal-card">
                      <span className="allocation-signal-label">Largest wallet</span>
                      <strong className="allocation-signal-value">{largestWalletSlice ? `${Math.round(largestWalletSlice.percent)}%` : "0%"}</strong>
                      <span className="allocation-signal-note">{largestWalletSlice ? largestWalletSlice.name : "No wallet"}</span>
                    </div>
                    <div className="allocation-signal-card">
                      <span className="allocation-signal-label">Diversification</span>
                      <strong className="allocation-signal-value">{walletAllocationSlices.length}</strong>
                      <span className="allocation-signal-note">Wallets with non-zero balance</span>
                    </div>
                  </div>
                </div>

                <div className="allocation-section">
                  <div className="allocation-section-header">
                    <span>Wallet Type Mix</span>
                    <small>{walletTypeMix.length} types</small>
                  </div>
                  <div className="allocation-type-stack" aria-label="Wallet type mix">
                    {walletTypeMix.map((entry, idx) => (
                      <div key={`${entry.type}-${idx}`} className="allocation-type-segment" style={{ width: `${Math.max(entry.percent, 6)}%` }} title={`${entry.type}: ${Math.round(entry.percent)}%`} />
                    ))}
                  </div>
                  <div className="allocation-type-legend">
                    {walletTypeMix.map((entry, idx) => (
                      <span key={`${entry.type}-legend-${idx}`} className="allocation-type-chip">
                        <span>{entry.type}</span>
                        <strong>{Math.round(entry.percent)}%</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="allocation-section">
                  <div className="allocation-section-header">
                    <span>Top Holdings</span>
                    <small>{walletAllocationTopSlices.length} wallets</small>
                  </div>
                  <div className="allocation-holdings-list">
                    {walletAllocationTopSlices.map(slice => (
                      <div key={slice.id} className="allocation-row-item">
                        <div className="allocation-row-labels">
                          <span className="allocation-row-name">{slice.name}</span>
                          <span className="allocation-row-val">
                            {Math.round(slice.percent)}%
                          </span>
                        </div>
                        <div className="allocation-bar-track">
                          <div
                            className="allocation-bar-fill"
                            style={{ width: `${Math.max(0, Math.min(100, slice.percent))}%`, backgroundColor: slice.color }}
                          />
                        </div>
                        <span className="allocation-row-amount">
                          {formatCurrency(slice.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Right Main Analytics Pie breakdown diagrams */}
          <div className="app-main-content">
            <div className="content-header">
              <div>
                <h3 className="card-sec-title">Spending breakdown</h3>
                <p className="text-slate-400 text-sm mt-1">Use category share and allocation patterns to understand what is growing, draining, or dominating your finances.</p>
              </div>
            </div>

            <div className="finance-insights-grid fin-mb-6">
              <div className="finance-insight-card">
                <span className="finance-insight-label">Largest expense share</span>
                <strong className="finance-insight-value">{largestExpenseSlice ? largestExpenseSlice.name : "No expense data"}</strong>
                <span className="finance-insight-note">
                  {largestExpenseSlice ? `${Math.round(largestExpenseSlice.percent)}% of filtered expenses.` : "Add expense entries to surface category concentration."}
                </span>
              </div>
              <div className="finance-insight-card">
                <span className="finance-insight-label">Largest income share</span>
                <strong className="finance-insight-value">{largestIncomeSlice ? largestIncomeSlice.name : "No income data"}</strong>
                <span className="finance-insight-note">
                  {largestIncomeSlice ? `${Math.round(largestIncomeSlice.percent)}% of filtered income.` : "Income categories will appear once income is logged."}
                </span>
              </div>
              <div className="finance-insight-card">
                <span className="finance-insight-label">Dominant wallet</span>
                <strong className="finance-insight-value">{leadingAllocation ? leadingAllocation.name : "No wallet data"}</strong>
                <span className="finance-insight-note">
                  {leadingAllocation ? `${formatCurrency(leadingAllocation.balance)} current balance.` : "Wallet allocation becomes more useful as balances accumulate."}
                </span>
              </div>
            </div>

            <div className="analytics-grid">
              {/* Expense Breakdown Pie (Donut) Chart */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h4 className="stats-title" style={{ fontSize: "14px", color: "#fff", textTransform: "none", letterSpacing: "normal" }}>Expense Breakdown</h4>
                    <p className="analytics-card-copy">Category weight across filtered expenses.</p>
                  </div>
                  <span className="total-txs-badge">{formatCurrency(totalFilteredExpense)}</span>
                </div>

                {totalFilteredExpense === 0 ? (
                  <div className="h-48 fin-flex fin-justify-center fin-items-center">
                    <span className="text-slate-500 text-xs">No expenses logged inside filter criteria.</span>
                  </div>
                ) : (
                  <div className="analytics-donut-container">
                    {/* SVG Donut Circle */}
                    <svg className="analytics-donut-svg" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" className="analytics-donut-circle-bg" />
                      {expenseChartSlices.map((slice, idx) => (
                        <circle
                          key={idx}
                          cx="21"
                          cy="21"
                          r="15.915"
                          className="analytics-donut-circle-segment"
                          stroke={slice.color}
                          strokeDasharray={slice.strokeDash}
                          strokeDashoffset={slice.strokeOffset}
                        />
                      ))}
                    </svg>

                    {/* Legend list */}
                    <div className="analytics-legend-list">
                      {visibleExpenseLegendSlices.map((slice, idx) => (
                        <div key={idx} className="analytics-legend-item">
                          <div className="legend-label-col">
                            <span className="legend-color-dot" style={{ backgroundColor: slice.color }} />
                            <span className="legend-label-text">{slice.name}</span>
                          </div>
                          <span className="legend-value-text">{Math.round(slice.percent)}%</span>
                        </div>
                      ))}
                    </div>
                    {expenseChartSlices.length > legendVisibleLimit && (
                      <button
                        type="button"
                        className="analytics-legend-toggle"
                        onClick={() => setShowAllExpenseLegend(prev => !prev)}
                      >
                        {showAllExpenseLegend
                          ? "Collapse"
                          : `Show ${expenseChartSlices.length - legendVisibleLimit} more`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Income Breakdown Pie (Donut) Chart */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h4 className="stats-title" style={{ fontSize: "14px", color: "#fff", textTransform: "none", letterSpacing: "normal" }}>Income Breakdown</h4>
                    <p className="analytics-card-copy">Category weight across filtered income.</p>
                  </div>
                  <span className="total-txs-badge">{formatCurrency(totalFilteredIncome)}</span>
                </div>

                {totalFilteredIncome === 0 ? (
                  <div className="h-48 fin-flex fin-justify-center fin-items-center">
                    <span className="text-slate-500 text-xs">No income logged inside filter criteria.</span>
                  </div>
                ) : (
                  <div className="analytics-donut-container">
                    {/* SVG Donut Circle */}
                    <svg className="analytics-donut-svg" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" className="analytics-donut-circle-bg" />
                      {incomeChartSlices.map((slice, idx) => (
                        <circle
                          key={idx}
                          cx="21"
                          cy="21"
                          r="15.915"
                          className="analytics-donut-circle-segment"
                          stroke={slice.color}
                          strokeDasharray={slice.strokeDash}
                          strokeDashoffset={slice.strokeOffset}
                        />
                      ))}
                    </svg>

                    {/* Legend list */}
                    <div className="analytics-legend-list">
                      {visibleIncomeLegendSlices.map((slice, idx) => (
                        <div key={idx} className="analytics-legend-item">
                          <div className="legend-label-col">
                            <span className="legend-color-dot" style={{ backgroundColor: slice.color }} />
                            <span className="legend-label-text">{slice.name}</span>
                          </div>
                          <span className="legend-value-text">{Math.round(slice.percent)}%</span>
                        </div>
                      ))}
                    </div>
                    {incomeChartSlices.length > legendVisibleLimit && (
                      <button
                        type="button"
                        className="analytics-legend-toggle"
                        onClick={() => setShowAllIncomeLegend(prev => !prev)}
                      >
                        {showAllIncomeLegend
                          ? "Collapse"
                          : `Show ${incomeChartSlices.length - legendVisibleLimit} more`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: QUICK ADD TRANSACTION */}
      {showTxModal && (
        <div className="finance-modal-overlay">
          <div className="finance-modal-card animate-scale-up">
            <button
              onClick={cancelEditTransaction}
              className="finance-modal-close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="finance-modal-title">{editingTransactionId ? "Edit Transaction" : "Record Transaction"}</h3>
            <form onSubmit={handleAddTransaction} className="fin-space-y-4 text-slate-300 text-xs">
              {/* Type Choice */}
              <div className="sidebar-selector-group">
                {(["expense", "income", "transfer"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxType(t)}
                    className={`sidebar-selector-btn ${txType === t ? "active" : ""}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="fin-space-y-1">
                <label className="block text-slate-400 font-semibold uppercase">Amount ({currencyCode})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="custom-input fin-w-full"
                />
              </div>

              {/* Description */}
              <div className="fin-space-y-1">
                <label className="block text-slate-400 font-semibold uppercase">Memo / Note</label>
                <input
                  type="text"
                  placeholder="Groceries, salary, transfer text..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="custom-input fin-w-full"
                />
              </div>

              {/* Date */}
              <div className="fin-space-y-1">
                <label className="block text-slate-400 font-semibold uppercase">Date</label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="custom-input fin-w-full"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              {/* Wallets */}
              <div className="fin-grid fin-grid-cols-2 fin-gap-3">
                <div className="fin-space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase">
                    {txType === "transfer" ? "Source Wallet" : "Wallet Account"}
                  </label>
                  <select
                    required
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="custom-input custom-select fin-w-full"
                  >
                    <option value="">Select Wallet</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {txType === "transfer" ? (
                  <div className="fin-space-y-1">
                    <label className="block text-slate-400 font-semibold uppercase">Target Wallet</label>
                    <select
                      required
                      value={txTargetAccountId}
                      onChange={(e) => setTxTargetAccountId(e.target.value)}
                      className="custom-input custom-select fin-w-full"
                    >
                      <option value="">Select Wallet</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="fin-space-y-1">
                    <label className="block text-slate-400 font-semibold uppercase">Category</label>
                    <select
                      required
                      value={txCategoryId}
                      onChange={(e) => setTxCategoryId(e.target.value)}
                      className="custom-input custom-select fin-w-full"
                    >
                      <option value="">Select Category</option>
                      {categories.filter(c => c.type === txType).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="primary-btn fin-w-full" style={{ marginTop: "12px" }}>
                <span>{editingTransactionId ? "Save Changes" : "Submit transaction"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
