import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MagnifyingGlass, UserCircle, ArrowsClockwise } from "@phosphor-icons/react";
import { useUserStore } from "@/store/userStore";
import { usePreferencesStore } from "@/store/preferencesStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryBanner } from "@/components/ui/retry-banner";
import { haptic, setTelegramClosingConfirmation } from "@/lib/telegram";
import {
  useQueuesList,
  useUserActiveQueues,
  useSubjectsList,
} from "@/hooks/useQueueApi";
import { ActiveHeroBanner } from "@/components/dashboard/ActiveHeroBanner";
import { QueueCard } from "@/components/dashboard/QueueCard";
import { QueueSlotsModal } from "@/components/queue/QueueSlotsModal";
import { SwapRequestDrawer } from "@/components/queue/SwapRequestDrawer";
import { CreateQueueDrawer } from "@/components/queue/CreateQueueDrawer";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useTelegramMainButton } from "@/hooks/useTelegramMainButton";

export function DashboardView() {
  const { user } = useUserStore();
  const { statusFilter, setStatusFilter, togglePinSubject, isPinned } = usePreferencesStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [search, setSearch] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drawers state
  const [selectedQueueSubject, setSelectedQueueSubject] = useState<string | null>(null);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [isSwapDrawerOpen, setIsSwapDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [swapTargetPos, setSwapTargetPos] = useState<number | null>(null);
  const [swapTargetName, setSwapTargetName] = useState<string | null>(null);

  // Queries
  const {
    data: queuesData,
    isLoading: isLoadingQueues,
    isError: isErrorQueues,
    refetch: refetchQueues,
    isFetching: isFetchingQueues,
  } = useQueuesList({
    search: search.trim() || undefined,
    subject_name: selectedSubjectFilter || undefined,
    is_paused:
      statusFilter === "active"
        ? false
        : statusFilter === "paused"
        ? true
        : undefined,
  });

  const { data: userQueuesData } = useUserActiveQueues(user?.tg_id);
  const { data: subjectsData } = useSubjectsList();

  const allQueues = queuesData?.queues || [];
  const userQueues = userQueuesData?.queues || [];
  const subjects = subjectsData?.subject_list || [];

  // Active queue where user is currently registered
  const activeQueue = userQueues.length > 0 ? userQueues[0] : null;

  const connectionStatus = useConnectionStatus();

  // Telegram native closing confirmation when in queue or in drawer
  useEffect(() => {
    const hasOpenDrawer =
      isSlotsModalOpen || isSwapDrawerOpen || isCreateDrawerOpen;
    const hasActiveRecord = Boolean(activeQueue);
    setTelegramClosingConfirmation(hasOpenDrawer || hasActiveRecord);
  }, [isSlotsModalOpen, isSwapDrawerOpen, isCreateDrawerOpen, activeQueue]);

  // Telegram native MainButton
  useTelegramMainButton({
    text: "Открыть мою очередь",
    isVisible:
      activeQueue !== null &&
      !isSlotsModalOpen &&
      !isSwapDrawerOpen &&
      !isCreateDrawerOpen,
    onClick: () => {
      if (activeQueue) handleOpenQueue(activeQueue.subject);
    },
  });

  const baseQueues = activeTab === "all" ? allQueues : userQueues;
  const displayedQueues = [...baseQueues].sort((a, b) => {
    const aPinned = isPinned(a.subject);
    const bPinned = isPinned(b.subject);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  const handleRefresh = async () => {
    haptic.selection();
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleOpenQueue = (subject: string) => {
    haptic.selection();
    setSelectedQueueSubject(subject);
    setIsSlotsModalOpen(true);
  };

  const handleRequestSwap = (targetPos: number, candidateName: string) => {
    haptic.selection();
    setSwapTargetPos(targetPos);
    setSwapTargetName(candidateName);
    setIsSwapDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28 max-w-lg mx-auto w-full select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center font-semibold text-sm">
            {user?.name?.slice(0, 1) || "U"}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Telegram Mini App</span>
            <span className="text-sm font-semibold tracking-tight">{user?.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            title="Обновить"
            aria-label="Обновить данные"
          >
            <ArrowsClockwise
              size={16}
              weight="bold"
              className={isRefreshing || isFetchingQueues ? "animate-spin" : ""}
            />
          </button>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 text-[11px] font-medium text-muted-foreground">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-emerald-500"
                  : connectionStatus === "connecting"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            <span>
              {connectionStatus === "connected"
                ? "Онлайн"
                : connectionStatus === "connecting"
                ? "Связь..."
                : "Оффлайн"}
            </span>
          </div>

          <Badge variant={user?.role === "curator" ? "default" : "secondary"}>
            {user?.role === "curator" ? "Куратор" : "Студент"}
          </Badge>
        </div>
      </div>

      {/* Hero Active Queue Status */}
      {activeQueue && (
        <ActiveHeroBanner
          queue={activeQueue}
          tgId={user?.tg_id}
          onOpenQueue={() => handleOpenQueue(activeQueue.subject)}
          onOpenSwap={() => {
            setSelectedQueueSubject(activeQueue.subject);
            setIsSwapDrawerOpen(true);
          }}
        />
      )}

      {/* Search Input without borders */}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Поиск по предмету или типу сдачи..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-secondary/50 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:bg-secondary/70 transition-all placeholder:text-muted-foreground/50 text-foreground"
        />
      </div>

      {/* Subject Filter Pills (Horizontal Scroll) */}
      {subjects.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => {
              haptic.selection();
              setSelectedSubjectFilter(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-150 ${
              selectedSubjectFilter === null
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
            }`}
          >
            Все предметы
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                haptic.selection();
                setSelectedSubjectFilter(
                  selectedSubjectFilter === s.name ? null : s.name
                );
              }}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-150 ${
                selectedSubjectFilter === s.name
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Segment Switcher */}
      <div className="bg-secondary/50 p-1 rounded-2xl flex items-center gap-1">
        <button
          onClick={() => {
            haptic.selection();
            setActiveTab("all");
          }}
          className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all duration-150 text-center ${
            activeTab === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Все очереди ({allQueues.length})
        </button>
        <button
          onClick={() => {
            haptic.selection();
            setActiveTab("my");
          }}
          className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all duration-150 text-center ${
            activeTab === "my"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Мои записи ({userQueues.length})
        </button>
      </div>

      {/* Section Header with Status Filters & Create Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 bg-secondary/40 p-0.5 rounded-xl">
          <button
            onClick={() => {
              haptic.selection();
              setStatusFilter("all");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Все
          </button>
          <button
            onClick={() => {
              haptic.selection();
              setStatusFilter("active");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
              statusFilter === "active"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Открытые
          </button>
          <button
            onClick={() => {
              haptic.selection();
              setStatusFilter("paused");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
              statusFilter === "paused"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            На паузе
          </button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={() => {
            haptic.light();
            setIsCreateDrawerOpen(true);
          }}
        >
          <Plus size={14} weight="bold" />
          Создать
        </Button>
      </div>

      {/* Queues List with Smooth Skeletons & Retry */}
      <div className="flex flex-col gap-3">
        {isErrorQueues ? (
          <RetryBanner
            message="Ошибка загрузки списка очередей"
            onRetry={() => refetchQueues()}
            isRetrying={isFetchingQueues}
          />
        ) : isLoadingQueues ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-lg" />
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedQueues.length > 0 ? (
          displayedQueues.map((q) => (
            <QueueCard
              key={q.subject}
              queue={q}
              isPinned={isPinned(q.subject)}
              onTogglePin={(e) => {
                e.stopPropagation();
                haptic.selection();
                togglePinSubject(q.subject);
              }}
              onClick={() => handleOpenQueue(q.subject)}
            />
          ))
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-2">
            <UserCircle size={36} weight="thin" className="text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">
              {activeTab === "all"
                ? "Активные очереди не найдены"
                : "Вы пока не записаны ни в одну очередь"}
            </span>
          </div>
        )}
      </div>

      {/* Interactive Slots Drawer */}
      <QueueSlotsModal
        subject={selectedQueueSubject}
        isOpen={isSlotsModalOpen}
        onClose={() => {
          setIsSlotsModalOpen(false);
          setSelectedQueueSubject(null);
        }}
        onRequestSwap={handleRequestSwap}
      />

      {/* Swap Request Drawer */}
      <SwapRequestDrawer
        subject={selectedQueueSubject}
        isOpen={isSwapDrawerOpen}
        preselectedPos={swapTargetPos}
        preselectedName={swapTargetName}
        onClose={() => {
          setIsSwapDrawerOpen(false);
          setSwapTargetPos(null);
          setSwapTargetName(null);
        }}
      />

      {/* Create Queue Drawer */}
      <CreateQueueDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
      />
    </div>
  );
}
