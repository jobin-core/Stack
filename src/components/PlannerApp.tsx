import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Coffee,
  CheckSquare,
  Info,
  MoreVertical,
  Pencil,
  Check,
  X,
  AlertTriangle,
  CalendarDays,
  Settings
} from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export type TaskStatus = "ToDo" | "InProgress" | "Blocked" | "Done";

interface Task {
  id: string;
  text: string;
  targetDate?: string;
  completed: boolean;
  status?: TaskStatus;
  createdAt: string;
}

interface PlannerAppProps {
  userId: string;
  globalFocusTime?: number;
  globalBreakTime?: number;
  globalLongBreakTime?: number;
}

export const PlannerApp: React.FC<PlannerAppProps> = ({ userId, globalFocusTime, globalBreakTime, globalLongBreakTime }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskTargetDate, setNewTaskTargetDate] = useState("");
  const [isDatePaletteOpen, setIsDatePaletteOpen] = useState(false);
  const [datePaletteMonth, setDatePaletteMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [infoMsg, setInfoMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [alarmActive, setAlarmActive] = useState(false);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskTargetDate, setEditingTaskTargetDate] = useState("");
  const [editingTaskStatus, setEditingTaskStatus] = useState<TaskStatus>("ToDo");

  // Timer States
  const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => (globalFocusTime || 25) * 60);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmOscRef = useRef<OscillatorNode | null>(null);
  const alarmGainRef = useRef<GainNode | null>(null);
  const alarmPatternIntervalRef = useRef<number | null>(null);
  const datePaletteRef = useRef<HTMLDivElement | null>(null);

  const ensureAudioContextReady = async (): Promise<AudioContext | null> => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }

      let ctx = audioCtxRef.current;
      if (!ctx) return null;

      const state = ctx.state as string;
      if (state === "suspended" || state === "interrupted") {
        try {
          await ctx.resume();
        } catch (e) {}
      }

      // Safari can remain interrupted; recreate context once as fallback.
      if ((ctx.state as string) !== "running") {
        try {
          audioCtxRef.current = new AudioCtx();
          const refreshedCtx = audioCtxRef.current;
          if (refreshedCtx && ((refreshedCtx.state as string) === "suspended" || (refreshedCtx.state as string) === "interrupted")) {
            await refreshedCtx.resume().catch(() => {});
          }
          ctx = refreshedCtx;
        } catch (e) {}
      }

      return ctx;
    } catch (e) {
      return null;
    }
  };

  const startAlarmLoop = () => {
    void ensureAudioContextReady().then((ctx) => {
      if (!ctx) return;
      try {
        // Ensure only one alarm source exists at a time
        if (alarmOscRef.current || alarmGainRef.current || alarmPatternIntervalRef.current != null) {
          stopAlarmLoop();
        }

        const master = ctx.createGain();
        master.gain.setValueAtTime(0.46, ctx.currentTime);
        master.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = "triangle";
        const ringtonePattern = [523.25, 659.25, 783.99, 659.25, 880.0, 659.25];
        osc.frequency.setValueAtTime(ringtonePattern[0], ctx.currentTime);
        osc.connect(master);
        osc.start();

        let step = 0;
        const beatMs = 240;
        const playStep = () => {
          const now = ctx.currentTime;
          const freq = ringtonePattern[step % ringtonePattern.length];
          step += 1;
          osc.frequency.cancelScheduledValues(now);
          osc.frequency.setValueAtTime(freq, now);
        };

        playStep();
        alarmPatternIntervalRef.current = window.setInterval(playStep, beatMs);

        alarmOscRef.current = osc;
        alarmGainRef.current = master;
        setAlarmActive(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Start alarm failed:", e);
      }
    });
  };

  const stopAlarmLoop = () => {
    try {
      // Capture current nodes first, clear refs immediately to avoid races.
      const osc = alarmOscRef.current;
      const gain = alarmGainRef.current;
      const patternInterval = alarmPatternIntervalRef.current;
      alarmOscRef.current = null;
      alarmGainRef.current = null;
      alarmPatternIntervalRef.current = null;
      setAlarmActive(false);

      if (patternInterval != null) {
        try {
          clearInterval(patternInterval);
        } catch (e) {}
      }

      // Smoothly ramp down then stop/disconnect deterministic local nodes.
      const ctx = audioCtxRef.current;
      if (gain && ctx) {
        try {
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
        } catch (e) {
          // ignore
        }
      }

      if (osc) {
        try {
          if (ctx) {
            osc.stop(ctx.currentTime + 0.06);
          } else {
            osc.stop();
          }
        } catch (e) {}
        setTimeout(() => {
          try {
            osc.disconnect();
          } catch (e) {}
        }, 130);
      }

      if (gain) {
        setTimeout(() => {
          try {
            gain.disconnect();
          } catch (e) {}
        }, 140);
      }
    } catch (e) {
      // ignore
    }
  };


  



  const times = {
    focus: (globalFocusTime || 25) * 60,
    shortBreak: (globalBreakTime || 5) * 60,
    longBreak: (globalLongBreakTime || 15) * 60,
  };

  useEffect(() => {
    // When workspace settings change, update the visible timer only if not running and no active alarm.
    if (!isRunning && !alarmActive) {
      setTimeLeft(times[mode]);
    }
  }, [globalFocusTime, globalBreakTime, globalLongBreakTime]);

  useEffect(() => {
    const handleGlobalPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".habit-menu-wrap")) {
        setOpenTaskMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleGlobalPointerDown);
    return () => document.removeEventListener("mousedown", handleGlobalPointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDatePaletteOpen) {
        setIsDatePaletteOpen(false);
      }
      if (event.key === "Escape" && editingTaskId) {
        cancelEditTask();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingTaskId, isDatePaletteOpen]);

  useEffect(() => {
    if (!isDatePaletteOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!datePaletteRef.current?.contains(target)) {
        setIsDatePaletteOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isDatePaletteOpen]);

  // cleanup alarm on unmount
  useEffect(() => {
    return () => {
      try {
        stopAlarmLoop();
      } catch (e) {}
    };
  }, []);

  // Switch timer mode
  const changeMode = (newMode: "focus" | "shortBreak" | "longBreak") => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(times[newMode]);
    stopAlarmLoop();
  };

  const handlePlayPause = () => {
    if (!isRunning) {
      // Starting/resuming timer: ensure audio context is ready and stop any active alarm
      try {
        stopAlarmLoop();
      } catch (e) {}
      void ensureAudioContextReady();

      setIsRunning(true);
    } else {
      // Pause the timer (do not stop the alarm here).
      setIsRunning(false);
    }
  };

  // Timer Tick Effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            // Show a non-blocking info banner instead of a blocking alert box
            setInfoMsg(`${mode === "focus" ? "Focus session" : "Break"} is over!`);
            setTimeout(() => setInfoMsg(""), 3500);
              // start repeating alarm until user stops it
              startAlarmLoop();
            return times[mode];
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  // Load Planner Tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        if (db && userId) {
          const docRef = doc(db, "user", userId, "productivity", "planner");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().tasks) {
            setTasks(docSnap.data().tasks);
            setLoading(false);
            return;
          }
        }
      } catch (e: any) {
        console.warn("Firestore planner fetch failed:", e);
        setErrorMsg("Unable to load planner tasks from cloud. Please retry.");
        setTimeout(() => setErrorMsg(""), 3000);
      }

      setLoading(false);
    };

    fetchTasks();
  }, [userId]);

  // Save Tasks
  const saveTasks = async (updated: Task[]) => {
    setTasks(updated);

    try {
      if (db && userId) {
        const docRef = doc(db, "user", userId, "productivity", "planner");
        const cleanTasks = updated.map((t) => {
          const item: Record<string, any> = {
            id: t.id,
            text: t.text,
            completed: Boolean(t.completed),
            status: t.status || (t.completed ? "Done" : "ToDo"),
            createdAt: t.createdAt || new Date().toISOString()
          };
          if (t.targetDate && t.targetDate.trim()) {
            item.targetDate = t.targetDate.trim();
          }
          return item;
        });

        await setDoc(docRef, { tasks: cleanTasks }, { merge: true });
      }
    } catch (e: any) {
      console.error("Firestore planner save failed:", e);
      setErrorMsg("Cloud save failed. Your latest changes may not be persisted.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      status: "ToDo",
      createdAt: new Date().toISOString()
    };
    if (newTaskTargetDate.trim()) {
      newTask.targetDate = newTaskTargetDate.trim();
    }

    const updated = [...tasks, newTask];
    saveTasks(updated);
    setNewTaskText("");
    setNewTaskTargetDate("");
  };

  const toISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseISODate = (dateStr?: string) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const openDatePalette = () => {
    const selected = parseISODate(newTaskTargetDate);
    if (selected) {
      setDatePaletteMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
    setIsDatePaletteOpen(true);
  };

  const closeDatePalette = () => {
    setIsDatePaletteOpen(false);
  };

  const handlePickDate = (date: Date) => {
    setNewTaskTargetDate(toISODate(date));
    closeDatePalette();
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus,
          completed: newStatus === "Done"
        };
      }
      return t;
    });
    saveTasks(updated);
  };

  const getTaskStatus = (task: Task): TaskStatus => task.status || (task.completed ? "Done" : "ToDo");

  const getStatusTone = (status: TaskStatus) => {
    if (status === "InProgress") return "inprogress";
    if (status === "Done") return "done";
    if (status === "Blocked") return "blocked";
    return "todo";
  };

  const getStatusLabel = (status: TaskStatus) => {
    if (status === "InProgress") return "In Progress";
    if (status === "Done") return "Completed";
    if (status === "Blocked") return "Blocked";
    return "To Do";
  };

  const cycleTaskStatus = (taskId: string) => {
    const order: TaskStatus[] = ["ToDo", "InProgress", "Done", "Blocked"];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const current = getTaskStatus(task);
    const currentIndex = order.indexOf(current);
    const next = order[(currentIndex + 1) % order.length];
    updateTaskStatus(taskId, next);
  };

  const startEditTask = (task: Task) => {
    setOpenTaskMenuId(null);
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskTargetDate(task.targetDate || "");
    setEditingTaskStatus(getTaskStatus(task));
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskTargetDate("");
    setEditingTaskStatus("ToDo");
  };

  const saveEditedTask = (taskId: string) => {
    const trimmed = editingTaskText.trim();
    if (!trimmed) return;
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const next: Task = {
          ...t,
          text: trimmed,
          status: editingTaskStatus,
          completed: editingTaskStatus === "Done",
        };
        if (editingTaskTargetDate.trim()) {
          next.targetDate = editingTaskTargetDate.trim();
        } else {
          delete next.targetDate;
        }
        return next;
      }
      return t;
    });
    saveTasks(updated);
    cancelEditTask();
  };

  const handleDeleteTask = (taskId: string) => {
    setOpenTaskMenuId(null);
    if (!window.confirm("Delete this task?")) return;
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasks(updated);
  };

  // Helper formatting for timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const todayISO = new Date().toISOString().split("T")[0];
  const todayDate = parseISODate(todayISO) || new Date();

  const getDayDiff = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [ty, tm, td] = todayISO.split("-").map(Number);
    const targetUtc = Date.UTC(y, (m || 1) - 1, d || 1);
    const todayUtc = Date.UTC(ty, (tm || 1) - 1, td || 1);
    return Math.floor((targetUtc - todayUtc) / 86400000);
  };

  const formatTargetDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.targetDate) return false;
    return getTaskStatus(task) !== "Done" && getDayDiff(task.targetDate) < 0;
  };

  const overdueTasks = tasks.filter(isTaskOverdue).sort((a, b) => (a.targetDate || "").localeCompare(b.targetDate || ""));
  const dueTodayTasks = tasks.filter((task) => task.targetDate === todayISO && getTaskStatus(task) !== "Done");
  const dueSoonTasks = tasks.filter((task) => {
    if (!task.targetDate || getTaskStatus(task) === "Done") return false;
    const diff = getDayDiff(task.targetDate);
    return diff > 0 && diff <= 3;
  });

  const completedCount = tasks.filter((t) => getTaskStatus(t) === "Done").length;
  const inProgressCount = tasks.filter((t) => getTaskStatus(t) === "InProgress").length;
  const blockedCount = tasks.filter((t) => getTaskStatus(t) === "Blocked").length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Progress percentage
  const totalModeSeconds = times[mode];
  const progressPercent = ((totalModeSeconds - timeLeft) / totalModeSeconds) * 100;

  const selectedDate = parseISODate(newTaskTargetDate);
  const monthStart = new Date(datePaletteMonth.getFullYear(), datePaletteMonth.getMonth(), 1);
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const calendarCells: Array<Date | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  return (
    <div className="micro-app-container planner-app">
      <div className="app-header-area">
        <div>
          <h2 className="app-title">Focus Planner</h2>
          <p className="app-subtitle">Block out distractions. Work in interval cycles, check off tasks.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="app-alert warn">
          <Info className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="app-alert info planner-info-banner">
          <Info className="w-4 h-4" />
          <span>{infoMsg}</span>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div className="app-alert error planner-overdue-banner">
          <AlertTriangle className="w-4 h-4" />
          <span>
            <strong>Attention:</strong> {overdueTasks.length} task{overdueTasks.length > 1 ? "s are" : " is"} past deadline.
            {overdueTasks[0] ? ` Urgent: ${overdueTasks[0].text}.` : ""}
          </span>
        </div>
      )}

      {overdueTasks.length === 0 && (dueTodayTasks.length > 0 || dueSoonTasks.length > 0) && (
        <div className="app-alert warn planner-overdue-banner">
          <CalendarDays className="w-4 h-4" />
          <span>
            {dueTodayTasks.length > 0
              ? `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? "s are" : " is"} due today.`
              : `${dueSoonTasks.length} task${dueSoonTasks.length > 1 ? "s are" : " is"} due in the next 3 days.`}
          </span>
        </div>
      )}

      <div className="app-grid-layout">
        {/* Left Side: Pomodoro Timer */}
        <div className="app-sidebar-card timer-section-card">
          <div className="timer-mode-selector">
            <button
              type="button"
              className="timer-settings-btn"
              title="Open timer settings"
              onClick={() => window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'settings' }))}
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="mode-item" style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <button
                className={`mode-btn ${mode === "focus" ? "active" : ""}`}
                onClick={() => changeMode("focus")}
                type="button"
              >
                <Clock className="w-4 h-4" />
                <span>Focus ({Math.round(times.focus / 60)}m)</span>
              </button>
            </div>

            <div className="mode-item" style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <button
                className={`mode-btn ${mode === "shortBreak" ? "active" : ""}`}
                onClick={() => changeMode("shortBreak")}
                type="button"
              >
                <Coffee className="w-4 h-4" />
                <span>Short Break ({Math.round(times.shortBreak / 60)}m)</span>
              </button>
            </div>

            <div className="mode-item" style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <button
                className={`mode-btn ${mode === "longBreak" ? "active" : ""}`}
                onClick={() => changeMode("longBreak")}
                type="button"
              >
                <Coffee className="w-4 h-4" />
                <span>Long Break ({Math.round(times.longBreak / 60)}m)</span>
              </button>
            </div>
          </div>

          <div className="pomodoro-display-wrapper">
            {/* Circular Progress Ring Mock */}
            <div className="radial-progress-container">
              <svg className="radial-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" className="circle-bg" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="circle-progress"
                  style={{
                    strokeDasharray: 283,
                    strokeDashoffset: 283 - (283 * progressPercent) / 100,
                  }}
                />
              </svg>
              <div className="time-text-wrapper">
                <span className="time-countdown">{formatTime(timeLeft)}</span>
                <span className="time-mode-label">{mode === "focus" ? "Stay Focused" : "Take a Break"}</span>
              </div>
            </div>
          </div>

          <div className="timer-controls">
            {/* Primary control: Pause when running; Start/Resume when idle; Stop Alert when alarm active */}
            <button
              className={`control-btn play-pause ${alarmActive ? "stop" : ""}`}
              onClick={() => {
                if (alarmActive) {
                  // Stop the repeating alarm
                  stopAlarmLoop();
                } else {
                  handlePlayPause();
                }
              }}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : alarmActive ? (
                <>
                  <X className="w-5 h-5" />
                  <span>Stop Alert</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {timeLeft < times[mode]
                      ? mode === "focus"
                        ? "Resume Focus"
                        : "Resume Break"
                      : mode === "focus"
                        ? "Start Focus"
                        : "Start Break"}
                  </span>
                </>
              )}
            </button>

            <button
              className="control-btn reset"
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(times[mode]);
                stopAlarmLoop();
              }}
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Side: Todo Checklist */}
        <div className="app-main-content">
          <div className="content-header">
            <h3 className="card-sec-title">Today's Focus List</h3>
            <span className="total-txs-badge">
              {completedCount}/{tasks.length} Completed
            </span>
          </div>

          <div className="planner-analytics-strip">
            <div className="planner-analytics-card">
              <span className="planner-analytics-label">Completion Rate</span>
              <span className="planner-analytics-value">{completionRate}%</span>
            </div>
            <div className="planner-analytics-card">
              <span className="planner-analytics-label">In Progress</span>
              <span className="planner-analytics-value">{inProgressCount}</span>
            </div>
            <div className="planner-analytics-card">
              <span className="planner-analytics-label">Blocked</span>
              <span className="planner-analytics-value danger">{blockedCount}</span>
            </div>
            <div className="planner-analytics-card">
              <span className="planner-analytics-label">Deadline Risk</span>
              <span className="planner-analytics-value">{overdueTasks.length + dueTodayTasks.length}</span>
            </div>
          </div>

          <form onSubmit={handleAddTask} className="add-task-form">
            <div className="task-add-actions">
              <div className="task-add-actions-inputs">
                <input
                  type="text"
                  placeholder="What are you working on next?"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="custom-input task-input"
                  maxLength={80}
                />
                <div className="task-date-palette-wrap" ref={datePaletteRef}>
                  <button
                    type="button"
                    className={`task-date-icon-btn ${newTaskTargetDate ? "has-date" : ""}`}
                    onClick={() => (isDatePaletteOpen ? closeDatePalette() : openDatePalette())}
                    title={newTaskTargetDate ? `Target date: ${formatTargetDate(newTaskTargetDate)}` : "Set target date"}
                    aria-label={newTaskTargetDate ? `Target date set to ${formatTargetDate(newTaskTargetDate)}` : "Set target date"}
                    aria-expanded={isDatePaletteOpen}
                    aria-haspopup="dialog"
                  >
                    <CalendarDays className="w-4 h-4" />
                  </button>

                  {isDatePaletteOpen && (
                    <div className="task-date-palette" role="dialog" aria-label="Choose target date">
                      <div className="task-date-palette-header">
                        <button
                          type="button"
                          className="task-date-nav-btn"
                          onClick={() => setDatePaletteMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
                          aria-label="Previous month"
                        >
                          <span aria-hidden="true">&lt;</span>
                        </button>
                        <span className="task-date-month-label">{monthLabel}</span>
                        <button
                          type="button"
                          className="task-date-nav-btn"
                          onClick={() => setDatePaletteMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
                          aria-label="Next month"
                        >
                          <span aria-hidden="true">&gt;</span>
                        </button>
                      </div>

                      <div className="task-date-weekdays" aria-hidden="true">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>

                      <div className="task-date-grid">
                        {calendarCells.map((cellDate, idx) => {
                          if (!cellDate) {
                            return <span key={`blank-${idx}`} className="task-date-empty-cell" aria-hidden="true" />;
                          }

                          const cellISO = toISODate(cellDate);
                          const isToday = cellISO === todayISO;
                          const isSelected = selectedDate ? toISODate(selectedDate) === cellISO : false;

                          return (
                            <button
                              key={cellISO}
                              type="button"
                              className={`task-date-day-btn ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                              onClick={() => handlePickDate(cellDate)}
                              aria-label={cellDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                            >
                              {cellDate.getDate()}
                            </button>
                          );
                        })}
                      </div>

                      <div className="task-date-palette-actions">
                        <button
                          type="button"
                          className="task-date-action-btn"
                          onClick={() => handlePickDate(todayDate)}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          className="task-date-action-btn"
                          onClick={() => {
                            setNewTaskTargetDate("");
                            closeDatePalette();
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" className="primary-btn">
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {loading ? (
            <div className="app-loader">
              <div className="spinner"></div>
              <p>Loading focus list...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state-view">
              <div className="empty-icon-wrapper">
                <CheckSquare className="w-8 h-8 text-blue-400" />
              </div>
              <h4>No tasks for today</h4>
              <p>Add the core tasks you wish to prioritize during your focus cycles.</p>
            </div>
          ) : (
            <div className="tasks-list">
              {tasks.map((task) => {
                const currentStatus = getTaskStatus(task);
                const statusTone = getStatusTone(currentStatus);
                const isDone = currentStatus === "Done";
                return (
                  <div key={task.id} className={`task-row-card status-${statusTone} ${isDone ? "completed" : ""}`}>
                    <div className="task-row-main">
                      <button
                        type="button"
                        className={`task-status-dot ${statusTone}`}
                        onClick={() => cycleTaskStatus(task.id)}
                        title={`${getStatusLabel(currentStatus)}. Click to cycle status.`}
                        aria-label={`Status ${getStatusLabel(currentStatus)}`}
                      />

                      <>
                        <div className="task-copy-wrap">
                          <span className="task-text" title={task.text}>{task.text}</span>
                          <div className="task-meta-row">
                            {task.targetDate && (
                              <span className={`task-deadline-chip ${isTaskOverdue(task) ? "overdue" : task.targetDate === todayISO ? "today" : "upcoming"}`}>
                                <CalendarDays className="w-3 h-3" />
                                Due {formatTargetDate(task.targetDate)}
                              </span>
                            )}
                            {isTaskOverdue(task) && (
                              <span className="task-overdue-inline">
                                {Math.abs(getDayDiff(task.targetDate || todayISO))}d overdue
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`task-status-tag ${statusTone}`}>{getStatusLabel(currentStatus)}</span>
                      </>
                    </div>

                    <div className="habit-menu-wrap">
                      <button
                        type="button"
                        onClick={() => setOpenTaskMenuId((current) => (current === task.id ? null : task.id))}
                        className="action-icon-btn habit-menu-trigger"
                        title="More actions"
                        aria-label="More actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openTaskMenuId === task.id && (
                        <div className="habit-menu-popover" role="menu" aria-label="Task actions">
                          <button
                            type="button"
                            className="habit-menu-item"
                            onClick={() => startEditTask(task)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit task</span>
                          </button>
                          <button
                            type="button"
                            className="habit-menu-item danger"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete task</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingTaskId && (
        <div className="planner-modal-overlay" onClick={cancelEditTask} role="dialog" aria-modal="true" aria-label="Edit task">
          <div className="planner-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="planner-modal-close" onClick={cancelEditTask} aria-label="Close edit modal">
              <X className="w-4 h-4" />
            </button>
            <h4 className="planner-modal-title">Edit Task</h4>

            <div className="planner-modal-body">
              <label className="planner-field-label">Title</label>
              <input
                type="text"
                value={editingTaskText}
                onChange={(e) => setEditingTaskText(e.target.value)}
                className="custom-input"
                maxLength={80}
                autoFocus
              />
              <div className="planner-modal-grid">
                <div>
                  <label className="planner-field-label">Target Date</label>
                  <input
                    type="date"
                    value={editingTaskTargetDate}
                    onChange={(e) => setEditingTaskTargetDate(e.target.value)}
                    className="custom-input planner-modal-date"
                    aria-label="Edit target date"
                  />
                </div>
                <div>
                  <label className="planner-field-label">Status</label>
                  <select
                    value={editingTaskStatus}
                    onChange={(e) => setEditingTaskStatus(e.target.value as TaskStatus)}
                    className="custom-input custom-select planner-modal-status"
                  >
                    <option value="ToDo">To Do</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Done">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="planner-modal-actions">
              <button type="button" className="action-icon-btn" onClick={cancelEditTask}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => saveEditedTask(editingTaskId)}
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
