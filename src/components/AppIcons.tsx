import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// Main Stack Logo (3D 3-Layer Stack matching brochure.png)
export const StackLogo: React.FC<IconProps> = ({ size = 32, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      {/* Top Plate Gradients */}
      <linearGradient id="purple-top" x1="120" y1="100" x2="390" y2="250" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="45%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#4C1D95" />
      </linearGradient>
      <linearGradient id="purple-side" x1="120" y1="180" x2="390" y2="270" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#5B21B6" />
        <stop offset="100%" stopColor="#2E1065" />
      </linearGradient>

      {/* Middle Plate Gradients */}
      <linearGradient id="emerald-top" x1="120" y1="190" x2="390" y2="340" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="45%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#064E3B" />
      </linearGradient>
      <linearGradient id="emerald-side" x1="120" y1="270" x2="390" y2="360" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#047857" />
        <stop offset="100%" stopColor="#022C22" />
      </linearGradient>

      {/* Bottom Plate Gradients */}
      <linearGradient id="amber-top" x1="120" y1="280" x2="390" y2="430" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="45%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="amber-side" x1="120" y1="360" x2="390" y2="450" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#B45309" />
        <stop offset="100%" stopColor="#451A03" />
      </linearGradient>

      {/* Specular Rim Light */}
      <linearGradient id="rim-light" x1="100" y1="100" x2="400" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
        <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      {/* Soft Drop Shadows */}
      <filter id="plate-shadow" x="50" y="50" width="412" height="420" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#000000" floodOpacity="0.6" />
      </filter>
    </defs>

    {/* ===== BOTTOM LAYER (AMBER) ===== */}
    <g filter="url(#plate-shadow)">
      {/* 3D Side Rim */}
      <path
        d="M 108 364 Q 96 350 116 338 L 232 282 Q 256 270 280 282 L 396 338 Q 416 350 404 364 L 280 420 Q 256 430 232 420 Z"
        transform="translate(0, 22)"
        fill="url(#amber-side)"
      />
      {/* Top Surface */}
      <path
        d="M 232 282 Q 256 270 280 282 L 396 338 Q 416 350 404 364 L 280 420 Q 256 430 232 420 L 108 364 Q 96 350 116 338 Z"
        fill="url(#amber-top)"
      />
      {/* Highlight Rim */}
      <path
        d="M 116 338 L 232 282 Q 256 270 280 282 L 396 338"
        stroke="url(#rim-light)"
        strokeWidth="2"
        fill="none"
      />
    </g>

    {/* ===== MIDDLE LAYER (EMERALD) ===== */}
    <g filter="url(#plate-shadow)">
      {/* 3D Side Rim */}
      <path
        d="M 108 274 Q 96 260 116 248 L 232 192 Q 256 180 280 192 L 396 248 Q 416 260 404 274 L 280 330 Q 256 340 232 330 Z"
        transform="translate(0, 22)"
        fill="url(#emerald-side)"
      />
      {/* Top Surface */}
      <path
        d="M 232 192 Q 256 180 280 192 L 396 248 Q 416 260 404 274 L 280 330 Q 256 340 232 330 L 108 274 Q 96 260 116 248 Z"
        fill="url(#emerald-top)"
      />
      {/* Highlight Rim */}
      <path
        d="M 116 248 L 232 192 Q 256 180 280 192 L 396 248"
        stroke="url(#rim-light)"
        strokeWidth="2"
        fill="none"
      />
    </g>

    {/* ===== TOP LAYER (PURPLE) ===== */}
    <g filter="url(#plate-shadow)">
      {/* 3D Side Rim */}
      <path
        d="M 108 184 Q 96 170 116 158 L 232 102 Q 256 90 280 102 L 396 158 Q 416 170 404 184 L 280 240 Q 256 250 232 240 Z"
        transform="translate(0, 22)"
        fill="url(#purple-side)"
      />
      {/* Top Surface */}
      <path
        d="M 232 102 Q 256 90 280 102 L 396 158 Q 416 170 404 184 L 280 240 Q 256 250 232 240 L 108 184 Q 96 170 116 158 Z"
        fill="url(#purple-top)"
      />
      {/* Highlight Rim */}
      <path
        d="M 116 158 L 232 102 Q 256 90 280 102 L 396 158"
        stroke="url(#rim-light)"
        strokeWidth="2.5"
        fill="none"
      />
    </g>
  </svg>
);

// Command Center Icon (Gemini / AI Assistant Sparkles Motif - Bold & Scaled)
export const CommandCenterIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="ai-sparkle-grad" x1="2" y1="1" x2="22" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#818CF8" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
    </defs>
    {/* Primary Central AI Spark */}
    <path
      d="M 12 1 C 12 7.5 14.5 10 21 10 C 14.5 10 12 12.5 12 19 C 12 12.5 9.5 10 3 10 C 9.5 10 12 7.5 12 1 Z"
      fill="url(#ai-sparkle-grad)"
    />
    {/* Top-Right Secondary Spark */}
    <path
      d="M 19.5 1 C 19.5 3.2 20.2 3.9 22.4 3.9 C 20.2 3.9 19.5 4.6 19.5 6.8 C 19.5 4.6 18.8 3.9 16.6 3.9 C 18.8 3.9 19.5 3.2 19.5 1 Z"
      fill="url(#ai-sparkle-grad)"
      opacity="0.9"
    />
    {/* Bottom-Left Accent Spark */}
    <path
      d="M 4.5 16.5 C 4.5 18.2 5.1 18.8 6.8 18.8 C 5.1 18.8 4.5 19.4 4.5 21.1 C 4.5 19.4 3.9 18.8 2.2 18.8 C 3.9 18.8 4.5 18.2 4.5 16.5 Z"
      fill="url(#ai-sparkle-grad)"
      opacity="0.8"
    />
  </svg>
);

