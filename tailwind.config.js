/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Theme-aware palette. Actual RGB values live in src/index.css under
        // :root[data-theme="..."] blocks and are switched at runtime.
        ink: {
          950: "rgb(var(--c-ink-950) / <alpha-value>)",
          900: "rgb(var(--c-ink-900) / <alpha-value>)",
          800: "rgb(var(--c-ink-800) / <alpha-value>)",
          700: "rgb(var(--c-ink-700) / <alpha-value>)",
        },
        slate: {
          100: "rgb(var(--c-slate-100) / <alpha-value>)",
          200: "rgb(var(--c-slate-200) / <alpha-value>)",
          300: "rgb(var(--c-slate-300) / <alpha-value>)",
          400: "rgb(var(--c-slate-400) / <alpha-value>)",
          500: "rgb(var(--c-slate-500) / <alpha-value>)",
        },
        cyan: {
          100: "rgb(var(--c-cyan-100) / <alpha-value>)",
          200: "rgb(var(--c-cyan-200) / <alpha-value>)",
          300: "rgb(var(--c-cyan-300) / <alpha-value>)",
          400: "rgb(var(--c-cyan-400) / <alpha-value>)",
          500: "rgb(var(--c-cyan-500) / <alpha-value>)",
        },
        // Status colors — keep as constants; visually fine across themes.
        emerald: {
          300: "#6ee7b7",
          400: "#34d399",
        },
        rose: {
          300: "#fda4af",
          400: "#fb7185",
        },
        amber: {
          300: "#fcd34d",
        },
      },
    },
  },
  plugins: [],
};
