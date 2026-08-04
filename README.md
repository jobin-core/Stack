<div align="center">
  <h1>⚡ Stack — Personal Productivity Workspace</h1>

  **The modern, all-in-one personal operating system built for focus, financial clarity, and daily momentum.**

  [![Live Demo](https://img.shields.io/badge/Live%20Demo-https%3A%2F%2Fstack.jobinjose.in-6366F1?style=for-the-badge&logo=firebase&logoColor=white)](https://stack.jobinjose.in)
  [![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Firebase](https://img.shields.io/badge/Firebase-11.2-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![PWA Ready](https://img.shields.io/badge/PWA-Supported-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](#-progressive-web-app-pwa)

</div>

---

## 🌟 Overview

**Stack** is a unified, high-performance personal productivity application that consolidates **Habits**, **Finances**, **Focus Planning**, and **Quick Notes** into a single, distraction-free environment. Designed with an ultra-premium dark-mode glassmorphic aesthetic, Stack replaces fragmented single-purpose tools with an integrated dashboard tuned for calm, continuous momentum.

---

## 🚀 Core Micro-Apps

Stack includes five tightly integrated micro-applications accessible seamlessly from a central sidebar:

### 1. ⚡ Command Center
* **Workspace Pulse**: Real-time overview narrative summarizing daily habit rates, pending priorities, and cashflow stats.
* **Momentum Snapshot**: Quick metric cards providing at-a-glance insights into your daily goal completion progress.

### 2. 🔥 Habit Tracker
* **Consistency Monitoring**: Track daily habits with visual streak indicators and completion rate progress rings.
* **Custom Daily Targets**: Define custom daily habit targets and view featured habits with top streak milestones.

### 3. ⏱️ Focus Planner
* **Priority Task Boards**: Organize tasks by status with clean category tags and target dates.
* **Pomodoro Engine**: Integrated Pomodoro focus timer with customizable focus and break intervals that persist continuously across workspace navigation.

### 4. 💵 Finance Tracker
* **Multi-Wallet Accounts**: Manage Bank Accounts, Physical Cash, Credit Cards, and Investments with automatic balance calculations.
* **Cashflow Ledger**: Categorize income and expenses, track net worth contribution, and run automated recurring scheduled payments.

### 5. 🗸 Quick Notes & Settings
* **Instant Scratchpad**: Capture thoughts, links, and code snippets with automatic cloud persistence.
* **Workspace Customization**: Configure themes, currency symbols, Pomodoro durations, and account preferences.

---

## 🎨 Design System & Aesthetics

* **Glassmorphism & Micro-Animations**: Built with harmonious HSL color palettes, subtle radial lighting highlights, and smooth spring hover transitions.
* **Custom 3D Icon Suite**: Features a custom-designed 3D isometric squircle brand logo and multi-layered SVG micro-app icons (Flame, Stopwatch, Banknote, Checkbox Card, AI Sparkles).
* **Responsive Layouts**: Designed for fluid experiences on desktop screens, tablets, and mobile devices.

---

## 📱 Progressive Web App (PWA)

Stack is fully PWA-enabled with a custom service worker (`sw.js`) and manifest (`manifest.json`):
* **Installable**: Install Stack directly onto macOS, iOS, Android, and Windows home screens.
* **Offline Capabilities**: Caches core shell assets for instant launch without network latency.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool & Bundler** | [Vite 6](https://vitejs.dev/) |
| **Styling & Icons** | Vanilla CSS Tokens + [Lucide React](https://lucide.dev/) |
| **Database & Cloud Storage** | [Cloud Firestore](https://firebase.google.com/docs/firestore) |
| **Authentication** | [Firebase Auth](https://firebase.google.com/docs/auth) (Google Sign-In & Email) |
| **Hosting & CI/CD** | [Firebase Hosting](https://firebase.google.com/docs/hosting) |

---

## ⚡ Quickstart & Local Setup

Follow these steps to run Stack locally on your machine:

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0 or higher recommended)
* `npm` or `yarn`

### 1. Clone the Repository
```bash
git clone https://github.com/jobin-core/Stack.git
cd Stack
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your Firebase project credentials in `.env`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Production Build & Deployment
```bash
# Build production bundle
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

### 6. GitHub Actions CD to Firebase Hosting

This repo includes a production deploy workflow at `/Users/jobin/Home/Dev/stack/.github/workflows/firebase-hosting-deploy.yml`.

- Deploy trigger: push to the `master` branch
- Manual trigger: GitHub Actions `workflow_dispatch`
- Hosting target: Firebase Hosting `live` channel for project `stack-6a17c`

Add these GitHub repository secrets before using the workflow:

```text
FIREBASE_SERVICE_ACCOUNT_STACK_6A17C
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

To create `FIREBASE_SERVICE_ACCOUNT_STACK_6A17C`:

1. Open Firebase Console → Project Settings → Service Accounts
2. Generate a new private key for the `stack-6a17c` project
3. Copy the full JSON into the GitHub secret named `FIREBASE_SERVICE_ACCOUNT_STACK_6A17C`

---

## 🔒 Security & Privacy

* **Zero Hardcoded Secrets**: All environment keys are isolated in `.env` and loaded via Vite `import.meta.env`.
* **Firestore Security Rules**: Database rules enforce user-level document isolation (`user/{userId}/productivity/*`).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ by Jobin — Tuned for personal momentum and visual excellence.</sub>
</div>