// Finance Tracker Icon (Wallet / Cashflow - Banknote Bill with Emerald Gradient & Glow)
export const FinanceTrackerIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="finance-emerald-grad" x1="2" y1="6" x2="22" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="finance-glow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#10B981" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#finance-glow)">
      <rect x="2.5" y="6.5" width="19" height="11" rx="2.5" fill="#064E3B" fillOpacity="0.3" stroke="url(#finance-emerald-grad)" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="url(#finance-emerald-grad)" strokeWidth="1.8" fill="#047857" fillOpacity="0.4" />
      <path d="M 12 10.3 C 11.3 10.3 10.9 10.7 10.9 11.2 C 10.9 12.1 13.1 11.7 13.1 12.6 C 13.1 13.1 12.7 13.6 12 13.6 M 12 9.6 L 12 14.3" stroke="#A7F3D0" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5.5" cy="12" r="0.85" fill="#34D399" />
      <circle cx="18.5" cy="12" r="0.85" fill="#34D399" />
    </g>
  </svg>
);

// Focus Planner Icon (Timer / Clock - Stopwatch with Blue Gradient & Glow)
export const FocusPlannerIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="focus-blue-grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
      <filter id="focus-glow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#3B82F6" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#focus-glow)">
      <path d="M 9.5 2.5 L 14.5 2.5 M 12 2.5 L 12 5.5" stroke="url(#focus-blue-grad)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="13.5" r="8" stroke="url(#focus-blue-grad)" strokeWidth="2.2" fill="#1E3A8A" fillOpacity="0.25" />
      <polyline points="12 9.5 12 13.5 14.5 15" stroke="#93C5FD" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="11.5" r="1.2" fill="#60A5FA" />
    </g>
  </svg>
);

