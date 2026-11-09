import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";
export type AccentMode = "default" | "custom";

export const DEFAULT_ACCENT_HEX = "#7c3aed";

export function hexToHsl(hex: string) {
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const r = parseInt(cleaned.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255 || 0;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Perceived luminance (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const isLight = brightness > 0.62;

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    isLight,
    hslString: `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`,
  };
}

interface PreferencesState {
  theme: ThemeMode;
  accentMode: AccentMode;
  customColor: string;
  pinnedSubjects: string[];
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  disableSwapPopups: boolean;
  setTheme: (theme: ThemeMode) => void;
  setAccentMode: (mode: AccentMode) => void;
  setCustomColor: (hex: string) => void;
  togglePinSubject: (subject: string) => void;
  unpinAllSubjects: () => void;
  isPinned: (subject: string) => boolean;
  toggleHaptics: () => void;
  setHapticsEnabled: (enabled: boolean) => void;
  toggleSounds: () => void;
  setSoundsEnabled: (enabled: boolean) => void;
  toggleDisableSwapPopups: () => void;
  setDisableSwapPopups: (disabled: boolean) => void;
  resetPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      theme: "system",
      accentMode: "default",
      customColor: DEFAULT_ACCENT_HEX,
      pinnedSubjects: [],
      hapticsEnabled: true,
      soundsEnabled: false,
      disableSwapPopups: false,

      setTheme: (theme: ThemeMode) => {
        set({ theme });
        applyTheme(theme);
        const { accentMode, customColor } = get();
        applyAccentColor(accentMode, customColor);
      },

      setAccentMode: (accentMode: AccentMode) => {
        set({ accentMode });
        applyAccentColor(accentMode, get().customColor);
      },

      setCustomColor: (customColor: string) => {
        set({ customColor, accentMode: "custom" });
        applyAccentColor("custom", customColor);
      },

      togglePinSubject: (subject: string) => {
        const { pinnedSubjects } = get();
        if (pinnedSubjects.includes(subject)) {
          set({ pinnedSubjects: pinnedSubjects.filter((s) => s !== subject) });
        } else {
          set({ pinnedSubjects: [...pinnedSubjects, subject] });
        }
      },

      unpinAllSubjects: () => {
        set({ pinnedSubjects: [] });
      },

      isPinned: (subject: string) => {
        return get().pinnedSubjects.includes(subject);
      },

      toggleHaptics: () => {
        set({ hapticsEnabled: !get().hapticsEnabled });
      },

      setHapticsEnabled: (hapticsEnabled: boolean) => {
        set({ hapticsEnabled });
      },

      toggleSounds: () => {
        set({ soundsEnabled: !get().soundsEnabled });
      },

      setSoundsEnabled: (soundsEnabled: boolean) => {
        set({ soundsEnabled });
      },

      toggleDisableSwapPopups: () => {
        set({ disableSwapPopups: !get().disableSwapPopups });
      },

      setDisableSwapPopups: (disableSwapPopups: boolean) => {
        set({ disableSwapPopups });
      },

      resetPreferences: () => {
        set({
          theme: "system",
          accentMode: "default",
          customColor: DEFAULT_ACCENT_HEX,
          pinnedSubjects: [],
          hapticsEnabled: true,
          soundsEnabled: false,
          disableSwapPopups: false,
        });
        applyTheme("system");
        applyAccentColor("default", DEFAULT_ACCENT_HEX);
      },
    }),
    {
      name: "queue_preferences_storage",
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState || {}) as Partial<PreferencesState>;
        if (version < 1) {
          state.soundsEnabled = false;
        }
        return state as PreferencesState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyAccentColor(state.accentMode || "default", state.customColor || DEFAULT_ACCENT_HEX);
        }
      },
    }
  )
);

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function applyAccentColor(mode: AccentMode = "default", customHex: string = DEFAULT_ACCENT_HEX) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  if (mode === "default") {
    const hsl = isDark ? "262 83% 65%" : "262 83% 58%";
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--accent", isDark ? "262 50% 16%" : "262 83% 96%");
    root.style.setProperty("--accent-foreground", isDark ? "262 83% 75%" : "262 83% 50%");
    root.style.setProperty("--logo-accent", DEFAULT_ACCENT_HEX);
  } else {
    const hex = customHex && customHex.startsWith("#") ? customHex : DEFAULT_ACCENT_HEX;
    const { h, s, l, isLight } = hexToHsl(hex);

    // In dark mode, if user picked a very low lightness color, bump it slightly for visibility
    let displayL = l;
    if (isDark && l < 30) {
      displayL = Math.min(l + 25, 65);
    }

    const hsl = `${h} ${s}% ${displayL}%`;
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--ring", hsl);
    // If the accent background is light (high luminance), foreground MUST be dark black (0 0% 9%)
    // so that text and toggle switches have distinct contrast and never blend together!
    root.style.setProperty("--primary-foreground", isLight ? "0 0% 9%" : "0 0% 100%");
    root.style.setProperty("--accent", `${h} ${Math.min(s, 50)}% ${isDark ? "18%" : "95%"}`);
    root.style.setProperty("--accent-foreground", hsl);
    root.style.setProperty("--logo-accent", hex);
  }
}
