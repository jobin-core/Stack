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
  CalendarDays
} from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export type TaskStatus = "ToDo" | "InProgress" | "Blocked" | "Done";

interface Task {
  id: string;
  text: string;
  description?: string;
  targetDate?: string;
  completed: boolean;
  status?: TaskStatus;
  createdAt: string;
}

interface PlannerAppProps {
  userId: string;
  globalFocusTime?: number;
  globalBreakTime?: number;
}

export const PlannerApp: React.FC<PlannerAppProps> = ({ userId, globalFocusTime, globalBreakTime }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskTargetDate, setNewTaskTargetDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingTaskDescription, setEditingTaskDescription] = useState("");
  const [editingTaskTargetDate, setEditingTaskTargetDate] = useState("");
  const [editingTaskStatus, setEditingTaskStatus] = useState<TaskStatus>("ToDo");

  // Timer States
  const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const times = {
    focus: (globalFocusTime || 25) * 60,
    shortBreak: (globalBreakTime || 5) * 60,
    longBreak: 15 * 60,
  };

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(times[mode]);
    }
  }, [globalFocusTime, globalBreakTime, mode, isRunning]);

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
      if (event.key === "Escape" && editingTaskId) {
        cancelEditTask();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingTaskId]);

  // Switch timer mode
  const changeMode = (newMode: "focus" | "shortBreak" | "longBreak") => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(times[newMode]);
  };

  // Timer Tick Effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            // Play notification alert
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = "sine";
              oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
              gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.3);
            } catch (e) {
              console.log("Audio alert blocked or unsupported");
            }
            alert(`${mode === "focus" ? "Focus session" : "Break"} is over!`);
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
          if (t.description && t.description.trim()) {
            item.description = t.description.trim();
          }
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
    if (newTaskDescription.trim()) {
      newTask.description = newTaskDescription.trim();
    }
    if (newTaskTargetDate.trim()) {
      newTask.targetDate = newTaskTargetDate.trim();
    }

    const updated = [...tasks, newTask];
    saveTasks(updated);
    setNewTaskText("");
    setNewTaskDescription("");
    setNewTaskTargetDate("");
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
    setEditingTaskDescription(task.description || "");
    setEditingTaskTargetDate(task.targetDate || "");
    setEditingTaskStatus(getTaskStatus(task));
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText("");
    setEditingTaskDescription("");
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
        if (editingTaskDescription.trim()) {
          next.description = editingTaskDescription.trim();
        } else {
          delete next.description;
        }
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
              className={`mode-btn ${mode === "focus" ? "active" : ""}`}
              onClick={() => changeMode("focus")}
            >
              <Clock className="w-4 h-4" />
              <span>Focus (25m)</span>
            </button>
            <button
              className={`mode-btn ${mode === "shortBreak" ? "active" : ""}`}
              onClick={() => changeMode("shortBreak")}
            >
              <Coffee className="w-4 h-4" />
              <span>Short Break (5m)</span>
            </button>
            <button
              className={`mode-btn ${mode === "longBreak" ? "active" : ""}`}
              onClick={() => changeMode("longBreak")}
            >
              <Coffee className="w-4 h-4" />
              <span>Long Break (15m)</span>
            </button>
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
            <button
              className={`control-btn play-pause ${isRunning ? "running" : ""}`}
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Focus</span>
                </>
              )}
            </button>

            <button
              className="control-btn reset"
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(times[mode]);
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
            <div className="task-add-fields">
              <input
                type="text"
                placeholder="What are you working on next?"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className="custom-input task-input"
                maxLength={80}
              />
              <input
                type="text"
                placeholder="Add a short description (optional)"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className="custom-input task-description-input"
                maxLength={160}
              />
            </div>
            <div className="task-add-actions">
              <input
                type="date"
                value={newTaskTargetDate}
                onChange={(e) => setNewTaskTargetDate(e.target.value)}
                className="custom-input task-date-input"
                aria-label="Target date"
              />
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
                          {task.description && <span className="task-description">{task.description}</span>}
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

              <label className="planner-field-label">Description</label>
              <textarea
                value={editingTaskDescription}
                onChange={(e) => setEditingTaskDescription(e.target.value)}
                className="custom-input planner-description-area"
                rows={3}
                maxLength={220}
                placeholder="Add details for this task"
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
