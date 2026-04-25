import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light" | "sepia";
export const THEMES: Theme[] = ["dark", "light", "sepia"];

const STORAGE_KEY = "lifehub.theme";

function detectInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light" || saved === "sepia") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(detectInitial);

  // Sync once on mount in case the inline script in index.html and React state disagree.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    // Set the attribute synchronously BEFORE state update so child renders see the new
    // CSS-variable values when they read getComputedStyle at render time.
    document.documentElement.setAttribute("data-theme", t);
    try { window.localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
    setThemeState(t);
  }, []);

  return { theme, setTheme };
}

export const ThemeContext = createContext<Theme>("dark");

/** Hook for chart components to read the current theme without prop-drilling. */
export function useThemeFromContext(): Theme {
  return useContext(ThemeContext);
}

type ColorToken =
  | "ink-950" | "ink-900" | "ink-800" | "ink-700"
  | "slate-100" | "slate-200" | "slate-300" | "slate-400" | "slate-500"
  | "cyan-100" | "cyan-200" | "cyan-300" | "cyan-400" | "cyan-500";

/** Read a theme color from CSS variables — used for inline styles in recharts etc. */
export function themeColor(name: ColorToken): string {
  if (typeof window === "undefined") return "rgb(0,0,0)";
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
  return v ? `rgb(${v})` : "rgb(0,0,0)";
}

/** Re-read theme colors at render time. Pass in `theme` so it recomputes on change. */
export function useThemeColors(theme: Theme): Record<ColorToken, string> {
  return useMemo(() => {
    const tokens: ColorToken[] = [
      "ink-950", "ink-900", "ink-800", "ink-700",
      "slate-100", "slate-200", "slate-300", "slate-400", "slate-500",
      "cyan-100", "cyan-200", "cyan-300", "cyan-400", "cyan-500",
    ];
    const out = {} as Record<ColorToken, string>;
    for (const t of tokens) out[t] = themeColor(t);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
