/**
 * ChanceUS design tokens — Kalshi (markets clarity), Linear (precision), Stripe (typography & elevation).
 * Source of truth for documentation and programmatic use. CSS variables live in chance-design-tokens.css.
 */

export const chanceBrand = {
  name: "ChanceUS",
  personality: "Confident fintech-meets-competitive gaming: crisp, trustworthy, fast.",
} as const

export const chanceColors = {
  light: {
    background: "#f7f7f5",
    foreground: "#0a0a0a",
    surface: "#ffffff",
    surfaceRaised: "#ffffff",
    surfaceInset: "#f0f0ec",
    border: "#e8e8e3",
    borderStrong: "#d4d4cf",
    muted: "#f0f0ec",
    mutedForeground: "#6b6b66",
    primary: "#0a0a0a",
    primaryForeground: "#fafafa",
    brand: "#00a862",
    brandHover: "#009956",
    brandMuted: "#e6f7ef",
    brandForeground: "#052e16",
    destructive: "#dc2626",
    destructiveForeground: "#ffffff",
    warning: "#d97706",
    warningMuted: "#fef3c7",
    success: "#00a862",
    successMuted: "#e6f7ef",
    info: "#2563eb",
    infoMuted: "#dbeafe",
    marketYes: "#00a862",
    marketYesMuted: "#e6f7ef",
    marketNo: "#e5484d",
    marketNoMuted: "#ffeef0",
    ring: "#0a0a0a",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#f5f5f2",
    surface: "#141414",
    surfaceRaised: "#1a1a1a",
    surfaceInset: "#0f0f0f",
    border: "#2a2a2a",
    borderStrong: "#3f3f3f",
    muted: "#1a1a1a",
    mutedForeground: "#a1a1a1",
    primary: "#f5f5f2",
    primaryForeground: "#0a0a0a",
    brand: "#00d26a",
    brandHover: "#00e676",
    brandMuted: "#0d2a1a",
    brandForeground: "#ecfdf5",
    destructive: "#f87171",
    destructiveForeground: "#1c1917",
    warning: "#fbbf24",
    warningMuted: "#422006",
    success: "#00d26a",
    successMuted: "#0d2a1a",
    info: "#60a5fa",
    infoMuted: "#172554",
    marketYes: "#00d26a",
    marketYesMuted: "#0d2a1a",
    marketNo: "#ff6369",
    marketNoMuted: "#3b1214",
    ring: "#f5f5f2",
  },
} as const

export const chanceTypography = {
  fontSans: "var(--font-sans)",
  fontMono: "var(--font-mono)",
  display: { size: "2.5rem", lineHeight: "2.75rem", letterSpacing: "-0.025em", weight: 600 },
  h1: { size: "1.875rem", lineHeight: "2.25rem", letterSpacing: "-0.02em", weight: 600 },
  h2: { size: "1.5rem", lineHeight: "2rem", letterSpacing: "-0.015em", weight: 600 },
  h3: { size: "1.125rem", lineHeight: "1.75rem", letterSpacing: "-0.01em", weight: 600 },
  h4: { size: "1rem", lineHeight: "1.5rem", letterSpacing: "0", weight: 500 },
  bodyLg: { size: "1rem", lineHeight: "1.5rem", letterSpacing: "0", weight: 400 },
  body: { size: "0.875rem", lineHeight: "1.25rem", letterSpacing: "0", weight: 400 },
  caption: { size: "0.75rem", lineHeight: "1rem", letterSpacing: "0", weight: 400 },
  label: { size: "0.6875rem", lineHeight: "1rem", letterSpacing: "0.06em", weight: 500 },
  mono: { size: "0.8125rem", lineHeight: "1.25rem", letterSpacing: "0", weight: 500 },
} as const

export const chanceSpacing = {
  0: "0",
  px: "1px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  pageX: "1.5rem",
  pageXWide: "2rem",
  sectionY: "2rem",
  stackSm: "0.75rem",
  stackMd: "1rem",
  stackLg: "1.5rem",
} as const

export const chanceRadius = {
  none: "0",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
} as const

export const chanceShadows = {
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)",
  focus: "0 0 0 3px rgb(10 10 10 / 0.12)",
  focusBrand: "0 0 0 3px rgb(0 168 98 / 0.25)",
} as const

export const chanceMotion = {
  durationInstant: "100ms",
  durationFast: "150ms",
  durationNormal: "200ms",
  durationSlow: "300ms",
  easeDefault: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const

export const chanceLayout = {
  maxWidthContent: "42rem",
  maxWidthApp: "72rem",
  maxWidthWide: "90rem",
  headerHeight: "3.5rem",
  sidebarWidth: "15rem",
} as const