// Habits Tracker Icon (Ultra-Premium Flame / Streak with Organic Curves & Luminous Shading)
export const HabitsTrackerIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      {/* Outer Main Flame 4-Stop Gradient */}
      <linearGradient id="flame-outer-master" x1="12" y1="1.5" x2="12" y2="22.5" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE600" />
        <stop offset="30%" stopColor="#FF7A00" />
        <stop offset="70%" stopColor="#E63946" />
        <stop offset="100%" stopColor="#9B0000" />
      </linearGradient>

      {/* Inner Luminous Core Radial Gradient */}
      <radialGradient id="flame-core-master" cx="12" cy="16" r="6" fx="12" fy="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="35%" stopColor="#FFF3B0" />
        <stop offset="75%" stopColor="#FFB703" />
        <stop offset="100%" stopColor="#FB8500" />
      </radialGradient>

      {/* Ambient Fire Aura Glow */}
      <filter id="flame-aura-glow" x="-30%" y="-30%" width="160%" height="160%" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feComponentTransfer in="blur" result="glow">
          <feFuncA type="linear" slope="0.6" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <g filter="url(#flame-aura-glow)">
      {/* Outer Flame Silhouette */}
      <path
        d="M 12 1.8 C 11.7 2.2 11.1 3.5 10.6 4.6 C 9.8 6.3 8.8 7.8 7.6 9.2 C 6.5 10.5 5.5 12.1 5.5 13.8 C 5.5 17.6 8.3 21 12.5 21.2 C 16.8 21.4 20.2 18 20.2 13.8 C 20.2 9.8 17.3 6.6 14.4 3.8 C 13.8 3.2 13.2 2.6 13.2 4.2 C 13.2 5.8 12.4 7.2 11.4 8 C 11.5 5.8 12.2 3.5 12 1.8 Z"
        fill="url(#flame-outer-master)"
      />

      {/* Left Tongue Secondary Accent Overlay */}
      <path
        d="M 9.2 9.8 C 7.8 11.4 7.2 13 7.2 14.6 C 7.2 17.2 9 19.2 11.8 19.8 C 9.5 19 8.2 17 8.2 15 C 8.2 13.2 9 11.5 10 10.2 Z"
        fill="#FFD166"
        opacity="0.75"
      />

      {/* Inner Luminous Core Flame */}
      <path
        d="M 12.2 10.8 C 11.4 12.2 10.2 13.6 10.2 15.2 C 10.2 17.5 11.6 19.2 13.2 19.2 C 15.2 19.2 16.8 17.5 16.8 15.2 C 16.8 13.2 14.8 12 13.4 10.5 C 12.9 11.3 12.5 11.3 12.2 10.8 Z"
        fill="url(#flame-core-master)"
      />
    </g>
  </svg>
);

// Quick Notes Icon (Scratchpad / Checkbox - Card with Rose Pink Gradient & Glow)
export const QuickNotesIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="notes-rose-grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FB7185" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
      <filter id="notes-glow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#F43F5E" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#notes-glow)">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="#881337" fillOpacity="0.3" stroke="url(#notes-rose-grad)" strokeWidth="2.2" strokeLinejoin="round" />
      <path
        d="M 8.5 11.5 L 11.5 14.5 L 18 7.5"
        stroke="#FECDD3"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

// Settings Nav Icon (Colored Settings Gear with Purple Gradient & Glow)
export const SettingsNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="settings-purple-grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C084FC" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
      <filter id="settings-glow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#8B5CF6" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#settings-glow)">
      <path
        d="M 12.22 2 C 11.83 2 11.47 2.27 11.38 2.66 L 10.97 4.38 C 10.23 4.69 9.55 5.09 8.94 5.57 L 7.24 4.97 C 6.87 4.84 6.45 5 6.27 5.34 L 4.38 8.61 C 4.19 8.95 4.27 9.38 4.57 9.62 L 5.95 10.74 C 5.89 11.16 5.85 11.57 5.85 12 C 5.85 12.43 5.89 12.84 5.95 13.26 L 4.57 14.38 C 4.27 14.62 4.19 15.05 4.38 15.39 L 6.27 18.66 C 6.45 19 6.87 19.16 7.24 19.03 L 8.94 18.43 C 9.55 18.91 10.23 19.31 10.97 19.62 L 11.38 21.34 C 11.47 21.73 11.83 22 12.22 22 L 16.03 22 C 16.42 22 16.78 21.73 16.87 21.34 L 17.28 19.62 C 18.02 19.31 18.7 18.91 19.31 18.43 L 21.01 19.03 C 21.38 19.16 21.8 19 21.98 18.66 L 23.87 15.39 C 24.06 15.05 23.98 14.62 23.68 14.38 L 22.3 13.26 C 22.36 12.84 22.4 12.43 22.4 12 C 22.4 11.57 22.36 11.16 22.3 10.74 L 23.68 9.62 C 23.98 9.38 24.06 8.95 23.87 8.61 L 21.98 5.34 C 21.8 5 21.38 4.84 21.01 4.97 L 19.31 5.57 C 18.7 5.09 18.02 4.69 17.28 4.38 L 16.87 2.66 C 16.78 2.27 16.42 2 16.03 2 Z"
        fill="url(#settings-purple-grad)"
      />
      <circle cx="14.12" cy="12" r="3.2" fill="#DDD6FE" />
    </g>
  </svg>
);
