/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        gray: {
          50: "var(--g-50)",
          100: "var(--g-100)",
          200: "var(--g-200)",
          300: "var(--g-300)",
          400: "var(--g-400)",
          500: "var(--g-500)",
          600: "var(--g-600)",
          700: "var(--g-700)",
          800: "var(--g-800)",
          900: "var(--g-900)",
          950: "var(--g-950)",
        },
        chance: {
          bg: "var(--chance-bg)",
          fg: "var(--chance-fg)",
          surface: "var(--chance-surface)",
          "surface-raised": "var(--chance-surface-raised)",
          "surface-inset": "var(--chance-surface-inset)",
          border: "var(--chance-border)",
          "border-strong": "var(--chance-border-strong)",
          muted: "var(--chance-muted)",
          "muted-fg": "var(--chance-muted-fg)",
          brand: "var(--chance-brand)",
          "brand-hover": "var(--chance-brand-hover)",
          "brand-muted": "var(--chance-brand-muted)",
          "brand-fg": "var(--chance-brand-fg)",
          yes: "var(--chance-yes)",
          "yes-muted": "var(--chance-yes-muted)",
          no: "var(--chance-no)",
          "no-muted": "var(--chance-no-muted)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        chance: {
          sm: "var(--chance-radius-sm)",
          md: "var(--chance-radius-md)",
          lg: "var(--chance-radius-lg)",
          xl: "var(--chance-radius-xl)",
          "2xl": "var(--chance-radius-2xl)",
        },
      },
      boxShadow: {
        "chance-xs": "var(--chance-shadow-xs)",
        "chance-sm": "var(--chance-shadow-sm)",
        "chance-md": "var(--chance-shadow-md)",
        "chance-lg": "var(--chance-shadow-lg)",
        "chance-xl": "var(--chance-shadow-xl)",
        "chance-focus": "var(--chance-shadow-focus)",
        "chance-focus-brand": "var(--chance-shadow-focus-brand)",
      },
      maxWidth: {
        "chance-content": "var(--chance-max-content)",
        "chance-app": "var(--chance-max-app)",
        "chance-wide": "var(--chance-max-wide)",
      },
      transitionDuration: {
        "chance-instant": "var(--chance-duration-instant)",
        "chance-fast": "var(--chance-duration-fast)",
        "chance-normal": "var(--chance-duration-normal)",
        "chance-slow": "var(--chance-duration-slow)",
      },
      transitionTimingFunction: {
        chance: "var(--chance-ease)",
        "chance-out": "var(--chance-ease-out)",
        "chance-spring": "var(--chance-ease-spring)",
      },
      keyframes: {
        "chance-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "chance-slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "chance-scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "chance-pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        "chance-in": "chance-fade-in var(--chance-duration-normal) var(--chance-ease-out) both",
        "chance-slide-up": "chance-slide-up var(--chance-duration-normal) var(--chance-ease-out) both",
        "chance-scale-in": "chance-scale-in var(--chance-duration-fast) var(--chance-ease-spring) both",
        "chance-pulse-dot": "chance-pulse-dot 1.4s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
}
