import { useState, useEffect } from "react";
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

  const currentSubject = selectedSubject || userQueues[0]?.subject || null;

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

  // Sync pending count to store for bottom navigation badge
  useEffect(() => {
    const pendingCount = incomingRequests.filter(
      (r) => !r.status || r.status === "pending"
    ).length;
    setPendingIncomingCount(pendingCount);
  }, [incomingRequests, setPendingIncomingCount]);

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
        return <Badge variant="success">Принят</Badge>;
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
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28 max-w-lg mx-auto w-full select-none">
      <div className="flex flex-col gap-0.5 pt-1">
        <span className="text-base font-semibold tracking-tight">Запросы на обмен</span>
        <span className="text-xs text-muted-foreground">
          {currentSubject ? `Очередь: ${currentSubject}` : "Предложения обмена местами"}
        </span>
      </div>

      {/* Queue Filter Pills or Empty Prompt */}
      {userQueues.length > 1 ? (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {userQueues.map((q) => (
            <button
              key={q.subject}
              onClick={() => {
                haptic.selection();
                setSelectedSubject(q.subject);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-150 ${
                currentSubject === q.subject
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {q.subject_name || q.subject}
            </button>
          ))}
        </div>
      ) : !currentSubject ? (
        <div className="bg-secondary/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2">
          <span className="text-xs text-muted-foreground">
            Вы пока не записаны ни в одну очередь. Для обмена местами выберите очередь в каталоге.
          </span>
          <Link
            to="/"
            onClick={() => haptic.selection()}
            className="text-xs text-primary font-medium hover:underline pt-0.5"
          >
            Перейти к очередям
          </Link>
        </div>
      ) : null}

      {/* Pill Segment Control */}
      <div className="bg-secondary/50 p-1 rounded-2xl flex items-center gap-1">
        <button
          onClick={() => {
            haptic.selection();
            setTab("incoming");
          }}
          className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all duration-150 text-center ${
            tab === "incoming"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Входящие ({incomingRequests.length})
        </button>
        <button
          onClick={() => {
            haptic.selection();
            setTab("outgoing");
          }}
          className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all duration-150 text-center ${
            tab === "outgoing"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Исходящие ({outgoingRequests.length})
        </button>
      </div>

      {/* Requests Content */}
      <div className="flex flex-col gap-3">
        {tab === "incoming" ? (
          isErrorIncoming ? (
            <RetryBanner
              message="Ошибка загрузки входящих предложений"
              onRetry={() => refetchIncoming()}
            />
          ) : isLoadingIncoming ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-20 rounded-lg" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-8 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : incomingRequests.length > 0 ? (
            incomingRequests.map((r) => {
              const isPending = !r.status || r.status === "pending";

              return (
                <div
                  key={r.id}
                  className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{r.subject}</span>
                    {renderStatusBadge(r.status)}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      {r.from_name || `ID ${r.from_tg_id}`}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span>#{r.from_position}</span>
                      <ArrowRight size={12} className="text-muted-foreground" />
                      <span>#{r.to_position} (Вы)</span>
                    </div>
                  </div>

                  {r.message && (
                    <div className="bg-secondary/60 rounded-xl p-3 text-xs text-foreground/90 italic">
                      "{r.message}"
                    </div>
                  )}

                  {r.response_message && (
                    <div className="bg-secondary/40 rounded-xl p-2.5 text-xs text-muted-foreground">
                      Ответ: {r.response_message}
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="subtle"
                        className="flex-1"
                        onClick={() => {
                          haptic.selection();
                          setRespondTarget(r);
                        }}
                      >
                        <ChatText size={14} />
                        Ответить
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => handleQuickAccept(r)}
                        disabled={acceptMutation.isPending}
                      >
                        <Check size={14} weight="bold" />
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => handleQuickReject(r)}
                        disabled={rejectMutation.isPending}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2">
              <ArrowsLeftRight size={36} weight="thin" className="text-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">Входящих предложений пока нет</span>
            </div>
          )
        ) : isErrorOutgoing ? (
          <RetryBanner
            message="Ошибка загрузки отправленных запросов"
            onRetry={() => refetchOutgoing()}
          />
        ) : isLoadingOutgoing ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-20 rounded-lg" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : outgoingRequests.length > 0 ? (
          outgoingRequests.map((r) => {
            const isPending = !r.status || r.status === "pending";

            return (
              <div
                key={r.id}
                className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{r.subject}</span>
                  {renderStatusBadge(r.status)}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-muted-foreground">
                    Кому: {r.to_name || `ID ${r.to_tg_id}`}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span>#{r.from_position} (Вы)</span>
                    <ArrowRight size={12} className="text-muted-foreground" />
                    <span>#{r.to_position}</span>
                  </div>
                </div>

                {r.message && (
                  <div className="bg-secondary/60 rounded-xl p-3 text-xs text-foreground/90 italic">
                    "{r.message}"
                  </div>
                )}

                {r.response_message && (
                  <div className="bg-secondary/40 rounded-xl p-2.5 text-xs text-muted-foreground">
                    Ответ: {r.response_message}
                  </div>
                )}

                {isPending && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="subtle"
                      className="w-full text-xs"
                      onClick={() => handleCancel(r)}
                      disabled={cancelMutation.isPending}
                    >
                      Отозвать предложение
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-2">
            <ArrowsLeftRight size={36} weight="thin" className="text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">Вы пока не отправляли запросов</span>
          </div>
        )}
      </div>

      {/* Respond with custom message modal */}
      <SwapRespondDrawer
        request={respondTarget}
        isOpen={respondTarget !== null}
        onClose={() => setRespondTarget(null)}
      />
    </div>
  );
}
