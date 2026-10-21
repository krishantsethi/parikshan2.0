"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { THEME_COOKIE_NAME as THEME_COOKIE } from "@/lib/cookies";
import type { Theme } from "@/types/domain";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ theme: initialTheme, children }: { theme: Theme; children: ReactNode }) {
  const router = useRouter();
  const [theme, setThemeState] = useState<Theme>(initialTheme === "light" ? "light" : "dark");

  const apply = useCallback(
    (next: Theme) => {
      setThemeState(next);
      document.documentElement.dataset.theme = next;
      document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: apply,
      toggleTheme: () => apply(theme === "dark" ? "light" : "dark"),
    }),
    [theme, apply],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
