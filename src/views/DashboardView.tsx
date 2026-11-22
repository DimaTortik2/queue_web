import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, MagnifyingGlass, SortAscending } from '@phosphor-icons/react';
import { useUserStore } from '@/store/userStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RetryBanner } from '@/components/ui/retry-banner';
import { haptic } from '@/lib/telegram';
import { resolveQueueSubject } from '@/lib/deepLink';
import {
  useQueuesList,
  useUserActiveQueues,
  useSubjectsList,
} from '@/hooks/useQueueApi';
import { QueueCard } from '@/components/dashboard/QueueCard';
import { QueueSlotsModal } from '@/components/queue/QueueSlotsModal';
import { SwapRequestDrawer } from '@/components/queue/SwapRequestDrawer';
import { CreateQueueDrawer } from '@/components/queue/CreateQueueDrawer';
import { QueueLogo } from '@/components/ui/QueueLogo';

interface DashboardViewProps {
  queueStartParam: string | null;
  onQueueStartParamHandled: () => void;
}

export function DashboardView({ queueStartParam, onQueueStartParamHandled }: DashboardViewProps) {
  const { user } = useUserStore();
  const { togglePinSubject, isPinned } = usePreferencesStore();

  const [search, setSearch] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<
    string | null
  >(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modals state
  const [selectedQueueSubject, setSelectedQueueSubject] = useState<
    string | null
  >(null);
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
  } = useQueuesList({
    search: search.trim() || undefined,
  });

  const { data: userQueuesData } = useUserActiveQueues(user?.tg_id);
  const { data: subjectsData } = useSubjectsList();

  const allQueues = queuesData?.queues || [];
  const userQueues = userQueuesData?.queues || [];

  // Only subjects that currently have at least one active queue created
  const activeSubjects = useMemo(() => {
    const queues = allQueues;
    const map = new Map<string, { id: number | string; name: string }>();
    for (const q of queues) {
      if (q.subject_name && !map.has(q.subject_name)) {
        const matched = subjectsData?.subject_list?.find(
          (s) => s.name === q.subject_name
        );
        map.set(q.subject_name, {
          id: matched?.id ?? q.subject_name,
          name: q.subject_name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ru')
    );
  }, [allQueues, subjectsData?.subject_list]);

  // Auto-reset subject filter if the filtered subject no longer has any queues
  useEffect(() => {
    if (
      selectedSubjectFilter &&
      activeSubjects.length > 0 &&
      !activeSubjects.some((s) => s.name === selectedSubjectFilter)
    ) {
      setSelectedSubjectFilter(null);
    }
  }, [selectedSubjectFilter, activeSubjects]);

  // Hashed links wait for the queue list before being consumed.
  useEffect(() => {
    const resolved = resolveQueueSubject(queueStartParam, queuesData?.queues);
    if (resolved) {
      onQueueStartParamHandled();
      setSelectedQueueSubject(resolved);
      setIsSlotsModalOpen(true);
    }
  }, [queueStartParam, queuesData?.queues, onQueueStartParamHandled]);

  const userPositionsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of userQueues) {
      if (q.my_position !== undefined && q.my_position !== null) {
        map.set(q.subject, q.my_position);
      }
    }
    return map;
  }, [userQueues]);

  // Instant filtering by subject without network refetch
  const filteredQueues = useMemo(() => {
    if (!selectedSubjectFilter) return allQueues;
    return allQueues.filter((q) => q.subject_name === selectedSubjectFilter);
  }, [allQueues, selectedSubjectFilter]);

  // Sort: pinned first, then by date (newest first by default, or inverted)
  const displayedQueues = useMemo(() => {
    return [...filteredQueues].sort((a, b) => {
      const aPinned = isPinned(a.subject);
      const bPinned = isPinned(b.subject);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;

      if (timeA !== timeB) {
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return (a.subject || '').localeCompare(b.subject || '', 'ru');
    });
  }, [filteredQueues, isPinned, sortOrder]);

  const handleSelectFilter = useCallback(
    (subjectName: string | null) => {
      haptic.selection();
      if (selectedSubjectFilter === subjectName) {
        // Toggle sort order when clicking the already active filter
        setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      } else {
        // Selecting another filter resets sort to default (newest first)
        setSelectedSubjectFilter(subjectName);
        setSortOrder('desc');
      }
    },
    [selectedSubjectFilter]
  );

  const handleOpenQueue = useCallback((subject: string) => {
    haptic.selection();
    setSelectedQueueSubject(subject);
    setIsSlotsModalOpen(true);
  }, []);

  const handleRequestSwap = useCallback((targetPos: number, candidateName: string) => {
    haptic.selection();
    setSwapTargetPos(targetPos);
    setSwapTargetName(candidateName);
    setIsSwapDrawerOpen(true);
  }, []);

  const handleCloseSlotsModal = useCallback(() => setIsSlotsModalOpen(false), []);

  const slotsModalInitialMeta = useMemo(() => {
    const meta = displayedQueues.find(
      (q) => q.subject === selectedQueueSubject
    );
    if (!meta) return undefined;
    const pos = selectedQueueSubject
      ? userPositionsMap.get(selectedQueueSubject)
      : null;
    return {
      ...meta,
      my_position: pos !== undefined ? pos : meta.my_position,
    };
  }, [displayedQueues, selectedQueueSubject, userPositionsMap]);

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-32 max-w-lg mx-auto w-full select-none native-page-enter">
      {/* Minimal Header: Logo + User Name directly */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QueueLogo size={42} />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {user?.name || 'Гость'}
            </h1>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            haptic.light();
            setIsCreateDrawerOpen(true);
          }}
          className="rounded-2xl px-4 py-2.5 text-xs font-semibold gap-1.5"
        >
          <Plus size={16} weight="bold" />
          Создать
        </Button>
      </header>

      {/* Large Search Bar */}
      <div className="relative">
        <MagnifyingGlass
          size={18}
          weight="bold"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60"
        />
        <input
          type="text"
          placeholder="Поиск по предмету или типу сдачи..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card hover:bg-card/90 focus:ring-2 focus:ring-primary/20 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium transition-all placeholder:text-muted-foreground/50 text-foreground border-0 outline-none"
        />
      </div>

      {/* Subject Filter Pills (Touch Carousel strictly within content bounds) */}
      {(allQueues.length > 0 || activeSubjects.length > 0) && (
        <div className="w-full overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth snap-x snap-mandatory">
            <button
              onClick={() => handleSelectFilter(null)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 snap-start transition-all duration-150 tap-press active:scale-95 ${
                selectedSubjectFilter === null
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Все</span>
              {selectedSubjectFilter === null && sortOrder === 'asc' && (
                <SortAscending size={14} weight="bold" className="shrink-0 animate-in fade-in zoom-in-75 duration-150" />
              )}
            </button>
            {activeSubjects.map((s) => {
              const isSelected = selectedSubjectFilter === s.name;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectFilter(s.name)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 snap-start transition-all duration-150 tap-press active:scale-95 ${
                    isSelected
                      ? 'bg-foreground text-background shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{s.name}</span>
                  {isSelected && sortOrder === 'asc' && (
                    <SortAscending size={14} weight="bold" className="shrink-0 animate-in fade-in zoom-in-75 duration-150" />
                  )}
                </button>
              );
            })}
            <div className="shrink-0 w-4" />
          </div>
        </div>
      )}

      {/* Queues List */}
      <div className="flex flex-col gap-4">
        {isErrorQueues ? (
          <RetryBanner
            message="Не удалось загрузить очереди"
            onRetry={() => refetchQueues()}
          />
        ) : isLoadingQueues && !queuesData ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2 w-1/2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-xl" />
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedQueues.length > 0 ? (
          displayedQueues.map((q) => {
            const myPos = userPositionsMap.get(q.subject) ?? (q.my_position ?? null);
            const isCreator = user?.tg_id
              ? q.created_by_tg_id === user.tg_id
              : false;
            return (
              <QueueCard
                key={q.subject}
                queue={q}
                isCreator={isCreator}
                myPosition={myPos}
                isPinned={isPinned(q.subject)}
                onTogglePin={(e) => {
                  e.stopPropagation();
                  haptic.selection();
                  togglePinSubject(q.subject);
                }}
                onClick={() => handleOpenQueue(q.subject)}
              />
            );
          })
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center text-muted-foreground/40">
              <MagnifyingGlass size={32} weight="bold" />
            </div>
            <div className="flex flex-col gap-1 max-w-xs">
              <span className="text-sm font-semibold text-foreground">
                Очереди не найдены
              </span>
              <span className="text-xs text-muted-foreground">
                {search
                  ? 'Попробуйте изменить запрос поиска'
                  : 'Создайте первую очередь нажав кнопку выше'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Slots Drawer */}
      <QueueSlotsModal
        subject={selectedQueueSubject}
        initialMeta={slotsModalInitialMeta}
        isOpen={isSlotsModalOpen}
        onClose={handleCloseSlotsModal}
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
