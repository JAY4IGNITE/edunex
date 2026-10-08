import { useEffect, useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";
const key = "edunex-theme";
const parse = (value: string | null): Theme | null =>
  value === "light" || value === "dark" ? value : null;

export function useTheme() {
  const [preference, setPreference] = useState<Theme | null>(() => {
    try { return parse(localStorage.getItem(key)); } catch { return null; }
  });
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const theme = preference ?? (systemDark ? "dark" : "light");

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content", getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    );
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const systemChanged = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    const storedChanged = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setPreference(parse(event.newValue));
    };
    media.addEventListener("change", systemChanged);
    window.addEventListener("storage", storedChanged);
    return () => {
      media.removeEventListener("change", systemChanged);
      window.removeEventListener("storage", storedChanged);
    };
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setPreference(next);
    try { localStorage.setItem(key, next); } catch { /* In-memory choice still works. */ }
  }
  return { theme, toggleTheme };
}
