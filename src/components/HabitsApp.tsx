import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Check,
  Trash2,
  Flame,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Pencil,
  MoreVertical,
  X
} from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

interface Habit {
  id: string;
  name: string;
  targetHours?: number; // Target daily hours
  streak: number;
  completedDates: string[]; // YYYY-MM-DD (maintained for backwards compatibility)
  createdAt: string;
  color: string;
  logs?: Record<string, number>; // YYYY-MM-DD -> hours completed
}

interface HabitsAppProps {
  userId: string;
}

interface DayCell {
  dateStr: string | null;
  dayNum: number | null;
  hours: number;
}

interface MonthCalendarData {
  monthName: string;
  year: number;
  month: number;
  cells: DayCell[];
}

const getMonthCalendar = (
  year: number,
  month: number,
  completedDates: string[],
  logs: Record<string, number> = {}
): MonthCalendarData => {
  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const numDays = new Date(year, month + 1, 0).getDate();

  const cells: DayCell[] = [];

  // Add offset cells
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ dateStr: null, dayNum: null, hours: 0 });
  }

  // Add calendar day cells
  for (let day = 1; day <= numDays; day++) {
    const dateObj = new Date(year, month, day);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Check custom hours
    let hours = logs[dateStr] || 0;
    // For backwards compatibility: if no log entry but the date is in completedDates, default to 2 hours
    if (hours === 0 && completedDates.includes(dateStr)) {
      hours = 2;
    }

    cells.push({
      dateStr,
      dayNum: day,
      hours
    });
  }

  return {
    monthName,
    year,
    month,
    cells
  };
};

const getMonthsSinceCreation = (
  createdAtStr: string,
  completedDates: string[],
  logs: Record<string, number> = {}
): MonthCalendarData[] => {
  const list: MonthCalendarData[] = [];
  const createdDate = new Date(createdAtStr || Date.now());
  const now = new Date();

  let startYear = createdDate.getFullYear();
  let startMonth = createdDate.getMonth();

  const endYear = now.getFullYear();
  const endMonth = now.getMonth();

  // Guard check: if start date is in the future, set to current
  if (createdDate > now) {
    startYear = endYear;
    startMonth = endMonth;
  }

  let currYear = startYear;
  let currMonth = startMonth;

  while (true) {
    list.push(getMonthCalendar(currYear, currMonth, completedDates, logs));

    if (currYear === endYear && currMonth === endMonth) {
      break;
    }

    currMonth++;
    if (currMonth > 11) {
      currMonth = 0;
      currYear++;
    }
  }

  return list;
};

const getCurrentMonthCalendar = (
  completedDates: string[],
  logs: Record<string, number> = {}
): MonthCalendarData => {
  const now = new Date();
  return getMonthCalendar(now.getFullYear(), now.getMonth(), completedDates, logs);
};

interface HabitHistoryGridProps {
  completedDates: string[];
  todayStr: string;
  createdAt: string;
  expanded: boolean;
  logs?: Record<string, number>;
  targetHours?: number;
  onToggleDate: (dateStr: string, currentHours: number) => void;
}

const getCellStyle = (
  hrs: number,
  targetHours: number = 2,
  isDisabled: boolean,
  isToday: boolean
): { className: string; style?: React.CSSProperties; titleStatus: string } => {
  if (isDisabled) {
    return {
      className: `history-cell ${isToday ? "today" : ""}`,
      titleStatus: " (Locked)"
    };
  }

  const target = targetHours > 0 ? targetHours : 2;

  // Case 1: Missed day / Unlogged (0 hrs)
  if (hrs <= 0) {
    return {
      className: `history-cell ${isToday ? "today" : ""}`,
      titleStatus: ` (0 hrs / ${target} hrs target)`
    };
  }

  // Case 2: Overachieved (hrs > target)
  if (hrs > target) {
    return {
      className: `history-cell overachieved ${isToday ? "today" : ""}`,
      style: {
        backgroundColor: "#eab308",
        borderColor: "#fde047",
        boxShadow: "0 0 8px rgba(234, 179, 8, 0.6)"
      },
      titleStatus: ` (${hrs} hrs / ${target} hrs target - Overachieved!)`
    };
  }

  // Case 3: Exact target met (hrs === target)
  if (hrs === target) {
    return {
      className: `history-cell target-met ${isToday ? "today" : ""}`,
      style: {
        backgroundColor: "#10b981",
        borderColor: "#34d399",
        boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)"
      },
      titleStatus: ` (${hrs} hrs / ${target} hrs target - Target met 100%)`
    };
  }

  // Case 4: Partial completion (0 < hrs < target)
  const ratio = Math.max(0.05, Math.min(0.99, hrs / target));
  const percent = (ratio * 100).toFixed(1);
  const alpha = (0.15 + ratio * 0.75).toFixed(2);
  const borderAlpha = (0.3 + ratio * 0.7).toFixed(2);

  return {
    className: `history-cell partial ${isToday ? "today" : ""}`,
    style: {
      backgroundColor: `rgba(16, 185, 129, ${alpha})`,
      borderColor: `rgba(52, 211, 153, ${borderAlpha})`,
      boxShadow: `0 0 ${Math.max(2, Math.round(ratio * 6))}px rgba(16, 185, 129, ${alpha})`
    },
    titleStatus: ` (${hrs} hrs / ${target} hrs target - ${percent}% brightness)`
  };
};

