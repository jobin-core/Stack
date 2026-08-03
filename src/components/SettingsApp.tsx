import React, { useState } from "react";
import {
  Check,
  User as UserIcon,
  Coins,
  Clock,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import type { WorkspaceSettings } from "./Dashboard";

interface SettingsAppProps {
  userId: string;
  email: string;
  settings: WorkspaceSettings;
  onSave: (updated: WorkspaceSettings) => Promise<void>;
}

export const SettingsApp: React.FC<SettingsAppProps> = ({ settings, onSave, email }) => {
  const theme = "dark";
  const [currency, setCurrency] = useState(settings.currency);
  const [pomodoroFocus, setPomodoroFocus] = useState(settings.pomodoroFocus);
  const [pomodoroBreak, setPomodoroBreak] = useState(settings.pomodoroBreak);
  const [pomodoroLongBreak, setPomodoroLongBreak] = useState((settings as any).pomodoroLongBreak ?? 15);
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        theme,
        currency,
        pomodoroFocus,
        pomodoroBreak,
        pomodoroLongBreak,
        displayName
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="micro-app-container settings-app animate-fade-in" style={{ paddingBottom: "40px" }}>
      <div className="app-header-area">
        <div>
          <h2 className="app-title text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-400">
            Workspace Settings
          </h2>
          <p className="app-subtitle text-slate-400 text-sm">Customize your workspace appearance, preferences, and productivity parameters.</p>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "16px auto 0" }}>
        <form onSubmit={handleSubmit} className="fin-space-y-6">
          
          {/* Card 1: Appearance (Sun / Moon Switch Toggle) */}
          <div className="app-sidebar-card" style={{ width: "100%", padding: "24px" }}>
            <h3 className="card-sec-title fin-mb-4" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sun className="w-5 h-5 text-amber-400" />
              Appearance
            </h3>
            
            <div className="fin-flex fin-justify-between fin-items-center fin-py-2">
              <div>
                <span className="font-bold text-sm block">Theme Mode</span>
                <span className="text-xs text-slate-400">Switch between dark and light aesthetics</span>
              </div>
              
              <div className="theme-toggle-switch-container fin-flex fin-flex-col fin-items-end fin-gap-1">
                <div className="fin-flex fin-items-center fin-gap-2">
                  <span className="theme-toggle-label text-[10px]" style={{ opacity: 0.5 }}>Dark</span>
                  <div 
                    className="theme-slider-track" 
                    style={{ cursor: "not-allowed", opacity: 0.6 }} 
                    title="Light mode is currently disabled"
                  >
                    <Sun className="theme-slider-icon sun" />
                    <Moon className="theme-slider-icon moon" />
                    <div className="theme-slider-thumb" style={{ left: "3px" }} />
                  </div>
                </div>
                <span style={{ fontSize: "10px", color: "var(--color-rose)", fontWeight: 700, marginTop: "4px" }}>
                  Light Mode coming soon!
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: User Profile Details */}
          <div className="app-sidebar-card" style={{ width: "100%", padding: "24px" }}>
            <h3 className="card-sec-title fin-mb-4" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <UserIcon className="w-5 h-5 text-indigo-400" />
              Profile Details
            </h3>

            <div className="fin-space-y-4">
              <div className="fin-space-y-1">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase">Workspace Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="custom-input fin-w-full"
                />
              </div>

              <div className="fin-space-y-1">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase">Account Email</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="custom-input fin-w-full opacity-60 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Localization & Currency */}
          <div className="app-sidebar-card" style={{ width: "100%", padding: "24px" }}>
            <h3 className="card-sec-title fin-mb-4" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Coins className="w-5 h-5 text-green-400" />
              Localization & Finance
            </h3>

            <div className="fin-space-y-4">
              <div className="fin-space-y-1">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase">Base Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="custom-input custom-select fin-w-full"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="JPY">JPY (¥) - Japanese Yen</option>
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                  <option value="AUD">AUD ($) - Australian Dollar</option>
                </select>
                <p className="text-[10px] text-slate-500 fin-mt-1">
                  Applies globally to all currency metrics and calculations across the finance ledger.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Productivity Configurations */}
          <div className="app-sidebar-card" style={{ width: "100%", padding: "24px" }}>
            <h3 className="card-sec-title fin-mb-4" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock className="w-5 h-5 text-indigo-400" />
              Productivity Parameters
            </h3>

            <div className="fin-grid fin-grid-cols-1 sm:fin-grid-cols-2 fin-gap-4">
              <div className="fin-space-y-1">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase">Pomodoro Focus Timer (min)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="180"
                  value={pomodoroFocus}
                  onChange={(e) => setPomodoroFocus(parseInt(e.target.value) || 25)}
                  className="custom-input fin-w-full"
                />
              </div>

              <div className="fin-space-y-1">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase">Pomodoro Break Timer (min)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="60"
                  value={pomodoroBreak}
                  onChange={(e) => setPomodoroBreak(parseInt(e.target.value) || 5)}
                  className="custom-input fin-w-full"
                />
              </div>

              <div className="fin-space-y-1">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase">Pomodoro Long Break Timer (min)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={pomodoroLongBreak}
                  onChange={(e) => setPomodoroLongBreak(parseInt(e.target.value) || 15)}
                  className="custom-input fin-w-full"
                />
              </div>

              {/* Daily habit target removed — unused setting */}
            </div>
          </div>

          {/* Submit Action Area */}
          <div className="fin-flex fin-justify-between fin-items-center fin-pt-4 border-t border-white/5">
            <div>
              {saveSuccess && (
                <span className="text-green-400 text-xs font-semibold animate-fade-in fin-flex fin-items-center fin-gap-1">
                  <Sparkles className="w-4 h-4 animate-bounce" />
                  Workspace saved!
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="primary-btn font-semibold"
              style={{ width: "180px", justifyContent: "center" }}
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
