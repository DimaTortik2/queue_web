import { useState } from "react";
import { toast } from "sonner";
import {
  Pause,
  Play,
  Trash,
  X,
  FastForward,
  Clock,
  MagnifyingGlass,
  Copy,
} from "@phosphor-icons/react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryBanner } from "@/components/ui/retry-banner";
import { haptic } from "@/lib/telegram";
import { useUserStore } from "@/store/userStore";
import {
  useQueueDetail,
  useMyPosition,
  useJoinQueueMutation,
  useLeaveQueueMutation,
  useCuratorAdvanceMutation,
  useCuratorPauseMutation,
  useCuratorClearMutation,
  useCuratorDeleteQueueMutation,
  useCuratorKickMutation,
} from "@/hooks/useQueueApi";
import { useRoomSubscription } from "@/providers/WebSocketProvider";
import { QueueHistoryDrawer } from "@/components/queue/QueueHistoryDrawer";
import { DirectSwapDrawer } from "@/components/queue/DirectSwapDrawer";

interface QueueSlotsModalProps {
  subject: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestSwap: (targetPos: number, candidateName: string) => void;
}

export function QueueSlotsModal({
  subject,
  isOpen,
  onClose,
  onRequestSwap,
}: QueueSlotsModalProps) {
  const { user } = useUserStore();
  const [selectedSlotForKick, setSelectedSlotForKick] = useState<{
    pos: number;
    tgId: number;
    name: string;
  } | null>(null);

  const [confirmAction, setConfirmAction] = useState<"clear" | "delete" | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDirectSwapOpen, setIsDirectSwapOpen] = useState(false);
  const [slotSearch, setSlotSearch] = useState("");

  // Real-time WebSocket connection to this queue room while open
  useRoomSubscription(isOpen && subject ? subject : null);

  const {
    data: queueData,
    isLoading,
    isError: isErrorQueue,
    refetch: refetchQueue,
  } = useQueueDetail(isOpen ? subject : null);
  const { data: myPosData } = useMyPosition(isOpen ? subject : null, user?.tg_id);

  const joinMutation = useJoinQueueMutation();
  const leaveMutation = useLeaveQueueMutation();
  const advanceMutation = useCuratorAdvanceMutation();
  const pauseMutation = useCuratorPauseMutation();
  const clearMutation = useCuratorClearMutation();
  const deleteMutation = useCuratorDeleteQueueMutation();
  const kickMutation = useCuratorKickMutation();

  const isCurator = user?.role === "curator";
  const myPosition = myPosData?.position || null;

  const handleSlotClick = (
    slotPos: number,
    isFree: boolean,
    slotUserId?: number | null,
    name?: string | null
  ) => {
    haptic.selection();

    // 1. Join free slot if not in queue
    if (isFree && !myPosition && user?.tg_id && subject) {
      if (queueData?.is_paused) {
        haptic.warning();
        toast.warning("Очередь на паузе. Запись временно приостановлена");
        return;
      }
      joinMutation.mutate({
        subject,
        data: { tg_id: user.tg_id, position: slotPos },
      });
      return;
    }

    // 2. Click on free slot while already enrolled
    if (isFree && myPosition) {
      haptic.warning();
      toast.info(`Вы уже записаны на место #${myPosition}. Чтобы сменить место, сначала освободите текущее.`);
      return;
    }

    // 3. Click on own slot
    if (!isFree && slotUserId === user?.tg_id) {
      haptic.light();
      toast.info(`Это ваше место #${slotPos}`);
      return;
    }

    // 4. Curator kick selection
    if (isCurator && !isFree && slotUserId && slotUserId !== user?.tg_id) {
      setSelectedSlotForKick({
        pos: slotPos,
        tgId: slotUserId,
        name: name || `ID ${slotUserId}`,
      });
      return;
    }

    // 5. Request swap with student ahead
    if (
      !isFree &&
      myPosition &&
      slotPos < myPosition &&
      slotUserId &&
      slotUserId !== user?.tg_id
    ) {
      if (queueData?.is_paused) {
        haptic.warning();
        toast.warning("Очередь на паузе. Обмен временно приостановлен");
        return;
      }
      onRequestSwap(slotPos, name || `Участник #${slotPos}`);
      return;
    }

    // 6. Click on student behind
    if (!isFree && myPosition && slotPos > myPosition && !isCurator) {
      haptic.warning();
      toast.info("Предложить обмен можно только участникам перед вами");
      return;
    }

    // 7. Click on student while not registered
    if (!isFree && !myPosition && !isCurator) {
      haptic.warning();
      toast.info("Чтобы предложить обмен, сначала займите свободное место в очереди");
      return;
    }
  };

  const handleLeave = () => {
    if (!subject || !user?.tg_id || !myPosition) return;
    leaveMutation.mutate({
      subject,
      data: { tg_id: user.tg_id, position: myPosition },
    });
  };

  const handleAdvance = () => {
    if (!subject || !user?.tg_id) return;
    advanceMutation.mutate({
      subject,
      data: { curator_tg_id: user.tg_id },
    });
  };

  const handleTogglePause = () => {
    if (!subject || !user?.tg_id || !queueData) return;
    pauseMutation.mutate({
      subject,
      data: { curator_tg_id: user.tg_id, paused: !queueData.is_paused },
    });
  };

  const handleClearConfirm = () => {
    if (!subject || !user?.tg_id) return;
    clearMutation.mutate(
      { subject, data: { curator_tg_id: user.tg_id } },
      { onSuccess: () => setConfirmAction(null) }
    );
  };

  const handleDeleteConfirm = () => {
    if (!subject || !user?.tg_id) return;
    deleteMutation.mutate(
      { subject, curatorTgId: user.tg_id },
      {
        onSuccess: () => {
          setConfirmAction(null);
          onClose();
        },
      }
    );
  };

  const handleKickConfirm = () => {
    if (!subject || !user?.tg_id || !selectedSlotForKick) return;
    kickMutation.mutate({
      subject,
      data: { curator_tg_id: user.tg_id, target_tg_id: selectedSlotForKick.tgId },
    });
    setSelectedSlotForKick(null);
  };

  // Generate 30 slots representation
  const slots = Array.from({ length: 30 }, (_, i) => {
    const pos = i + 1;
    const existing = queueData?.queue?.find((s) => s.position === pos);
    const isFree = existing ? existing.is_free : true;
    const isMe = !isFree && existing?.tg_id === user?.tg_id;
    return {
      pos,
      isFree,
      isMe,
      name: existing?.name || null,
      tgId: existing?.tg_id || null,
    };
  });

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle>{subject}</DrawerTitle>
              <div className="flex items-center gap-1">
                {queueData?.is_paused && <Badge variant="warning">Пауза</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  onClick={() => {
                    if (!subject) return;
                    navigator.clipboard.writeText(subject);
                    haptic.light();
                    toast.info("Название очереди скопировано");
                  }}
                  title="Скопировать название"
                  aria-label="Скопировать название очереди"
                >
                  <Copy size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setIsHistoryOpen(true)}
                >
                  <Clock size={14} />
                  Инфо
                </Button>
              </div>
            </div>
            <DrawerDescription>
              {isCurator
                ? "Управление очередью. Нажмите на участника для исключения."
                : myPosition
                ? "Нажмите на участника перед вами для предложения обмена."
                : "Нажмите на свободный слот, чтобы занять очередь."}
            </DrawerDescription>
          </DrawerHeader>

          {/* Kick Confirmation Bar */}
          {selectedSlotForKick && isCurator && (
            <div className="mx-5 mb-2 bg-rose-500/10 rounded-2xl p-3 flex items-center justify-between text-xs">
              <span className="font-medium text-rose-600 dark:text-rose-400">
                Исключить {selectedSlotForKick.name} (место #{selectedSlotForKick.pos})?
              </span>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="destructive" onClick={handleKickConfirm}>
                  Исключить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedSlotForKick(null)}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* Clear or Delete Confirmation Bar */}
          {confirmAction && isCurator && (
            <div className="mx-5 mb-2 bg-rose-500/10 rounded-2xl p-3 flex items-center justify-between text-xs">
              <span className="font-medium text-rose-600 dark:text-rose-400">
                {confirmAction === "clear"
                  ? "Очистить всех участников из очереди?"
                  : "Удалить очередь безвозвратно?"}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={
                    confirmAction === "clear" ? handleClearConfirm : handleDeleteConfirm
                  }
                >
                  Подтвердить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmAction(null)}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* Slots Grid */}
          <div className="flex flex-col gap-3 px-5 py-2 max-h-[55vh] overflow-y-auto">
            {isErrorQueue ? (
              <RetryBanner
                message="Ошибка загрузки слотов очереди"
                onRetry={() => refetchQueue()}
              />
            ) : isLoading ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Слоты сдачи (1-30)</span>
                  <span>Загрузка...</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Slot Search Input */}
                <div className="relative">
                  <MagnifyingGlass
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Поиск по имени или номеру места..."
                    value={slotSearch}
                    onChange={(e) => setSlotSearch(e.target.value)}
                    className="w-full bg-secondary/50 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:bg-secondary/70 transition-all text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Слоты сдачи (1-30)</span>
                  <span>
                    {queueData?.taken_positions || 0} из 30 занято
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {slots.map((slot) => {
                    let bgClass = "bg-secondary/40 text-muted-foreground hover:bg-secondary/70";
                    if (slot.isMe) {
                      bgClass = "bg-primary text-primary-foreground font-semibold shadow-sm";
                    } else if (!slot.isFree) {
                      bgClass = "bg-secondary text-foreground hover:bg-secondary/80 font-medium";
                    }

                    const query = slotSearch.trim().toLowerCase();
                    const isMatched =
                      !query ||
                      String(slot.pos) === query ||
                      String(slot.pos).startsWith(query) ||
                      (slot.name && slot.name.toLowerCase().includes(query));

                    return (
                      <button
                        key={slot.pos}
                        onClick={() =>
                          handleSlotClick(slot.pos, slot.isFree, slot.tgId, slot.name)
                        }
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-150 active:scale-95 text-center select-none ${bgClass} ${
                          isMatched ? "opacity-100" : "opacity-25"
                        }`}
                      >
                        <span className="text-xs font-semibold leading-none">{slot.pos}</span>
                        <span className="text-[10px] truncate max-w-full mt-1 opacity-80">
                          {slot.isMe ? "Вы" : slot.isFree ? "Свободно" : slot.name?.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <DrawerFooter>
            {/* Curator Control Toolbar */}
            {isCurator && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleAdvance}
                    disabled={advanceMutation.isPending || !queueData?.taken_positions}
                  >
                    <FastForward size={14} weight="bold" />
                    Следующий
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={handleTogglePause}
                    disabled={pauseMutation.isPending}
                  >
                    {queueData?.is_paused ? (
                      <>
                        <Play size={14} weight="fill" />
                        Возобновить
                      </>
                    ) : (
                      <>
                        <Pause size={14} weight="fill" />
                        Пауза
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setConfirmAction("clear")}
                    disabled={clearMutation.isPending || !queueData?.taken_positions}
                  >
                    <Trash size={14} />
                    Очистить
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmAction("delete")}
                    disabled={deleteMutation.isPending}
                  >
                    Удалить очередь
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => setIsDirectSwapOpen(true)}
                  disabled={!queueData?.taken_positions || queueData.taken_positions < 2}
                >
                  Прямой обмен мест
                </Button>
              </div>
            )}

            {/* Student Actions */}
            <div className="flex items-center gap-2 pt-1">
              {myPosition && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleLeave}
                  disabled={leaveMutation.isPending}
                >
                  Выйти из очереди
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="secondary" className="flex-1">
                  Закрыть
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* History and Stats Drawer */}
      <QueueHistoryDrawer
        subject={subject}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Direct Curator Swap Drawer */}
      <DirectSwapDrawer
        subject={subject}
        queueData={queueData}
        isOpen={isDirectSwapOpen}
        onClose={() => setIsDirectSwapOpen(false)}
      />
    </>
  );
}