const HabitHistoryGrid: React.FC<HabitHistoryGridProps> = ({
  completedDates,
  todayStr,
  createdAt,
  expanded,
  logs = {},
  targetHours = 2,
  onToggleDate
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the far right when expanded to focus on the current month
  useEffect(() => {
    if (expanded && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [expanded]);

  const createdDateStr = createdAt.split("T")[0];

  if (!expanded) {
    const currentMonth = getCurrentMonthCalendar(completedDates, logs);
    return (
      <div className="current-month-container animate-fade-in">
        <div className="habit-history-grid calendar-layout">
          {currentMonth.cells.map((cell, idx) => {
            if (cell.dateStr === null) {
              return <div key={`empty-${idx}`} className="history-cell-placeholder" />;
            }
            const isToday = cell.dateStr === todayStr;
            const isCellDisabled = cell.dateStr < createdDateStr || cell.dateStr > todayStr;
            const cellInfo = getCellStyle(cell.hours, targetHours, isCellDisabled, isToday);

            return (
              <button
                key={cell.dateStr}
                className={cellInfo.className}
                style={cellInfo.style}
                disabled={isCellDisabled}
                onClick={() => onToggleDate(cell.dateStr!, cell.hours)}
                title={`${cell.dateStr}${cellInfo.titleStatus}${isToday ? ' (Today)' : ''}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const pastMonths = getMonthsSinceCreation(createdAt, completedDates, logs);
  return (
    <div
      className="habit-history-expanded-scroll animate-fade-in"
      ref={scrollContainerRef}
    >
      {pastMonths.map((month, mIdx) => (
        <div key={mIdx} className="month-calendar-block">
          <span className="month-grid-title">{month.monthName}</span>
          <div className="habit-history-grid calendar-layout">
            {month.cells.map((cell, idx) => {
              if (cell.dateStr === null) {
                return <div key={`empty-${mIdx}-${idx}`} className="history-cell-placeholder" />;
              }
              const isToday = cell.dateStr === todayStr;
              const isCellDisabled = cell.dateStr < createdDateStr || cell.dateStr > todayStr;
              const cellInfo = getCellStyle(cell.hours, targetHours, isCellDisabled, isToday);

              return (
                <button
                  key={cell.dateStr}
                  className={cellInfo.className}
                  style={cellInfo.style}
                  disabled={isCellDisabled}
                  onClick={() => onToggleDate(cell.dateStr!, cell.hours)}
                  title={`${cell.dateStr}${cellInfo.titleStatus}${isToday ? ' (Today)' : ''}`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export const HabitsApp: React.FC<HabitsAppProps> = ({ userId }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitTargetHours, setNewHabitTargetHours] = useState<string>("3");
  const [selectedColor, setSelectedColor] = useState("#8b5cf6"); // violet default
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedHabits, setExpandedHabits] = useState<Record<string, boolean>>({});
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showLogHoursModal, setShowLogHoursModal] = useState(false);
  const [logHoursHabitId, setLogHoursHabitId] = useState<string | null>(null);
  const [logHoursDate, setLogHoursDate] = useState<string>("");
  const [logHoursVal, setLogHoursVal] = useState<string>("3");
  const [showAtRiskDetails, setShowAtRiskDetails] = useState(false);
  const [focusedHabitId, setFocusedHabitId] = useState<string | null>(null);
  const [openHabitMenuId, setOpenHabitMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".habit-menu-wrap")) {
        setOpenHabitMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleGlobalPointerDown);
    return () => document.removeEventListener("mousedown", handleGlobalPointerDown);
  }, []);

  const startEditHabit = (habit: Habit) => {
    setOpenHabitMenuId(null);
    setEditingHabitId(habit.id);
    setNewHabitName(habit.name);
    setNewHabitTargetHours(habit.targetHours?.toString() || "3");
    setSelectedColor(habit.color);
    setTimeout(() => {
      document.querySelector(".app-sidebar-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const cancelEditHabit = () => {
    setEditingHabitId(null);
    setNewHabitName("");
    setNewHabitTargetHours("3");
    setSelectedColor("#8b5cf6");
  };

  const toggleExpand = (habitId: string) => {
    setExpandedHabits((prev) => ({
      ...prev,
      [habitId]: !prev[habitId]
    }));
  };

  const colors = [
    "#8b5cf6", // Violet
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#ec4899", // Pink
  ];

  const todayStr = new Date().toISOString().split("T")[0];

  // Load habits from Firestore
  useEffect(() => {
    const fetchHabits = async () => {
      try {
        if (db && userId) {
          const docRef = doc(db, "user", userId, "productivity", "habits");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().habits) {
            setHabits(docSnap.data().habits);
          }
        }
      } catch (e: any) {
        console.warn("Firestore habits fetch failed:", e);
        setErrorMsg("Unable to load habits from cloud. Please retry.");
        setTimeout(() => setErrorMsg(""), 3000);
      }

      setLoading(false);
    };

    fetchHabits();
  }, [userId]);

  // Save habits utility
  const saveHabits = async (updatedHabits: Habit[]) => {
    setHabits(updatedHabits);

    // Save to Firestore
    try {
      if (db && userId) {
        const docRef = doc(db, "user", userId, "productivity", "habits");
        await setDoc(docRef, { habits: updatedHabits }, { merge: true });
      }
    } catch (e: any) {
      console.warn("Firestore habits save failed:", e);
      setErrorMsg("Cloud save failed. Your latest changes may not be persisted.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const parsedTarget = parseFloat(newHabitTargetHours);
    const targetHours = isNaN(parsedTarget) || parsedTarget <= 0 ? 3 : parsedTarget;

    if (editingHabitId) {
      const updated = habits.map((h) =>
        h.id === editingHabitId ? { ...h, name: newHabitName.trim(), targetHours, color: selectedColor } : h
      );
      saveHabits(updated);
      setEditingHabitId(null);
      setNewHabitName("");
      setNewHabitTargetHours("3");
      setSelectedColor("#8b5cf6");
    } else {
      const newHabit: Habit = {
        id: Date.now().toString(),
        name: newHabitName.trim(),
        targetHours,
        streak: 0,
        completedDates: [],
        createdAt: new Date().toISOString(),
        color: selectedColor,
      };

      const updated = [...habits, newHabit];
      saveHabits(updated);
      setNewHabitName("");
      setNewHabitTargetHours("3");
    }
  };

  const toggleHabitCompletion = (habitId: string) => {
    const habitObj = habits.find(h => h.id === habitId);
    if (!habitObj) return;

    const isCompletedToday = habitObj.completedDates.includes(todayStr);

    if (!isCompletedToday) {
      const target = habitObj.targetHours || 3;
      const currentHours = habitObj.logs?.[todayStr] !== undefined && habitObj.logs[todayStr] > 0
        ? habitObj.logs[todayStr]
        : target;
      setLogHoursHabitId(habitId);
      setLogHoursDate(todayStr);
      setLogHoursVal(currentHours.toString());
      setShowLogHoursModal(true);
    } else {
      const updated = habits.map((habit) => {
        if (habit.id !== habitId) return habit;
        const updatedDates = habit.completedDates.filter((date) => date !== todayStr);
        const updatedLogs = { ...habit.logs };
        updatedLogs[todayStr] = 0;
        const newStreak = Math.max(0, habit.streak - 1);
        return {
          ...habit,
          completedDates: updatedDates,
          logs: updatedLogs,
          streak: newStreak
        };
      });
      saveHabits(updated);
    }
  };

  const toggleHabitDateCompletion = (habitId: string, dateStr: string, currentHours: number) => {
    const habitObj = habits.find((h) => h.id === habitId);
    const target = habitObj?.targetHours || 3;
    setLogHoursHabitId(habitId);
    setLogHoursDate(dateStr);
    setLogHoursVal(currentHours > 0 ? currentHours.toString() : target.toString());
    setShowLogHoursModal(true);
  };

  const handleSaveHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logHoursHabitId) return;

    const hours = parseFloat(logHoursVal);
    if (isNaN(hours) || hours < 0) {
      alert("Please enter a valid positive number.");
      return;
    }

    const updated = habits.map((habit) => {
      if (habit.id !== logHoursHabitId) return habit;

      let updatedDates = [...habit.completedDates];
      const updatedLogs = { ...habit.logs, [logHoursDate]: hours };

      if (hours > 0) {
        if (!updatedDates.includes(logHoursDate)) {
          updatedDates.push(logHoursDate);
        }
      } else {
        updatedDates = updatedDates.filter((d) => d !== logHoursDate);
      }

      // Recalculate streak based on consecutive dates starting from today or yesterday
      let newStreak = 0;
      const checkDate = new Date();
      const todayString = checkDate.toISOString().split("T")[0];

      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayString = checkDate.toISOString().split("T")[0];

      let streakStart = null;
      if (updatedDates.includes(todayString)) {
        streakStart = new Date();
      } else if (updatedDates.includes(yesterdayString)) {
        streakStart = new Date();
        streakStart.setDate(streakStart.getDate() - 1);
      }

      if (streakStart) {
        newStreak = 0;
        const countDate = new Date(streakStart);
        while (true) {
          const checkStr = countDate.toISOString().split("T")[0];
          if (updatedDates.includes(checkStr)) {
            newStreak++;
            countDate.setDate(countDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      return {
        ...habit,
        completedDates: updatedDates,
        logs: updatedLogs,
        streak: newStreak
      };
    });

    saveHabits(updated);
    setShowLogHoursModal(false);
    setLogHoursHabitId(null);
  };

  const handleDeleteLog = () => {
    if (!logHoursHabitId) return;
    const updated = habits.map((habit) => {
      if (habit.id !== logHoursHabitId) return habit;
      const updatedDates = habit.completedDates.filter((d) => d !== logHoursDate);
      const updatedLogs = { ...habit.logs };
      delete updatedLogs[logHoursDate];

      // Recalculate streak based on consecutive dates starting from today or yesterday
      let newStreak = 0;
      const checkDate = new Date();
      const todayString = checkDate.toISOString().split("T")[0];
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayString = checkDate.toISOString().split("T")[0];

      let streakStart = null;
      if (updatedDates.includes(todayString)) {
        streakStart = new Date();
      } else if (updatedDates.includes(yesterdayString)) {
        streakStart = new Date();
        streakStart.setDate(streakStart.getDate() - 1);
      }

      if (streakStart) {
        newStreak = 0;
        const countDate = new Date(streakStart);
        while (true) {
          const checkStr = countDate.toISOString().split("T")[0];
          if (updatedDates.includes(checkStr)) {
            newStreak++;
            countDate.setDate(countDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      return {
        ...habit,
        completedDates: updatedDates,
        logs: updatedLogs,
        streak: newStreak
      };
    });

    saveHabits(updated);
    setShowLogHoursModal(false);
    setLogHoursHabitId(null);
  };

  const handleDeleteHabit = (habitId: string) => {
    setOpenHabitMenuId(null);
    if (window.confirm("Are you sure you want to delete this habit?")) {
      const updated = habits.filter((h) => h.id !== habitId);
      saveHabits(updated);
    }
  };

  const getCompletedCount = () => {
    return habits.filter((h) => h.completedDates.includes(todayStr)).length;
  };

  const completionRate = habits.length > 0 ? Math.round((getCompletedCount() / habits.length) * 100) : 0;

  const habitTrendData = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const dayStr = day.toISOString().split("T")[0];
    const completed = habits.filter((habit) => (habit.completedDates || []).includes(dayStr)).length;
    return {
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      value: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0,
    };
  });

  const trendSeries = habitTrendData.map((item) => item.value);

  const bestStreak = habits.length > 0 ? Math.max(...habits.map((habit) => habit.streak), 0) : 0;
  const trendAverage = trendSeries.length > 0 ? Math.round(trendSeries.reduce((sum, value) => sum + value, 0) / trendSeries.length) : 0;

  const lookbackDays = 14;
  const analysisDates = Array.from({ length: lookbackDays }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (lookbackDays - 1 - index));
    return day.toISOString().split("T")[0];
  });

  const dailyCompletionRate = analysisDates.map((dayStr) => {
    const doneCount = habits.filter((habit) => (habit.completedDates || []).includes(dayStr)).length;
    return habits.length > 0 ? (doneCount / habits.length) * 100 : 0;
  });

  const weeklySeries = dailyCompletionRate.slice(-7);
  const weeklyAdherence = weeklySeries.length > 0
    ? Math.round(weeklySeries.reduce((sum, value) => sum + value, 0) / weeklySeries.length)
    : 0;

  const weeklyPeak = weeklySeries.length > 0 ? Math.round(Math.max(...weeklySeries)) : 0;

  const weeklyMean = weeklySeries.length > 0
    ? weeklySeries.reduce((sum, value) => sum + value, 0) / weeklySeries.length
    : 0;
  const weeklyVariance = weeklySeries.length > 0
    ? weeklySeries.reduce((sum, value) => sum + Math.pow(value - weeklyMean, 2), 0) / weeklySeries.length
    : 0;
  const weeklyStdDev = Math.sqrt(weeklyVariance);
  const activeDaysInWeek = weeklySeries.filter((value) => value > 0).length;
  const consistencyStability = Math.max(0, Math.min(100, 100 - weeklyStdDev * 1.8));
  const activityCoverage = weeklySeries.length > 0 ? (activeDaysInWeek / weeklySeries.length) * 100 : 0;
  // Consistency must reward stable execution, but also penalize inactivity.
  const consistencyScore = Math.max(0, Math.min(100, Math.round(consistencyStability * (activityCoverage / 100))));

  const n = weeklySeries.length;
  const x = weeklySeries.map((_, index) => index + 1);
  const sumX = x.reduce((sum, value) => sum + value, 0);
  const sumY = weeklySeries.reduce((sum, value) => sum + value, 0);
  const sumXY = weeklySeries.reduce((sum, value, index) => sum + value * x[index], 0);
  const sumX2 = x.reduce((sum, value) => sum + value * value, 0);
  const slope = n > 1 ? ((n * sumXY) - (sumX * sumY)) / ((n * sumX2) - (sumX * sumX)) : 0;
  const hasMomentumSignal = activeDaysInWeek >= 2;
  const momentumLabel = !hasMomentumSignal ? "No signal" : slope > 1.25 ? "Rising" : slope < -1.25 ? "Dropping" : "Steady";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const recoveryPool = habits.filter((habit) => !(habit.completedDates || []).includes(yesterdayStr));
  const recoveredToday = recoveryPool.filter((habit) => (habit.completedDates || []).includes(todayStr));
  const recoveryRate = recoveryPool.length > 0 ? Math.round((recoveredToday.length / recoveryPool.length) * 100) : null;

  const todayDate = new Date(`${todayStr}T00:00:00`);
  const attentionHabitDetails = habits
    .map((habit) => {
      const completedSet = new Set(habit.completedDates || []);
      const createdDateStr = (habit.createdAt || todayStr).split("T")[0];
      const completedSorted = [...(habit.completedDates || [])].filter((dayStr) => dayStr <= todayStr).sort();
      const lastCompletedDate = completedSorted.length > 0 ? completedSorted[completedSorted.length - 1] : null;
      const daysSinceLastCompletion = lastCompletedDate
        ? Math.max(
          0,
          Math.floor((todayDate.getTime() - new Date(`${lastCompletedDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24))
        )
        : null;
      const daysSinceCreated = Math.max(
        0,
        Math.floor((todayDate.getTime() - new Date(`${createdDateStr}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24))
      );

      const missedToday = !completedSet.has(todayStr);
      let consecutiveMissedDays = 0;
      let missedStartDate: string | null = null;

      if (missedToday) {
        const cursor = new Date(`${todayStr}T00:00:00`);
        while (true) {
          const cursorStr = cursor.toISOString().split("T")[0];
          if (cursorStr < createdDateStr) break;
          if (completedSet.has(cursorStr)) break;
          missedStartDate = cursorStr;
          consecutiveMissedDays += 1;
          cursor.setDate(cursor.getDate() - 1);
        }

        if (missedStartDate) {
          const start = new Date(`${missedStartDate}T00:00:00`);
          const inclusiveDays = Math.floor((todayDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          consecutiveMissedDays = Math.max(1, inclusiveDays);
        }
      }

      const attentionLevel = !missedToday
        ? null
        : consecutiveMissedDays >= 5
          ? "critical"
          : consecutiveMissedDays >= 2
            ? "warning"
            : "watch";

      return {
        id: habit.id,
        name: habit.name,
        missedToday,
        consecutiveMissedDays,
        missedStartDate,
        attentionLevel,
        lastCompletedDate,
        daysSinceLastCompletion,
        daysSinceCreated,
      };
    })
    .filter((habit) => habit.missedToday)
    .sort((a, b) => {
      if (a.consecutiveMissedDays !== b.consecutiveMissedDays) {
        return b.consecutiveMissedDays - a.consecutiveMissedDays;
      }
      return a.name.localeCompare(b.name);
    });

  const criticalHabits = attentionHabitDetails.filter((habit) => habit.attentionLevel === "critical").length;
  const warningHabits = attentionHabitDetails.filter((habit) => habit.attentionLevel === "warning").length;
  const watchlistHabits = attentionHabitDetails.filter((habit) => habit.attentionLevel === "watch").length;
  const attentionHabits = attentionHabitDetails.length;

  const focusHabitFromInsight = (habitId: string) => {
    setExpandedHabits((prev) => ({ ...prev, [habitId]: true }));
    setFocusedHabitId(habitId);

    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-habit-id="${habitId}"]`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    setTimeout(() => {
      setFocusedHabitId((current) => (current === habitId ? null : current));
    }, 2200);
  };

  return (
    <div className="micro-app-container habits-app">
      <div className="app-header-area habits-hero">
        <div>
          <h2 className="app-title">Habit Tracker</h2>
          <p className="app-subtitle">Shape your routine with a calm, focused view of your daily momentum.</p>
        </div>

        <div className="habits-hero-badges">
          {habits.length > 0 && (
            <div className="progress-radial-badge" style={{ borderColor: selectedColor }}>
              <span className="rate-text">{completionRate}% Done</span>
            </div>
          )}
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        </div>
      </div>

      {errorMsg && (
        <div className="app-alert warn">
          <Info className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="app-grid-layout">
        {/* Left Side: Create & Status */}
        <div className="app-sidebar-card habit-sidebar-card">
          <div className="habit-sidebar-panel">
            <div className="habit-sidebar-top">
              <div>
                <p className="section-eyebrow">Daily setup</p>
                <h3 className="card-sec-title">{editingHabitId ? "Edit Habit" : "Create New Habit"}</h3>
              </div>
              <div className="panel-glow" />
            </div>
          </div>
          <form onSubmit={handleAddHabit} className="create-habit-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="E.g., Read 15 mins, Drink Water..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                maxLength={40}
                className="custom-input"
              />
            </div>

            <div className="input-group fin-mt-3">
              <label className="block text-slate-400 text-[10px] font-semibold uppercase mb-1">
                Target Hours / Day
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="E.g., 3"
                value={newHabitTargetHours}
                onChange={(e) => setNewHabitTargetHours(e.target.value)}
                className="custom-input fin-w-full"
              />
            </div>

            <div className="color-picker-sec">
              <span className="label">Pick a Theme:</span>
              <div className="color-dots">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-dot ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            {editingHabitId ? (
              <div className="fin-flex fin-gap-2">
                <button type="submit" className="primary-btn w-full">
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={cancelEditHabit}
                  className="action-icon-btn delete"
                  style={{ height: "40px", width: "40px", flexShrink: 0, padding: 0 }}
                  title="Cancel edit"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="submit" className="primary-btn w-full">
                <Plus className="w-4 h-4" />
                <span>Add Habit</span>
              </button>
            )}
          </form>

          {/* Quick Stats */}
          <div className="stats-box-vertical">
            <h4 className="stats-title">Snapshot</h4>
            <div className="stats-highlight-grid">
              <div className="stat-highlight-card">
                <span className="stats-label">Total</span>
                <strong>{habits.length}</strong>
              </div>
              <div className="stat-highlight-card accent">
                <span className="stats-label">Today</span>
                <strong>{getCompletedCount()}</strong>
              </div>
              <div className="stat-highlight-card">
                <span className="stats-label">Best streak</span>
                <strong>
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  {habits.length > 0 ? Math.max(...habits.map((h) => h.streak), 0) : 0}
                </strong>
              </div>
            </div>
          </div>

          <div className="habit-analytics-card habit-analytics-card--below-editor">
            <div className="habit-analytics-header">
              <div>
                <p className="section-eyebrow">Progress</p>
                <h4>Overall momentum</h4>
              </div>
              <span className="habit-analytics-pill">{trendAverage}% avg</span>
            </div>
            <div className="habit-chart-shell">
              <div className="habit-analytics-kpis">
                <div className="habit-kpi-chip">
                  <span>Adherence (7d)</span>
                  <strong>{weeklyAdherence}%</strong>
                </div>
                <div className="habit-kpi-chip">
                  <span>Consistency score</span>
                  <strong>{consistencyScore}%</strong>
                </div>
                <div className="habit-kpi-chip">
                  <span>Weekly peak</span>
                  <strong>{weeklyPeak}%</strong>
                </div>
              </div>
              <div className="habit-insight-list">
                <div className="habit-insight-row">
                  <span className="insight-label">Momentum</span>
                  <strong className="insight-value">{momentumLabel}</strong>
                  <p className="insight-note">
                    {hasMomentumSignal
                      ? `Trend slope over last 7 days: ${slope.toFixed(2)} points/day.`
                      : "Need at least 2 active days in the last 7 days to compute trend direction."}
                  </p>
                </div>
                <div className="habit-insight-row">
                  <span className="insight-label">Recovery Rate</span>
                  <strong className="insight-value">{recoveryRate === null ? "N/A" : `${recoveryRate}%`}</strong>
                  <p className="insight-note">
                    {recoveryPool.length > 0
                      ? `${recoveredToday.length} of ${recoveryPool.length} habits missed yesterday were completed today.`
                      : "All habits were completed yesterday, so recovery is not applicable today."}
                  </p>
                </div>
                <div className="habit-insight-row habit-insight-row--interactive">
                  <span className="insight-label">Attention Needed</span>
                  <div className="insight-value-stack">
                    <strong className="insight-value">{attentionHabits} {attentionHabits === 1 ? "habit" : "habits"}</strong>
                    {attentionHabits > 0 && (
                      <button
                        type="button"
                        className="habit-insight-toggle"
                        onClick={() => setShowAtRiskDetails((prev) => !prev)}
                      >
                        {showAtRiskDetails ? "Hide details" : "View details"}
                      </button>
                    )}
                  </div>
                  <p className="insight-note">
                    {attentionHabits > 0
                      ? `${criticalHabits} critical, ${warningHabits} warning, ${watchlistHabits} watch. Open details to jump directly to each habit.`
                      : "No habits are missed for today."}
                  </p>
                  {showAtRiskDetails && attentionHabits > 0 && (
                    <div className="habit-risk-list">
                      {attentionHabitDetails.map((habit) => (
                        <button
                          key={habit.id}
                          type="button"
                          className="habit-risk-item"
                          onClick={() => focusHabitFromInsight(habit.id)}
                        >
                          <span className="habit-risk-name">{habit.name}</span>
                          <span className="habit-risk-meta">
                            {habit.missedStartDate
                              ? `You lost track for the last ${habit.consecutiveMissedDays} day${habit.consecutiveMissedDays === 1 ? "" : "s"}. Let's get back on it today.`
                              : `You lost track for the last ${habit.consecutiveMissedDays} day${habit.consecutiveMissedDays === 1 ? "" : "s"}. Let's get back on it today.`}
                          </span>
                          <span className={`habit-risk-badge ${habit.attentionLevel === "critical" ? "critical" : habit.attentionLevel === "warning" ? "warning" : "watch"}`}>
                            {habit.attentionLevel === "critical" ? "Critical" : habit.attentionLevel === "warning" ? "Warning" : "Watch"}
                          </span>
                          <span className="habit-risk-open">Open</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: List of Habits */}
        <div className="app-main-content">
          <div className="content-header habits-content-header">
            <div>
              <p className="section-eyebrow">Momentum board</p>
              <h3 className="card-sec-title">Today's Habits</h3>
            </div>
            <span className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>

          <div className="habit-premium-banner">
            <div className="habit-banner-copy">
              <p className="section-eyebrow">Momentum deck</p>
              <h3>Stay in motion and let your habit line tell the story.</h3>
              <p>Your daily consistency is now visible at a glance, with clear signals for gains, stability, and recovery.</p>
            </div>
            <div className="habit-banner-pills">
              <div className="habit-banner-pill">⭐ {completionRate}% today</div>
              <div className="habit-banner-pill">🔥 {bestStreak} best streak</div>
            </div>
          </div>

          {loading ? (
            <div className="app-loader">
              <div className="spinner"></div>
              <p>Syncing habits...</p>
            </div>
          ) : habits.length === 0 ? (
            <div className="empty-state-view">
              <div className="empty-icon-wrapper">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h4>No habits created yet</h4>
              <p>Use the form on the left to start tracking your daily progress.</p>
            </div>
          ) : (
            <div className="habits-list">
              {habits.map((habit) => {
                const isCompleted = habit.completedDates.includes(todayStr);
                return (
                  <div
                    key={habit.id}
                    className={`habit-row-card ${isCompleted ? 'completed' : ''} ${focusedHabitId === habit.id ? 'focused' : ''}`}
                    data-habit-id={habit.id}
                    style={{ '--habit-theme': habit.color } as React.CSSProperties}
                  >
                    <div className="habit-row-main">
                      <button
                        className={`habit-checkbox-btn ${isCompleted ? 'checked' : ''}`}
                        onClick={() => toggleHabitCompletion(habit.id)}
                        style={{
                          borderColor: isCompleted ? 'transparent' : habit.color,
                          backgroundColor: isCompleted ? habit.color : 'transparent'
                        }}
                      >
                        {isCompleted && <Check className="w-4 h-4 text-slate-900 stroke-[3px]" />}
                      </button>

                      <div className="habit-info-col">
                        <span className="habit-name">{habit.name}</span>
                        <div className="habit-metadata">
                          <span className="streak-tag">
                            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                            <span>{habit.streak} day streak</span>
                          </span>
                          <span className="bullet">•</span>
                          <span className="target-tag text-indigo-400 font-medium">
                            Target: {habit.targetHours || 3} hrs/day
                          </span>
                          <span className="bullet">•</span>
                          <span className="completion-count">
                            Completed {habit.completedDates.length} times
                          </span>
                          {habit.logs?.[todayStr] !== undefined && habit.logs[todayStr] > 0 && (
                            <>
                              <span className="bullet">•</span>
                              <span className="hours-tag text-green-400 font-semibold">
                                {habit.logs[todayStr]} hrs today
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="habit-actions-col">
                        <button
                          className="action-text-btn log-hours"
                          onClick={() => toggleHabitDateCompletion(habit.id, todayStr, habit.logs?.[todayStr] || (habit.completedDates.includes(todayStr) ? (habit.targetHours || 3) : 0))}
                          title="Log custom hours for today"
                        >
                          Log Hours
                        </button>
                        <div className="habit-menu-wrap">
                          <button
                            type="button"
                            className="action-icon-btn habit-menu-trigger"
                            onClick={() => setOpenHabitMenuId((current) => (current === habit.id ? null : habit.id))}
                            title="More actions"
                            aria-label="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openHabitMenuId === habit.id && (
                            <div className="habit-menu-popover" role="menu" aria-label="Habit actions menu">
                              <button
                                type="button"
                                className="habit-menu-item"
                                onClick={() => startEditHabit(habit)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="habit-menu-item danger"
                                onClick={() => handleDeleteHabit(habit.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* GitHub commit history grid (collapsible monthly/annual layout) */}
                    <div className="habit-history-grid-container">
                      <div className="grid-header-row">
                        <span className="grid-label">
                          {expandedHabits[habit.id] ? "12-Month History" : "Current Month Activity"}
                        </span>
                        <button
                          className="expand-history-btn"
                          onClick={() => toggleExpand(habit.id)}
                          title={expandedHabits[habit.id] ? "Collapse to current month" : "Expand to 12 months"}
                        >
                          <span>{expandedHabits[habit.id] ? "Collapse" : "Expand"}</span>
                          {expandedHabits[habit.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <HabitHistoryGrid
                        completedDates={habit.completedDates}
                        todayStr={todayStr}
                        createdAt={habit.createdAt}
                        expanded={!!expandedHabits[habit.id]}
                        logs={habit.logs}
                        targetHours={habit.targetHours || 3}
                        onToggleDate={(dateStr, currentHours) => toggleHabitDateCompletion(habit.id, dateStr, currentHours)}
                      />

                      <div className="habit-legend-strip">
                        <div className="habit-legend-item">
                          <span className="habit-legend-dot unlogged" />
                          <span>0h</span>
                        </div>
                        <div className="habit-legend-item">
                          <span className="habit-legend-dot partial" />
                          <span>Partial</span>
                        </div>
                        <div className="habit-legend-item">
                          <span className="habit-legend-dot target" />
                          <span>Target ({habit.targetHours || 3}h)</span>
                        </div>
                        <div className="habit-legend-item">
                          <span className="habit-legend-dot overachieved" />
                          <span>Overachieved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CUSTOM LOG HOURS MODAL */}
      {showLogHoursModal && (
        <div className="finance-modal-overlay">
          <div className="finance-modal-card animate-scale-up" style={{ maxWidth: "360px" }}>
            <button
              onClick={() => {
                setShowLogHoursModal(false);
                setLogHoursHabitId(null);
              }}
              className="finance-modal-close"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="finance-modal-title" style={{ fontSize: "16px", marginBottom: "16px" }}>Log Activity Hours</h3>
            <form onSubmit={handleSaveHours} className="fin-space-y-4">
              <p className="text-slate-400 text-xs" style={{ margin: "0 0 12px" }}>
                Logging hours for date: <strong className="text-white font-mono">{logHoursDate}</strong>
                {logHoursHabitId && (
                  <span className="block text-indigo-400 text-[11px] font-semibold fin-mt-1">
                    Daily Target: {habits.find(h => h.id === logHoursHabitId)?.targetHours || 3} hrs
                  </span>
                )}
              </p>

              <div className="fin-space-y-1">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase">Hours Completed</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0"
                  max="24"
                  placeholder="2.0"
                  value={logHoursVal}
                  onChange={(e) => setLogHoursVal(e.target.value)}
                  className="custom-input fin-w-full"
                  autoFocus
                />
              </div>

              <div className="fin-flex fin-gap-3 fin-mt-4">
                <button
                  type="button"
                  onClick={handleDeleteLog}
                  className="action-icon-btn delete"
                  style={{ height: "40px", width: "40px", flexShrink: 0, padding: 0 }}
                  title="Reset/Delete log for this day"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button type="submit" className="primary-btn fin-w-full">
                  <Check className="w-4 h-4" />
                  <span>Log Hours</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
