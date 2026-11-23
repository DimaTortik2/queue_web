import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowsLeftRight, Check, X, SortAscending } from '@phosphor-icons/react';
import { useUserStore } from '@/store/userStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RetryBanner } from '@/components/ui/retry-banner';
import { haptic } from '@/lib/telegram';
import { formatQueueDate } from '@/lib/dateUtils';
import {
  useUserActiveQueues,
  useIncomingSwaps,
  useOutgoingSwaps,
  useAcceptSwapMutation,
  useRejectSwapMutation,
  useCancelSwapMutation,
} from '@/hooks/useQueueApi';
import { SwapRequestInfo } from '@/types';

export function RequestsView() {
  const { user } = useUserStore();
  const { setPendingIncomingCount } = useNotificationStore();
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Active queues of current user
  const { data: userQueuesData } = useUserActiveQueues(user?.tg_id);
  const userQueues = userQueuesData?.queues || [];

  // Deduplicate user queues by subject
  const uniqueUserQueues = useMemo(() => {
    const seen = new Set<string>();
    const unique: typeof userQueues = [];
    for (const q of userQueues) {
      if (!seen.has(q.subject)) {
        seen.add(q.subject);
        unique.push(q);
      }
    }
    return unique;
  }, [userQueues]);
  const queuesBySubject = new Map(uniqueUserQueues.map((queue) => [queue.subject, queue]));

  const getQueueLabel = (subject: string) => {
    const queue = queuesBySubject.get(subject);
    if (!queue) return subject.includes(':') ? subject.replace(':', ' • ') : 'Очередь';
    return [queue.subject_name, queue.queue_type, formatQueueDate(queue.queue_date)].filter(Boolean).join(' • ');
  };

  // "all" by default, or specific selected subject
  const currentSubject = selectedSubject || 'all';

  const {
    data: incomingData,
    isLoading: isLoadingIncoming,
    isError: isErrorIncoming,
    refetch: refetchIncoming,
  } = useIncomingSwaps(currentSubject, user?.tg_id);

  const {
    data: outgoingData,
    isLoading: isLoadingOutgoing,
    isError: isErrorOutgoing,
    refetch: refetchOutgoing,
  } = useOutgoingSwaps(currentSubject, user?.tg_id);

  const acceptMutation = useAcceptSwapMutation();
  const rejectMutation = useRejectSwapMutation();
  const cancelMutation = useCancelSwapMutation();

  const rawIncoming = incomingData?.requests || [];
  const rawOutgoing = outgoingData?.requests || [];

  const incomingRequests = useMemo(() => {
    return [...rawIncoming].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) {
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return 0;
    });
  }, [rawIncoming, sortOrder]);

  const outgoingRequests = useMemo(() => {
    return [...rawOutgoing].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) {
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return 0;
    });
  }, [rawOutgoing, sortOrder]);

  const handleSelectSubject = useCallback(
    (subject: string | null) => {
      haptic.selection();
      if (selectedSubject === subject) {
        // Toggle sort order
        setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      } else {
        setSelectedSubject(subject);
        setSortOrder('desc');
      }
    },
    [selectedSubject]
  );

  const pendingCount = incomingRequests.filter(
    (r) => !r.status || r.status === 'pending',
  ).length;

  useEffect(() => {
    setPendingIncomingCount(pendingCount);
  }, [pendingCount, setPendingIncomingCount]);

  const isPendingAction = acceptMutation.isPending || rejectMutation.isPending;

  const handleQuickAccept = (r: SwapRequestInfo) => {
    if (!user?.tg_id || isPendingAction) return;
    acceptMutation.mutate({
      requestId: r.id,
      subject: r.subject,
      data: { tg_id: user.tg_id },
    });
  };

  const handleQuickReject = (r: SwapRequestInfo) => {
    if (!user?.tg_id || isPendingAction) return;
    rejectMutation.mutate({
      requestId: r.id,
      subject: r.subject,
      data: { tg_id: user.tg_id },
    });
  };

  const handleCancel = (r: SwapRequestInfo) => {
    if (!user?.tg_id) return;
    cancelMutation.mutate({
      requestId: r.id,
      subject: r.subject,
      data: { tg_id: user.tg_id },
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return null; // Не показываем бесполезный бэйдж "Ожидает ответа"
      case 'accepted':
        return <Badge variant="default">Принят</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Отклонен</Badge>;
      case 'cancelled':
        return <Badge variant="subtle">Отозван</Badge>;
      case 'expired':
        return <Badge variant="subtle">Истек</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-32 max-w-lg mx-auto w-full select-none native-page-enter">
      {/* Queue selector carousel with "Все" by default, analogous to Dashboard */}
      {uniqueUserQueues.length > 0 ? (
        <div className="w-full overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth snap-x snap-mandatory">
            <button
              onClick={() => handleSelectSubject(null)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 snap-start transition-all duration-150 tap-press active:scale-95 ${
                selectedSubject === null
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Все</span>
              {selectedSubject === null && sortOrder === 'asc' && (
                <SortAscending size={14} weight="bold" className="shrink-0 animate-in fade-in zoom-in-75 duration-150" />
              )}
            </button>
            {uniqueUserQueues.map((q) => {
              const isSelected = selectedSubject === q.subject;
              return (
                <button
                  key={q.subject}
                  onClick={() => handleSelectSubject(q.subject)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 snap-start transition-all duration-150 tap-press active:scale-95 ${
                    isSelected
                      ? 'bg-foreground text-background shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{[q.queue_type || q.subject_name, formatQueueDate(q.queue_date)].filter(Boolean).join(' • ')}</span>
                  {isSelected && sortOrder === 'asc' && (
                    <SortAscending size={14} weight="bold" className="shrink-0 animate-in fade-in zoom-in-75 duration-150" />
                  )}
                </button>
              );
            })}
            <div className="shrink-0 w-4" />
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-xs text-muted-foreground font-medium">
            Вы пока не записаны ни в одну очередь.
          </p>
          <Link
            to="/"
            onClick={() => haptic.selection()}
            className="text-xs text-primary font-semibold hover:underline"
          >
            К списку очередей!
          </Link>
        </div>
      )}

      {/* Segment Switcher */}
      <div className="bg-secondary p-1 rounded-2xl flex items-center gap-1">
        <button
          onClick={() => {
            haptic.selection();
            setTab('incoming');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 text-center tap-press active:scale-[0.98] ${
            tab === 'incoming'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Входящие{' '}
          {incomingRequests.length > 0 && `• ${incomingRequests.length}`}
        </button>
        <button
          onClick={() => {
            haptic.selection();
            setTab('outgoing');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 text-center tap-press active:scale-[0.98] ${
            tab === 'outgoing'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Исходящие{' '}
          {outgoingRequests.length > 0 && `• ${outgoingRequests.length}`}
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">
        {tab === 'incoming' ? (
          isErrorIncoming ? (
            <RetryBanner
              message="Не удалось загрузить входящие предложения"
              onRetry={() => refetchIncoming()}
            />
          ) : isLoadingIncoming && !incomingData ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-20 rounded-xl" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : incomingRequests.length > 0 ? (
            incomingRequests.map((r) => {
              const isPending = !r.status || r.status === 'pending';

              return (
                <div
                  key={r.id}
                  className="bg-card rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {getQueueLabel(r.subject)}
                    </span>
                    {renderStatusBadge(r.status)}
                  </div>

                  {/* Clear visual exchange preview */}
                  <div className="bg-secondary/40 rounded-2xl p-3.5 flex flex-col gap-2.5">
                    <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3">
                      {/* Requester current position */}
                      <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-background/70">
                        <span className="text-[11px] text-muted-foreground font-medium truncate max-w-full">
                          {r.from_name || `ID ${r.from_tg_id}`}
                        </span>
                        <span className="text-base font-bold text-foreground mt-0.5">
                          Место {r.from_position}
                        </span>
                        <span className="text-[10px] text-muted-foreground/75 mt-0.5">
                          Его текущее
                        </span>
                      </div>

                      {/* Direction / Swap icon */}
                      <div className="flex flex-col items-center justify-center text-primary shrink-0">
                        <ArrowsLeftRight size={20} weight="bold" />
                      </div>

                      {/* Target / My position */}
                      <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-primary/10">
                        <span className="text-[11px] text-primary font-bold">
                          Вы
                        </span>
                        <span className="text-base font-bold text-primary mt-0.5">
                          Место {r.to_position}
                        </span>
                        <span className="text-[10px] text-primary/75 mt-0.5">
                          Куда хочет
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-center text-muted-foreground leading-relaxed pt-0.5">
                      В случае согласия вы перейдете на{' '}
                      <b>место {r.from_position}</b>, а{' '}
                      {r.from_name || 'участник'} займет ваше{' '}
                      <b>место {r.to_position}</b>.
                    </p>
                  </div>

                  {r.message && (
                    <div className="bg-secondary/70 rounded-xl p-3 text-xs text-foreground font-medium leading-relaxed italic">
                      "{r.message}"
                    </div>
                  )}

                  {isPending && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="rounded-xl h-10 text-xs font-semibold gap-1.5"
                        onClick={() => handleQuickAccept(r)}
                        disabled={isPendingAction}
                      >
                        <Check size={16} weight="bold" />
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl h-10 text-xs font-semibold gap-1.5"
                        onClick={() => handleQuickReject(r)}
                        disabled={isPendingAction}
                      >
                        <X size={16} weight="bold" />
                        Отклонить
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/40">
                <ArrowsLeftRight size={32} weight="bold" />
              </div>
              <div className="flex flex-col gap-1 max-w-xs">
                <span className="text-sm font-semibold text-foreground">
                  Нет входящих предложений
                </span>
                <span className="text-xs text-muted-foreground">
                  Когда кто-то предложит вам поменяться местами, запрос появится
                  здесь
                </span>
              </div>
            </div>
          )
        ) : isErrorOutgoing ? (
          <RetryBanner
            message="Не удалось загрузить отправленные запросы"
            onRetry={() => refetchOutgoing()}
          />
        ) : isLoadingOutgoing && !outgoingData ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-20 rounded-xl" />
                </div>
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : outgoingRequests.length > 0 ? (
          outgoingRequests.map((r) => {
            const isPending = !r.status || r.status === 'pending';

            return (
              <div
                key={r.id}
                className="bg-card rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {getQueueLabel(r.subject)}
                  </span>
                  {renderStatusBadge(r.status)}
                </div>

                {/* Clear visual exchange preview */}
                <div className="bg-secondary/40 rounded-2xl p-3.5 flex flex-col gap-2.5">
                  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3">
                    <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-primary/10">
                      <span className="text-[11px] text-primary font-bold">
                        Вы
                      </span>
                      <span className="text-base font-bold text-primary mt-0.5">
                        Место {r.from_position}
                      </span>
                      <span className="text-[10px] text-primary/75 mt-0.5">
                        Ваше текущее
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center text-muted-foreground shrink-0">
                      <ArrowsLeftRight size={20} weight="bold" />
                    </div>

                    <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-background/70">
                      <span className="text-[11px] text-muted-foreground font-medium truncate max-w-full">
                        {r.to_name || `ID ${r.to_tg_id}`}
                      </span>
                      <span className="text-base font-bold text-foreground mt-0.5">
                        Место {r.to_position}
                      </span>
                      <span className="text-[10px] text-muted-foreground/75 mt-0.5">
                        Куда хотите вы
                      </span>
                    </div>
                  </div>
                </div>

                {r.message && (
                  <div className="bg-secondary/70 rounded-xl p-3 text-xs text-foreground font-medium leading-relaxed italic">
                    "{r.message}"
                  </div>
                )}

                {isPending && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full rounded-xl h-10 text-xs font-semibold"
                    onClick={() => handleCancel(r)}
                    disabled={cancelMutation.isPending}
                  >
                    Отозвать предложение
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/40">
              <ArrowsLeftRight size={32} weight="bold" />
            </div>
            <div className="flex flex-col gap-1 max-w-xs">
              <span className="text-sm font-semibold text-foreground">
                Вы пока не отправляли запросов
              </span>
              <span className="text-xs text-muted-foreground">
                Чтобы предложить обмен, откройте очередь и нажмите на участника
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
