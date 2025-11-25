"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "./theme-provider";

type ThemeMode = "auto" | "light" | "dark";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Fetch user settings to get theme preference
    fetch("/api/settings")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.themeMode) {
          setThemeMode(data.themeMode as ThemeMode);
        }
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  // Don't flash wrong theme - wait for settings
  if (!loaded) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ThemeProvider initialThemeMode={themeMode}>
      {children}
    </ThemeProvider>
  );
}
