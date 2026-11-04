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
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { useTelegramNavigation } from "@/hooks/useTelegramNavigation";
import { DashboardView } from "@/views/DashboardView";
import { RequestsView } from "@/views/RequestsView";
import { ProfileView } from "@/views/ProfileView";
import { UrgentAlertBanner } from "@/components/notifications/UrgentAlertBanner";
import { SwapRespondDrawer } from "@/components/queue/SwapRespondDrawer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    },
  },
});

// ──────────────────── Seamless Bottom Navigation ────────────────────
function NavigationBar() {
  const location = useLocation();
  const { pendingIncomingCount } = useNotificationStore();

  const navItems = [
    { path: "/", label: "Очереди", icon: ListNumbers },
    {
      path: "/requests",
      label: "Обмены",
      icon: ArrowsLeftRight,
      badge: pendingIncomingCount > 0 ? pendingIncomingCount : undefined,
    },
    { path: "/profile", label: "Профиль", icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 flex items-center justify-around h-16 pb-safe max-w-lg mx-auto select-none">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => haptic.selection()}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-150 relative ${
              isActive ? "text-foreground font-semibold" : "text-muted-foreground/70"
            }`}
          >
            <div className="relative">
              <Icon size={22} weight={isActive ? "bold" : "regular"} />
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                  {item.badge}
                </span>
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
      <UrgentAlertBanner />
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

      {/* Sonner toast setup: clean, borderless, flat, no backdrop blur */}
      <Toaster
        position="top-center"
        toastOptions={{
          className: "bg-secondary text-foreground text-xs shadow-md border-0 rounded-2xl",
        }}
      />
    </div>
  );
}

// ──────────────────── Main App ────────────────────
export default function App() {
  const { initUser } = useUserStore();

  useEffect(() => {
    initTelegramApp();
    initUser();
  }, [initUser]);

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
