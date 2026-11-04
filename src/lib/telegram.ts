import { TelegramUser } from "@/types";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: string;
          hash?: string;
        };
        version: string;
        platform: string;
        colorScheme: "light" | "dark";
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
          header_bg_color?: string;
          section_bg_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation?: () => void;
        disableVerticalSwipes?: () => void;
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export const tg = () => window.Telegram?.WebApp;

export function initTelegramApp() {
  const app = tg();
  if (!app) return;

  try {
    app.ready();
    app.expand();
    if (typeof app.disableVerticalSwipes === "function") {
      app.disableVerticalSwipes();
    }
    syncTelegramTheme();
    app.onEvent("themeChanged", syncTelegramTheme);
  } catch (err) {
    console.warn("Telegram WebApp init warning:", err);
  }
}

export function syncTelegramTheme() {
  const app = tg();
  const isDark =
    app?.colorScheme === "dark" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function getTelegramUser(): TelegramUser | null {
  return tg()?.initDataUnsafe?.user || null;
}

export function getTelegramInitData(): string {
  return tg()?.initData || "";
}

function canVibrate(): boolean {
  try {
    const raw = localStorage.getItem("queue_preferences_storage");
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed?.state?.hapticsEnabled !== false;
  } catch {
    return true;
  }
}

export const haptic = {
  light: () => canVibrate() && tg()?.HapticFeedback?.impactOccurred("light"),
  medium: () => canVibrate() && tg()?.HapticFeedback?.impactOccurred("medium"),
  heavy: () => canVibrate() && tg()?.HapticFeedback?.impactOccurred("heavy"),
  success: () => canVibrate() && tg()?.HapticFeedback?.notificationOccurred("success"),
  error: () => canVibrate() && tg()?.HapticFeedback?.notificationOccurred("error"),
  warning: () => canVibrate() && tg()?.HapticFeedback?.notificationOccurred("warning"),
  selection: () => canVibrate() && tg()?.HapticFeedback?.selectionChanged(),
};

export function setTelegramClosingConfirmation(enabled: boolean) {
  const app = tg();
  if (!app) return;
  try {
    if (enabled && typeof app.enableClosingConfirmation === "function") {
      app.enableClosingConfirmation();
    } else if (!enabled && typeof app.disableClosingConfirmation === "function") {
      app.disableClosingConfirmation();
    }
  } catch (err) {
    console.warn("Telegram closing confirmation error:", err);
  }
}
