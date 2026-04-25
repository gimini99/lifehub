import type { Theme } from "../lib/useTheme";
import { THEMES } from "../lib/useTheme";

interface Props {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const LABELS: Record<Theme, string> = {
  dark: "Dark",
  light: "Light",
  sepia: "Sepia",
};

const ICONS: Record<Theme, string> = {
  dark: "◐",
  light: "○",
  sepia: "◉",
};

export function ThemeToggle({ theme, setTheme }: Props) {
  return (
    <div className="inline-flex rounded-md border border-ink-700 bg-ink-800/40 p-0.5 text-xs">
      {THEMES.map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={[
            "px-2 py-1 rounded transition flex items-center gap-1",
            theme === t
              ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/30"
              : "text-slate-400 hover:text-slate-200",
          ].join(" ")}
          aria-pressed={theme === t}
          title={LABELS[t]}
        >
          <span aria-hidden>{ICONS[t]}</span>
          <span className="hidden sm:inline">{LABELS[t]}</span>
        </button>
      ))}
    </div>
  );
}
