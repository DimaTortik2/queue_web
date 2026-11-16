import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import {
  ArrowsLeftRight,
  User as UserIcon,
} from "@phosphor-icons/react";
import { QueueNavIcon } from "@/components/ui/QueueLogo";

import { initTelegramApp, haptic } from "@/lib/telegram";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";
import { usePreferencesStore, applyTheme, applyAccentColor } from "@/store/preferencesStore";
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { useTelegramNavigation } from "@/hooks/useTelegramNavigation";
import { useIncomingSwaps } from "@/hooks/useQueueApi";
import { DashboardView } from "@/views/DashboardView";
import { RequestsView } from "@/views/RequestsView";
import { ProfileView } from "@/views/ProfileView";
import { SwapRespondDrawer } from "@/components/queue/SwapRespondDrawer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 1000 * 2,
    },
  },
});

// ──────────────────── Floating Island Bottom Navigation (Minimalist Style) ────────────────────
function NavigationBar() {
  const location = useLocation();
  const { pendingIncomingCount } = useNotificationStore();

  const navItems = [
    { path: "/", label: "Очереди", icon: QueueNavIcon },
    {
      path: "/requests",
      label: "Обмены",
      icon: ArrowsLeftRight,
      badge: pendingIncomingCount > 0,
    },
    { path: "/profile", label: "Профиль", icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-40 bg-card/90 backdrop-blur-2xl rounded-full flex items-center justify-between p-1.5 w-[calc(100%-2.5rem)] max-w-[472px] select-none border border-border/30 shadow-lg shadow-black/5 mb-safe transition-all duration-200">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => {
              haptic.selection();
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 rounded-full gap-0.5 transition-all duration-200 tap-press active:scale-95 relative ${
              isActive
                ? "bg-secondary text-foreground font-semibold shadow-sm"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <div className="relative">
              <Icon
                size={20}
                weight={isActive ? "fill" : "regular"}
                className={`transition-transform duration-200 ease-out ${
                  isActive ? "scale-110" : "scale-100"
                }`}
              />
              {item.badge && (
                <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AppContent() {
  useTelegramNavigation();
  const { activeSwapProposal, setActiveSwapProposal, setPendingIncomingCount } = useNotificationStore();
  const { user, isLoading } = useUserStore();
  const { disableSwapPopups } = usePreferencesStore();

  const { data: incomingSwapsData } = useIncomingSwaps('all', user?.tg_id);

  useEffect(() => {
    if (incomingSwapsData?.requests) {
      const pending = incomingSwapsData.requests.filter(
        (r) => !r.status || r.status === 'pending'
      ).length;
      setPendingIncomingCount(pending);
    }
  }, [incomingSwapsData, setPendingIncomingCount]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Загрузка...</span>
        </div>
      </div>
    );
  }

  // Если приложение открыто в обычном браузере вне Telegram
  if (!user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-background text-foreground select-none">
        <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center text-primary mb-5 shadow-sm">
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Откройте через Telegram</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
          Это приложение предназначено для работы внутри Telegram Mini App. Пожалуйста, запустите его через бота.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground antialiased font-sans">
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/requests" element={<RequestsView />} />
        <Route path="/profile" element={<ProfileView />} />
      </Routes>
      <NavigationBar />

      {/* Real-time incoming swap push drawer */}
      <SwapRespondDrawer
        request={activeSwapProposal}
        isOpen={!disableSwapPopups && activeSwapProposal !== null}
        onClose={() => setActiveSwapProposal(null)}
      />

      <Toaster
        position="top-center"
        visibleToasts={1}
        duration={2200}
        closeButton={false}
        toastOptions={{
          className: "bg-secondary text-foreground text-xs rounded-2xl shadow-md border border-border/40",
        }}
      />
    </div>
  );
}

export default function App() {
  const { initUser } = useUserStore();
  const { theme, accentMode, customColor } = usePreferencesStore();

  useEffect(() => {
    initTelegramApp();
    initUser();
  }, [initUser]);

  useEffect(() => {
    applyTheme(theme);
    applyAccentColor(accentMode, customColor);
  }, [theme, accentMode, customColor]);

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <Router>
          <AppContent />
        </Router>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
