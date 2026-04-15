import * as React from "react";

export type Theme = "dark" | "light" | "midnight" | "forest" | "sunset" | "cyberpunk";
export type Wallpaper = "none" | "aurora" | "particles" | "mesh";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  wallpaper: Wallpaper;
  setWallpaper: (wallpaper: Wallpaper) => void;
  animationsEnabled: boolean;
  toggleAnimations: () => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "dark";
  });

  const [wallpaper, setWallpaperState] = React.useState<Wallpaper>(() => {
    const saved = localStorage.getItem("wallpaper");
    return (saved as Wallpaper) || "none";
  });

  const [animationsEnabled, setAnimationsEnabled] = React.useState<boolean>(() => {
    const saved = localStorage.getItem("animationsEnabled");
    return saved === null ? true : saved === "true";
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "midnight", "forest", "sunset", "cyberpunk");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  React.useEffect(() => {
    localStorage.setItem("wallpaper", wallpaper);
  }, [wallpaper]);

  React.useEffect(() => {
    localStorage.setItem("animationsEnabled", String(animationsEnabled));
  }, [animationsEnabled]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  const setWallpaper = (newWallpaper: Wallpaper) => setWallpaperState(newWallpaper);

  const toggleAnimations = () => {
    setAnimationsEnabled((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      wallpaper, 
      setWallpaper, 
      animationsEnabled, 
      toggleAnimations 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
