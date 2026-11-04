import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import {
  ListNumbers,
  ArrowsLeftRight,
  User as UserIcon,
} from "@phosphor-icons/react";

import { initTelegramApp, haptic } from "@/lib/telegram";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";
import { usePreferencesStore, applyTheme, applyAccentColor } from "@/store/preferencesStore";
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { useTelegramNavigation } from "@/hooks/useTelegramNavigation";
import { DashboardView } from "@/views/DashboardView";
import { RequestsView } from "@/views/RequestsView";
import { ProfileView } from "@/views/ProfileView";
import { SwapRespondDrawer } from "@/components/queue/SwapRespondDrawer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    },
  },
});

// ──────────────────── Seamless Bottom Navigation (Mobbin Minimal Style) ────────────────────
function NavigationBar() {
  const location = useLocation();
  const { pendingIncomingCount } = useNotificationStore();

  const navItems = [
    { path: "/", label: "Очереди", icon: ListNumbers },
    {
      path: "/requests",
      label: "Обмены",
      icon: ArrowsLeftRight,
      badge: pendingIncomingCount > 0,
    },
    { path: "/profile", label: "Профиль", icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 bg-background flex items-center justify-around h-16 pb-safe w-full max-w-lg select-none">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => haptic.selection()}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-150 relative ${
              isActive ? "text-foreground font-semibold" : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            <div className="relative">
              <Icon size={24} weight={isActive ? "fill" : "regular"} />
              {item.badge && (
                <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <span className="text-[11px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AppContent() {
  useTelegramNavigation();
  const { activeSwapProposal, setActiveSwapProposal } = useNotificationStore();

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
        isOpen={activeSwapProposal !== null}
        onClose={() => setActiveSwapProposal(null)}
      />

      <Toaster
        position="top-center"
        toastOptions={{
          className: "bg-secondary text-foreground text-xs rounded-2xl",
        }}
      />
    </div>
  );
}

export default function App() {
  const { initUser } = useUserStore();
  const { theme, accentMode, customColor } = usePreferencesStore();

  useEffect(() => {
    applyTheme(theme);
    applyAccentColor(accentMode, customColor);
    initTelegramApp();
    initUser();
  }, [initUser, theme, accentMode, customColor]);

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
