import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { DARK_THEME, LIGHT_THEME } from "@/constants/colors";

const THEME_KEY = "heladeria_theme";

const storage = {
  getItem: async (key) => {
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        return SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.warn("No se pudo leer el tema almacenado", error?.message);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key, value) => {
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch (error) {
      console.warn("No se pudo guardar el tema", error?.message);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
};

const ThemeContext = createContext(null);

const themes = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restoreTheme = async () => {
      const stored = await storage.getItem(THEME_KEY);
      if (stored && (stored === "light" || stored === "dark")) {
        setTheme(stored);
      }
      setHydrated(true);
    };

    restoreTheme();
  }, []);

  const persistTheme = async (nextTheme) => {
    setTheme(nextTheme);
    await storage.setItem(THEME_KEY, nextTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    persistTheme(nextTheme);
  };

  const value = useMemo(() => {
    const colors = themes[theme] || LIGHT_THEME;
    return {
      theme,
      colors,
      setTheme: persistTheme,
      toggleTheme,
      hydrated,
    };
  }, [theme, hydrated]);

  return <ThemeContext.Provider value={value}>{hydrated ? children : null}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
};

