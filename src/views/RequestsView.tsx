import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowsLeftRight,
  Check,
  X,
  ArrowRight,
  ChatText,
} from "@phosphor-icons/react";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryBanner } from "@/components/ui/retry-banner";
import { haptic } from "@/lib/telegram";
import {
  useUserActiveQueues,
  useIncomingSwaps,
  useOutgoingSwaps,
  useAcceptSwapMutation,
  useRejectSwapMutation,
  useCancelSwapMutation,
} from "@/hooks/useQueueApi";
import { SwapRespondDrawer } from "@/components/queue/SwapRespondDrawer";
import { SwapRequestInfo } from "@/types";

export function RequestsView() {
  const { user } = useUserStore();
  const { setPendingIncomingCount } = useNotificationStore();
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [respondTarget, setRespondTarget] = useState<SwapRequestInfo | null>(null);

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

  const currentSubject = selectedSubject || uniqueUserQueues[0]?.subject || null;
  const currentQueue = uniqueUserQueues.find((q) => q.subject === currentSubject);

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

  const incomingRequests = incomingData?.requests || [];
  const outgoingRequests = outgoingData?.requests || [];

  const pendingCount = incomingRequests.filter(
    (r) => !r.status || r.status === "pending"
  ).length;

  useEffect(() => {
    setPendingIncomingCount(pendingCount);
  }, [pendingCount, setPendingIncomingCount]);

  const handleQuickAccept = (r: SwapRequestInfo) => {
    if (!user?.tg_id) return;
    acceptMutation.mutate({
      requestId: r.id,
      subject: r.subject,
      data: { tg_id: user.tg_id },
    });
  };

  const handleQuickReject = (r: SwapRequestInfo) => {
    if (!user?.tg_id) return;
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
      case "pending":
        return <Badge variant="warning">Ожидает ответа</Badge>;
      case "accepted":
        return <Badge variant="default">Принят</Badge>;
      case "rejected":
        return <Badge variant="destructive">Отклонен</Badge>;
      case "cancelled":
        return <Badge variant="subtle">Отозван</Badge>;
      case "expired":
        return <Badge variant="subtle">Истек</Badge>;
      default:
        return <Badge variant="subtle">{status || "Ожидает"}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-32 max-w-lg mx-auto w-full select-none">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Обмены
        </h1>
        <p className="text-xs text-muted-foreground font-medium">
          {currentQueue
            ? `${currentQueue.subject_name} • ${currentQueue.queue_type}`
            : currentSubject
            ? currentSubject
            : "Предложения по смене мест"}
        </p>
      </header>

      {/* Queue selector pills: showing both subject and queue_type clearly */}
      {uniqueUserQueues.length > 1 ? (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 py-0.5">
          {uniqueUserQueues.map((q) => {
            const isSelected = currentSubject === q.subject;
            return (
              <button
                key={q.subject}
                onClick={() => {
                  haptic.selection();
                  setSelectedSubject(q.subject);
                }}
                className={`flex flex-col text-left px-4 py-2.5 rounded-2xl text-xs transition-all duration-150 ${
                  isSelected
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-semibold truncate max-w-[150px]">
                  {q.queue_type || q.subject}
                </span>
                <span className="text-[10px] opacity-75 truncate max-w-[150px]">
                  {q.subject_name}
                </span>
              </button>
            );
          })}
        </div>
      ) : !currentSubject ? (
        <div className="bg-card rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-xs text-muted-foreground font-medium">
            Вы пока не записаны ни в одну очередь.
          </p>
          <Link
            to="/"
            onClick={() => haptic.selection()}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Выбрать очередь в каталоге
          </Link>
        </div>
      ) : null}

      {/* Segment Switcher */}
      <div className="bg-secondary p-1 rounded-2xl flex items-center gap-1">
        <button
          onClick={() => {
            haptic.selection();
            setTab("incoming");
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-150 text-center ${
            tab === "incoming"
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Входящие {incomingRequests.length > 0 && `• ${incomingRequests.length}`}
        </button>
        <button
          onClick={() => {
            haptic.selection();
            setTab("outgoing");
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-150 text-center ${
            tab === "outgoing"
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Исходящие {outgoingRequests.length > 0 && `• ${outgoingRequests.length}`}
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">
        {tab === "incoming" ? (
          isErrorIncoming ? (
            <RetryBanner
              message="Не удалось загрузить входящие предложения"
              onRetry={() => refetchIncoming()}
            />
          ) : isLoadingIncoming ? (
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
              const isPending = !r.status || r.status === "pending";

              return (
                <div
                  key={r.id}
                  className="bg-card rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {r.subject}
                    </span>
                    {renderStatusBadge(r.status)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">
                      {r.from_name || `ID ${r.from_tg_id}`}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold bg-secondary px-3 py-1.5 rounded-xl text-foreground">
                      <span>Место {r.from_position}</span>
                      <ArrowRight size={12} weight="bold" className="text-muted-foreground" />
                      <span className="text-primary font-bold">Место {r.to_position} (Вы)</span>
                    </div>
                  </div>

                  {r.message && (
                    <div className="bg-secondary/70 rounded-xl p-3 text-xs text-foreground font-medium leading-relaxed">
                      "{r.message}"
                    </div>
                  )}

                  {r.response_message && (
                    <div className="bg-secondary/40 rounded-xl p-2.5 text-xs text-muted-foreground font-medium">
                      Ответ: {r.response_message}
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 rounded-xl h-10 text-xs font-semibold gap-1.5"
                        onClick={() => {
                          haptic.selection();
                          setRespondTarget(r);
                        }}
                      >
                        <ChatText size={16} />
                        Ответить
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 rounded-xl h-10 text-xs font-semibold gap-1.5"
                        onClick={() => handleQuickAccept(r)}
                        disabled={acceptMutation.isPending}
                      >
                        <Check size={16} weight="bold" />
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-10 w-10 p-0 rounded-xl shrink-0"
                        onClick={() => handleQuickReject(r)}
                        disabled={rejectMutation.isPending}
                      >
                        <X size={16} weight="bold" />
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
                  Когда кто-то предложит вам поменяться местами, запрос появится здесь
                </span>
              </div>
            </div>
          )
        ) : isErrorOutgoing ? (
          <RetryBanner
            message="Не удалось загрузить отправленные запросы"
            onRetry={() => refetchOutgoing()}
          />
        ) : isLoadingOutgoing ? (
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
            const isPending = !r.status || r.status === "pending";

            return (
              <div
                key={r.id}
                className="bg-card rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {r.subject}
                  </span>
                  {renderStatusBadge(r.status)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Кому: <span className="text-foreground font-semibold">{r.to_name || `ID ${r.to_tg_id}`}</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold bg-secondary px-3 py-1.5 rounded-xl text-foreground">
                    <span className="text-primary font-bold">Место {r.from_position} (Вы)</span>
                    <ArrowRight size={12} weight="bold" className="text-muted-foreground" />
                    <span>Место {r.to_position}</span>
                  </div>
                </div>

                {r.message && (
                  <div className="bg-secondary/70 rounded-xl p-3 text-xs text-foreground font-medium leading-relaxed">
                    "{r.message}"
                  </div>
                )}

                {r.response_message && (
                  <div className="bg-secondary/40 rounded-xl p-2.5 text-xs text-muted-foreground font-medium">
                    Ответ: {r.response_message}
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

      {/* Respond drawer */}
      <SwapRespondDrawer
        request={respondTarget}
        isOpen={respondTarget !== null}
        onClose={() => setRespondTarget(null)}
      />
    </div>
  );
}
