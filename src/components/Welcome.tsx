import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { 
  Sparkles, 
  Activity, 
  Wallet, 
  Calendar, 
  FileText, 
  ArrowRight,
  Shield,
  Zap,
  Layers
} from "lucide-react";

interface WelcomeProps {
  onSignInStart: () => void;
  onSignInSuccess: (user: any) => void;
  onSignInError: (error: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ 
  onSignInStart, 
  onSignInSuccess, 
  onSignInError 
}) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    onSignInStart();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onSignInSuccess(result.user);
    } catch (error: any) {
      console.error("Auth error:", error);
      onSignInError(error.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const microAppsFeatures = [
    {
      icon: <Activity className="w-6 h-6 text-purple-400" />,
      title: "Habit Tracker",
      description: "Build consistency. Track daily routines, maintain streaks, and visualize your progress over time.",
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "group-hover:border-purple-500/40",
      tag: "Habits"
    },
    {
      icon: <Wallet className="w-6 h-6 text-emerald-400" />,
      title: "Finance Tracker",
      description: "Manage your wealth. Log expenses, monitor category budgets, and analyze spending patterns.",
      color: "from-emerald-500/20 to-teal-500/20",
      borderColor: "group-hover:border-emerald-500/40",
      tag: "Finance"
    },
    {
      icon: <Calendar className="w-6 h-6 text-blue-400" />,
      title: "Focus Planner",
      description: "Stay in the flow. Combine task checklists with an integrated Pomodoro timer for maximum efficiency.",
      color: "from-blue-500/20 to-indigo-500/20",
      borderColor: "group-hover:border-blue-500/40",
      tag: "Planner"
    },
    {
      icon: <FileText className="w-6 h-6 text-amber-400" />,
      title: "Quick Notes",
      description: "Never lose an idea. A clean scratchpad for capture-on-the-go thoughts, markdown notes, and lists.",
      color: "from-amber-500/20 to-orange-500/20",
      borderColor: "group-hover:border-amber-500/40",
      tag: "Notes"
    }
  ];

  return (
    <div className="welcome-container">
      {/* Background glow decorations */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>
      
      {/* Header / Logo Section */}
      <header className="welcome-header">
        <div className="logo-badge">
          <Layers className="logo-icon text-indigo-400" />
          <span className="logo-text">Stack</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="welcome-hero-section">
        <div className="hero-content">
          <div className="tagline">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Next-Gen Personal Dashboard</span>
          </div>
          <h1 className="hero-title">
            All your productivity <br />
            <span className="gradient-text">micro-apps</span> in one place.
          </h1>
          <p className="hero-subtitle">
            A beautiful, unified command center designed to optimize your habits, finance, time, and notes. Fast, minimal, and fully synced.
          </p>

          <div className="auth-action-area">
            <button 
              className={`google-signin-btn ${loading ? 'loading' : ''}`}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <div className="secure-badge">
              <Shield className="w-3.5 h-3.5" />
              <span>Secured by Firebase Authentication</span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="features-grid">
          {microAppsFeatures.map((app, index) => (
            <div key={index} className="feature-card group">
              <div className={`feature-card-glow bg-gradient-to-br ${app.color}`}></div>
              <div className="feature-card-header">
                <div className="feature-icon-wrapper">
                  {app.icon}
                </div>
                <span className="feature-tag">{app.tag}</span>
              </div>
              <h3 className="feature-card-title">{app.title}</h3>
              <p className="feature-card-desc">{app.description}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="welcome-footer">
        <div className="footer-line"></div>
        <div className="footer-content">
          <p>© 2026 Stack Productivity. All data securely saved in your Firebase backend.</p>
          <div className="footer-links">
            <span className="footer-item"><Zap className="w-3.5 h-3.5 text-indigo-400" /> Fast & Offline-first</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
