"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemeMode = "auto" | "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getTimeBasedTheme(): Theme {
  const hour = new Date().getHours();
  // Dark mode between 7pm (19) and 7am (7)
  return hour >= 19 || hour < 7 ? "dark" : "light";
}

export function ThemeProvider({
  children,
  initialThemeMode = "auto",
}: {
  children: React.ReactNode;
  initialThemeMode?: ThemeMode;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Calculate the actual theme based on mode
    let actualTheme: Theme;
    if (themeMode === "auto") {
      actualTheme = getTimeBasedTheme();
    } else {
      actualTheme = themeMode;
    }
    setTheme(actualTheme);

    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(actualTheme);

    // Set up interval to check time-based theme (every minute)
    if (themeMode === "auto") {
      const interval = setInterval(() => {
        const newTheme = getTimeBasedTheme();
        if (newTheme !== actualTheme) {
          setTheme(newTheme);
          root.classList.remove("light", "dark");
          root.classList.add(newTheme);
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
