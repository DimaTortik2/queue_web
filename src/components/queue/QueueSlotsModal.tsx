import { useState } from "react";
import { toast } from "sonner";
import {
  Trash,
  X,
  Copy,
  ArrowsLeftRight,
  UserPlus,
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
  useQueuesList,
  useQueueDetail,
  useMyPosition,
  useJoinQueueMutation,
  useLeaveQueueMutation,
  useCuratorDeleteQueueMutation,
  useCuratorKickMutation,
} from "@/hooks/useQueueApi";
import { useRoomSubscription } from "@/providers/WebSocketProvider";
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

  const [isDeleteDrawerOpen, setIsDeleteDrawerOpen] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState("");
  const [isDirectSwapOpen, setIsDirectSwapOpen] = useState(false);

  // Real-time WebSocket connection
  useRoomSubscription(isOpen && subject ? subject : null);

  const { data: queuesData } = useQueuesList();
  const currentMeta = queuesData?.queues?.find((q) => q.subject === subject);

  const {
    data: queueData,
    isLoading,
    isError: isErrorQueue,
    refetch: refetchQueue,
  } = useQueueDetail(subject);
  const { data: myPosData } = useMyPosition(subject, user?.tg_id);

  const joinMutation = useJoinQueueMutation();
  const leaveMutation = useLeaveQueueMutation();
  const deleteMutation = useCuratorDeleteQueueMutation();
  const kickMutation = useCuratorKickMutation();

  const isCreator = user?.tg_id ? currentMeta?.created_by_tg_id === user.tg_id : false;
  const myPosition = myPosData?.position || null;
  const totalPositions = queueData?.total_positions || 30;

  // First available free slot
  const firstFreeSlot = queueData?.queue?.find((s) => s.is_free)?.position || 1;

  const handleSlotClick = (
    slotPos: number,
    isFree: boolean,
    slotUserId?: number | null,
    name?: string | null
  ) => {
    haptic.selection();

    // 1. Join free slot
    if (isFree && !myPosition && user?.tg_id && subject) {
      joinMutation.mutate({
        subject,
        data: { tg_id: user.tg_id, position: slotPos },
      });
      return;
    }

    // 2. Click on free slot while enrolled
    if (isFree && myPosition) {
      haptic.warning();
      toast.info(`Вы уже записаны на место ${myPosition}. Сначала освободите его, чтобы сменить.`);
      return;
    }

    // 3. Click on own slot
    if (!isFree && slotUserId === user?.tg_id) {
      haptic.light();
      toast.info(`Это ваше место ${slotPos}`);
      return;
    }

    // 4. Creator kick
    if (isCreator && !isFree && slotUserId && slotUserId !== user?.tg_id) {
      setSelectedSlotForKick({
        pos: slotPos,
        tgId: slotUserId,
        name: name || `ID ${slotUserId}`,
      });
      return;
    }

    // 5. Swap request
    if (!isFree && myPosition && slotUserId && slotUserId !== user?.tg_id) {
      onRequestSwap(slotPos, name || `Участник ${slotPos}`);
      return;
    }

    // 6. Not enrolled
    if (!isFree && !myPosition && !isCreator) {
      haptic.warning();
      toast.info("Займите свободное место, чтобы предлагать обмен");
      return;
    }
  };

  const handleQuickJoinFirst = () => {
    if (!subject || !user?.tg_id || myPosition) return;
    haptic.selection();
    joinMutation.mutate({
      subject,
      data: { tg_id: user.tg_id, position: firstFreeSlot },
    });
  };

  const handleLeave = () => {
    if (!subject || !user?.tg_id || !myPosition) return;
    leaveMutation.mutate({
      subject,
      data: { tg_id: user.tg_id, position: myPosition },
    });
  };

  const handleDeleteConfirm = () => {
    if (!subject || !user?.tg_id) return;
    deleteMutation.mutate(
      { subject, curatorTgId: user.tg_id },
      {
        onSuccess: () => {
          setIsDeleteDrawerOpen(false);
          setDeleteInputText("");
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

  const slots = Array.from({ length: totalPositions }, (_, i) => {
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
        <DrawerContent className="max-w-lg mx-auto rounded-t-3xl border-0 p-0">
          <DrawerHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                {subject}
              </DrawerTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                {isCreator && (
                  <Badge variant="subtle">
                    Создатель
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"
                  onClick={() => {
                    if (!subject) return;
                    navigator.clipboard.writeText(subject);
                    haptic.light();
                    toast.info("Название скопировано");
                  }}
                  title="Скопировать название"
                  aria-label="Скопировать название"
                >
                  <Copy size={16} />
                </Button>
              </div>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground font-medium mt-1">
              {isCreator
                ? "Вы создали эту очередь. Нажмите на участника, чтобы исключить его."
                : myPosition
                ? "Нажмите на любого участника для предложения обмена местами."
                : "Выберите свободный номер или нажмите кнопку ниже."}
            </DrawerDescription>
          </DrawerHeader>

          {/* Kick Confirmation Bar */}
          {selectedSlotForKick && isCreator && (
            <div className="mx-6 mb-3 bg-destructive/10 rounded-2xl p-3.5 flex items-center justify-between text-xs animate-in fade-in">
              <span className="font-semibold text-destructive">
                Исключить {selectedSlotForKick.name} (место {selectedSlotForKick.pos})?
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" className="h-8 rounded-xl px-3" onClick={handleKickConfirm}>
                  Исключить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-xl"
                  onClick={() => setSelectedSlotForKick(null)}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Slots Container */}
          <div className="flex flex-col gap-4 px-6 py-2 max-h-[50vh] min-h-[260px] overflow-y-auto no-scrollbar">
            {isErrorQueue ? (
              <RetryBanner
                message="Ошибка загрузки слотов"
                onRetry={() => refetchQueue()}
              />
            ) : isLoading ? (
              <div className="grid grid-cols-5 gap-2.5 py-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-1">
                  <span>Список мест</span>
                  <span>
                    Занято {queueData?.taken_positions || 0} из {totalPositions}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2.5 pb-2">
                  {slots.map((slot) => {
                    let bgClass = "bg-secondary text-muted-foreground hover:bg-secondary/80";
                    if (slot.isMe) {
                      bgClass = "bg-primary text-primary-foreground font-semibold";
                    } else if (!slot.isFree) {
                      bgClass = "bg-card text-foreground hover:bg-secondary font-medium";
                    }

                    return (
                      <button
                        key={slot.pos}
                        onClick={() =>
                          handleSlotClick(slot.pos, slot.isFree, slot.tgId, slot.name)
                        }
                        className={`flex flex-col items-center justify-center p-2.5 rounded-2xl min-h-[58px] transition-all duration-150 active:scale-95 text-center select-none ${bgClass}`}
                      >
                        <span className="text-sm font-bold leading-none">{slot.pos}</span>
                        <span className="text-[10px] truncate max-w-full mt-1.5 opacity-80 font-medium">
                          {slot.isMe ? "Вы" : slot.isFree ? "Свободно" : slot.name?.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <DrawerFooter className="px-6 pt-5 pb-12 mb-3 flex flex-col gap-3">
            {/* Creator actions */}
            {isCreator && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-2xl h-11 text-xs font-semibold gap-1.5"
                  onClick={() => setIsDirectSwapOpen(true)}
                  disabled={!queueData?.taken_positions || queueData.taken_positions < 2}
                  disabledReason={
                    !queueData?.taken_positions || queueData.taken_positions < 2
                      ? "Нужно минимум 2 участника для прямого обмена"
                      : undefined
                  }
                >
                  <ArrowsLeftRight size={16} weight="bold" />
                  Обмен мест
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-2xl h-11 text-xs font-semibold gap-1.5"
                  onClick={() => setIsDeleteDrawerOpen(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash size={16} weight="bold" />
                  Удалить очередь
                </Button>
              </div>
            )}

            {/* Student actions: Quick join or leave */}
            <div className="flex items-center gap-2.5 w-full">
              {!myPosition ? (
                <Button
                  variant="default"
                  className="flex-1 rounded-2xl h-12 text-sm font-semibold gap-2"
                  onClick={handleQuickJoinFirst}
                  disabled={joinMutation.isPending || queueData?.taken_positions === totalPositions}
                  disabledReason={
                    queueData?.taken_positions === totalPositions
                      ? "Все места в этой очереди уже заняты"
                      : undefined
                  }
                >
                  <UserPlus size={18} weight="bold" />
                  Занять свободное (место {firstFreeSlot})
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="flex-1 rounded-2xl h-12 text-sm font-semibold"
                  onClick={handleLeave}
                  disabled={leaveMutation.isPending}
                >
                  Покинуть место {myPosition}
                </Button>
              )}

              <DrawerClose asChild>
                <Button variant="secondary" className="px-5 rounded-2xl h-12 text-sm font-medium">
                  Закрыть
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Separate Dedicated Delete Confirmation Drawer */}
      <Drawer
        open={isDeleteDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDrawerOpen(false);
            setDeleteInputText("");
          }
        }}
      >
        <DrawerContent className="max-w-lg mx-auto rounded-t-3xl border-0 p-0">
          <DrawerHeader className="px-6 pt-6 pb-2 text-center sm:text-left">
            <DrawerTitle className="text-xl font-bold tracking-tight text-destructive">
              Удаление очереди
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground font-medium mt-1">
              Очередь «{subject}» будет безвозвратно удалена, а все участники потеряют свои места.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 py-4 flex flex-col gap-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Для подтверждения введите слово «удалить»
            </label>
            <input
              type="text"
              placeholder="удалить"
              value={deleteInputText}
              onChange={(e) => setDeleteInputText(e.target.value)}
              className="w-full bg-secondary rounded-2xl px-4 py-3.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-destructive/30 border-0 outline-none"
              autoFocus
            />
          </div>

          <DrawerFooter className="px-6 pt-4 pb-12 mb-3 flex flex-col gap-3">
            <Button
              variant="destructive"
              className="w-full rounded-2xl h-12 text-sm font-semibold"
              onClick={handleDeleteConfirm}
              disabled={deleteInputText.trim().toLowerCase() !== "удалить" || deleteMutation.isPending}
              disabledReason="Введите слово «удалить»"
            >
              {deleteMutation.isPending ? "Удаление..." : "Подтвердить удаление"}
            </Button>
            <DrawerClose asChild>
              <Button variant="secondary" className="w-full rounded-2xl h-12 text-sm font-medium">
                Отмена
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
