/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Minimal Slate palette — near-monochrome, color used sparingly
        "primary": "#475569",
        "primary-hover": "#334155",
        "primary-container": "#64748b",
        "on-primary": "#ffffff",
        "primary-fixed": "#e2e8f0",
        "primary-fixed-dim": "#cbd5e1",
        "on-primary-fixed": "#1e293b",
        "on-primary-fixed-variant": "#334155",

        "secondary": "#475569",
        "secondary-container": "#f1f5f9",
        "on-secondary": "#ffffff",
        "secondary-fixed": "#e2e8f0",
        "secondary-fixed-dim": "#cbd5e1",
        "on-secondary-fixed": "#0f172a",
        "on-secondary-fixed-variant": "#334155",
        "on-secondary-container": "#334155",

        "tertiary": "#d97706",
        "tertiary-container": "#f59e0b",
        "on-tertiary": "#ffffff",
        "tertiary-fixed": "#fef3c7",
        "tertiary-fixed-dim": "#fde68a",
        "on-tertiary-fixed": "#78350f",
        "on-tertiary-container": "#92400e",
        "on-tertiary-fixed-variant": "#b45309",

        "background": "#f8fafc",
        "surface": "#ffffff",
        "surface-bright": "#ffffff",
        "surface-dim": "#f1f5f9",
        "surface-variant": "#f1f5f9",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f8fafc",
        "surface-container": "#f1f5f9",
        "surface-container-high": "#e2e8f0",
        "surface-container-highest": "#cbd5e1",
        "surface-tint": "#475569",

        "on-background": "#0f172a",
        "on-surface": "#0f172a",
        "on-surface-variant": "#64748b",
        "inverse-surface": "#0f172a",
        "inverse-on-surface": "#f8fafc",
        "inverse-primary": "#93c5fd",

        "outline": "#94a3b8",
        "outline-variant": "#e2e8f0",

        "error": "#ef4444",
        "error-container": "#fee2e2",
        "on-error": "#ffffff",
        "on-error-container": "#991b1b",

        "success": "#10b981",
        "success-container": "#d1fae5",
        "on-success": "#ffffff"
      },
      fontFamily: {
        "headline": ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
        "display": ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
        "body": ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
        "label": ["'Plus Jakarta Sans'", "'Public Sans'", "sans-serif"]
      },
      boxShadow: {
        "subtle": "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card": "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "card-hover": "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
        "elevated": "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)"
      }
    },
  },
  plugins: [],
};
