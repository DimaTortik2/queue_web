import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { toast } from 'sonner';
import { QueueMetaInfo, QueueUserInfo } from '@/types';
import {
  Trash,
  X,
  ShareNetwork,
  ArrowsLeftRight,
  UserPlus,
  PencilSimple,
} from '@phosphor-icons/react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RetryBanner } from '@/components/ui/retry-banner';
import { haptic } from '@/lib/telegram';
import { copyQueueLink } from '@/lib/deepLink';
import { useUserStore } from '@/store/userStore';
import {
  useQueuesList,
  useQueueDetail,
  useMyPosition,
  useJoinQueueMutation,
  useLeaveQueueMutation,
  useCuratorDeleteQueueMutation,
  useCuratorKickMutation,
  useUpdateAutoDeleteMutation,
} from '@/hooks/useQueueApi';
import { useRoomSubscription } from '@/providers/WebSocketProvider';
import { DirectSwapDrawer } from '@/components/queue/DirectSwapDrawer';
import { SlotAvatar } from '@/components/ui/SlotAvatar';
import { formatAutoDeleteTime, parseMskIso } from '@/lib/dateUtils';
import { GoogleCalendarTimeDrawer } from '@/components/queue/GoogleCalendarTimeDrawer';

// ── Memoized Slot Button to avoid re-rendering all 30 on every state change ──
interface SlotButtonProps {
  pos: number;
  isFree: boolean;
  isMe: boolean;
  name: string | null;
  tgId: number | null;
  photoUrl: string | null;
  userName: string | undefined;
  onSlotClick: (pos: number, isFree: boolean, tgId: number | null, name: string | null) => void;
}

const SlotButton = memo(function SlotButton({
  pos,
  isFree,
  isMe,
  name,
  tgId,
  photoUrl,
  userName,
  onSlotClick,
}: SlotButtonProps) {
  let bgClass = 'bg-secondary text-muted-foreground';
  if (isMe) {
    bgClass = 'bg-primary text-primary-foreground font-semibold';
  } else if (!isFree) {
    bgClass = 'bg-card text-foreground font-medium';
  }

  return (
    <button
      onClick={() => onSlotClick(pos, isFree, tgId, name)}
      className={`flex flex-col items-center justify-between p-2 rounded-2xl h-[66px] active:scale-95 text-center select-none transition-colors duration-100 ${bgClass}`}
    >
      <span className="text-xs font-bold leading-none">
        {pos}
      </span>

      {!isFree ? (
        <SlotAvatar
          photoUrl={photoUrl}
          name={isMe ? userName : name}
          isMe={isMe}
          className={isMe ? '!bg-white/20 !text-white' : ''}
        />
      ) : (
        <div className="w-5 h-5 shrink-0" />
      )}

      <span className="text-[10px] truncate max-w-full opacity-85 font-medium leading-tight">
        {isMe
          ? 'Вы'
          : isFree
            ? 'Свободно'
            : name?.split(' ')[0]}
      </span>
    </button>
  );
});

interface QueueSlotsModalProps {
  subject: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestSwap: (targetPos: number, candidateName: string) => void;
  initialMeta?: QueueMetaInfo;
}

export function QueueSlotsModal({
  subject,
  isOpen,
  onClose,
  onRequestSwap,
  initialMeta,
}: QueueSlotsModalProps) {
  const { user } = useUserStore();
  const [selectedSlotForKick, setSelectedSlotForKick] = useState<{
    pos: number;
    tgId: number;
    name: string;
  } | null>(null);

  const [isDeleteDrawerOpen, setIsDeleteDrawerOpen] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [isDirectSwapOpen, setIsDirectSwapOpen] = useState(false);

  // Defer WebSocket connection until after the drawer open animation settles (~300ms)
  const [wsReady, setWsReady] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setWsReady(false);
      return;
    }
    const id = setTimeout(() => setWsReady(true), 320);
    return () => clearTimeout(id);
  }, [isOpen]);

  useRoomSubscription(wsReady && subject ? subject : null);

  const { data: queuesData } = useQueuesList();
  const foundQueue = queuesData?.queues?.find((q) => q.subject === subject);
  const userKnownPos =
    initialMeta?.my_position !== undefined && initialMeta?.my_position !== null
      ? initialMeta.my_position
      : (foundQueue?.my_position ?? null);

  const currentMeta = foundQueue
    ? {
        ...initialMeta,
        ...foundQueue,
        my_position: userKnownPos,
      }
    : initialMeta;

  const {
    data: queueData,
    isError: isErrorQueue,
    refetch: refetchQueue,
  } = useQueueDetail(isOpen ? subject : null);
  const { data: myPosData } = useMyPosition(isOpen ? subject : null, user?.tg_id);

  // Auto-close modal ONLY if queue existed while open and was subsequently deleted
  const hasLoadedInitialMeta = useRef(false);

  useEffect(() => {
    if (isOpen && currentMeta) {
      hasLoadedInitialMeta.current = true;
    }
    if (!isOpen) {
      hasLoadedInitialMeta.current = false;
    }
  }, [isOpen, currentMeta]);

  useEffect(() => {
    if (
      isOpen &&
      subject &&
      hasLoadedInitialMeta.current &&
      queuesData?.queues &&
      queuesData.queues.length > 0 &&
      !currentMeta
    ) {
      toast.info('Очередь была удалена');
      onClose();
    }
  }, [isOpen, subject, queuesData, currentMeta, onClose]);

  const joinMutation = useJoinQueueMutation();
  const leaveMutation = useLeaveQueueMutation();
  const deleteMutation = useCuratorDeleteQueueMutation();
  const kickMutation = useCuratorKickMutation();
  const updateAutoDeleteMutation = useUpdateAutoDeleteMutation();

  const [isAutoDeleteDrawerOpen, setIsAutoDeleteDrawerOpen] = useState(false);

  const isCreator = user?.tg_id
    ? currentMeta?.created_by_tg_id === user.tg_id
    : false;
  const myPosition = myPosData?.position ?? userKnownPos;
  const totalPositions =
    queueData?.total_positions || currentMeta?.total_positions || 30;

  // First available free slot
  const firstFreeSlot = queueData?.queue?.find((s) => s.is_free)?.position || 1;

  const handleSlotClick = useCallback(
    (
      slotPos: number,
      isFree: boolean,
      slotUserId?: number | null,
      name?: string | null,
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
        toast.info(
          `Вы уже записаны на место ${myPosition}. Сначала освободите его, чтобы сменить.`,
        );
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
        toast.info('Займите свободное место, чтобы предлагать обмен');
        return;
      }
    },
    [myPosition, user?.tg_id, subject, isCreator, joinMutation, onRequestSwap],
  );

  const handleQuickJoinFirst = useCallback(() => {
    if (!subject || !user?.tg_id || myPosition) return;
    haptic.selection();
    joinMutation.mutate({
      subject,
      data: { tg_id: user.tg_id, position: firstFreeSlot },
    });
  }, [subject, user?.tg_id, myPosition, joinMutation, firstFreeSlot]);

  const handleLeave = useCallback(() => {
    if (!subject || !user?.tg_id || !myPosition) return;
    leaveMutation.mutate({
      subject,
      data: { tg_id: user.tg_id, position: myPosition },
    });
  }, [subject, user?.tg_id, myPosition, leaveMutation]);

  const handleDeleteConfirm = useCallback(() => {
    if (!subject || !user?.tg_id) return;
    deleteMutation.mutate(
      { subject, curatorTgId: user.tg_id },
      {
        onSuccess: () => {
          setIsDeleteDrawerOpen(false);
          setDeleteInputText('');
          onClose();
        },
      },
    );
  }, [subject, user?.tg_id, deleteMutation, onClose]);

  const handleKickConfirm = useCallback(() => {
    if (!subject || !user?.tg_id || !selectedSlotForKick) return;
    kickMutation.mutate({
      subject,
      data: {
        curator_tg_id: user.tg_id,
        target_tg_id: selectedSlotForKick.tgId,
      },
    });
    setSelectedSlotForKick(null);
  }, [subject, user?.tg_id, selectedSlotForKick, kickMutation]);

  const colonIdx = subject ? subject.indexOf(':') : -1;
  const subjectName =
    currentMeta?.subject_name ||
    (subject && colonIdx !== -1 ? subject.slice(0, colonIdx).trim() : null);
  const autoDeleteLabel = formatAutoDeleteTime(currentMeta?.auto_delete_at);
  const parsedAutoDelete = currentMeta?.auto_delete_at
    ? parseMskIso(currentMeta.auto_delete_at)
    : null;
  const queueType =
    currentMeta?.queue_type ||
    (subject && colonIdx !== -1 ? subject.slice(colonIdx + 1).trim() : null);

  // Build a lookup Map once, then generate slots in O(n) instead of O(n×m)
  const slots = useMemo(() => {
    const queueMap = new Map<number, QueueUserInfo>();
    if (queueData?.queue) {
      for (const s of queueData.queue) {
        queueMap.set(s.position, s);
      }
    }

    return Array.from({ length: totalPositions }, (_, i) => {
      const pos = i + 1;
      const existing = queueMap.get(pos);
      const isFree = existing ? existing.is_free : (myPosition !== pos);
      const isMe = !isFree
        ? (existing?.tg_id === user?.tg_id || myPosition === pos)
        : (myPosition === pos);
      return {
        pos,
        isFree: isMe ? false : isFree,
        isMe,
        name: isMe ? user?.name || existing?.name || null : existing?.name || null,
        tgId: isMe ? user?.tg_id || existing?.tg_id || null : existing?.tg_id || null,
        photoUrl: isMe
          ? user?.photo_url || existing?.photo_url || null
          : existing?.photo_url || null,
      };
    });
  }, [totalPositions, queueData, user?.tg_id, user?.name, user?.photo_url, myPosition]);

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-w-lg mx-auto rounded-t-3xl border-0 p-0 overflow-hidden w-full">
          <DrawerHeader className="px-6 pt-6 pb-2 w-full min-w-0 max-w-full overflow-hidden !flex !flex-col">
            <div className="flex items-center justify-between gap-3 w-full min-w-0">
              <DrawerTitle className="text-xl font-bold tracking-tight text-foreground truncate text-left flex-1 min-w-0">
                {subjectName || subject}
              </DrawerTitle>
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {isCreator && <Badge variant="subtle">Создатель</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl shrink-0"
                  onClick={async () => {
                    if (!subject) return;
                    try {
                      await copyQueueLink(subject);
                      haptic.light();
                      toast.success('Ссылка на очередь скопирована');
                    } catch {
                      haptic.error();
                      toast.error('Не удалось скопировать ссылку');
                    }
                  }}
                  title="Скопировать ссылку"
                  aria-label="Скопировать ссылку"
                >
                  <ShareNetwork size={16} />
                </Button>
              </div>
            </div>

            {/* Row with Queue Type subtitle and Occupancy Counter */}
            <div className="flex items-center justify-between gap-3 mt-1.5 w-full min-w-0">
              <span className="text-sm font-medium text-muted-foreground truncate min-w-0 flex-1 text-left">
                {queueType || ''}
              </span>
              <span className="text-xs text-muted-foreground font-medium shrink-0 whitespace-nowrap ml-auto">
                Занято {queueData?.taken_positions ?? currentMeta?.taken_positions ?? 0} из {totalPositions}
              </span>
            </div>
            {/* Auto Delete Badge / Button */}
            {isCreator ? (
              autoDeleteLabel ? (
                <button
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setIsAutoDeleteDrawerOpen(true);
                  }}
                  className="flex items-center gap-1.5 mt-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 active:scale-95 transition-colors rounded-xl px-3 py-1.5 w-fit select-none"
                  title="Нажмите, чтобы изменить или отключить автоудаление"
                >
                  <Trash size={13} weight="bold" />
                  <span>{autoDeleteLabel}</span>
                  <PencilSimple size={12} weight="bold" className="opacity-70 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setIsAutoDeleteDrawerOpen(true);
                  }}
                  className="flex items-center gap-1.5 mt-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 active:scale-95 transition-colors rounded-xl px-3 py-1.5 w-fit select-none"
                  title="Указать время автоудаления очереди"
                >
                  <Trash size={13} weight="bold" />
                  <span>Указать автоудаление</span>
                </button>
              )
            ) : (
              autoDeleteLabel && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-primary bg-primary/10 rounded-xl px-3 py-1.5 w-fit select-none">
                  <Trash size={13} weight="bold" />
                  <span>{autoDeleteLabel}</span>
                </div>
              )
            )}
          </DrawerHeader>

          {/* Kick Confirmation Bar */}
          {selectedSlotForKick && isCreator && (
            <div className="mx-6 mb-3 bg-destructive/10 rounded-2xl p-3.5 flex items-center justify-between text-xs animate-in fade-in">
              <span className="font-semibold text-destructive">
                Исключить {selectedSlotForKick.name} (место{' '}
                {selectedSlotForKick.pos})?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 rounded-xl px-3"
                  onClick={handleKickConfirm}
                >
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
            ) : (
              <div className="grid grid-cols-5 gap-2.5 pb-2 pt-1">
                {slots.map((slot) => (
                  <SlotButton
                    key={slot.pos}
                    pos={slot.pos}
                    isFree={slot.isFree}
                    isMe={slot.isMe}
                    name={slot.name}
                    tgId={slot.tgId}
                    photoUrl={slot.photoUrl}
                    userName={user?.name}
                    onSlotClick={handleSlotClick}
                  />
                ))}
              </div>
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
                  disabled={
                    (queueData?.taken_positions ?? currentMeta?.taken_positions ?? 0) < 2
                  }
                  disabledReason={
                    (queueData?.taken_positions ?? currentMeta?.taken_positions ?? 0) < 2
                      ? 'Нужно минимум 2 участника для прямого обмена'
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
                  disabled={
                    joinMutation.isPending ||
                    queueData?.taken_positions === totalPositions
                  }
                  disabledReason={
                    queueData?.taken_positions === totalPositions
                      ? 'Все места в этой очереди уже заняты'
                      : undefined
                  }
                >
                  <UserPlus size={18} weight="bold" />
                  Занять свободное
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
                <Button
                  variant="secondary"
                  className="px-5 rounded-2xl h-12 text-sm font-medium"
                >
                  Закрыть
                </Button>
              </DrawerClose>
            </div>

            {/* Auto-Delete Time Editor for Creator */}
            {isCreator && isAutoDeleteDrawerOpen && (
              <GoogleCalendarTimeDrawer
                isOpen={isAutoDeleteDrawerOpen}
                onClose={() => setIsAutoDeleteDrawerOpen(false)}
                initialDate={parsedAutoDelete?.date}
                initialTime={parsedAutoDelete?.time}
                onConfirm={(_date, _time, isoString) => {
                  if (!subject || !user?.tg_id) return;
                  updateAutoDeleteMutation.mutate({
                    subject,
                    data: {
                      curator_tg_id: user.tg_id,
                      auto_delete_at: isoString,
                    },
                  });
                }}
                onClear={
                  currentMeta?.auto_delete_at
                    ? () => {
                        if (!subject || !user?.tg_id) return;
                        updateAutoDeleteMutation.mutate({
                          subject,
                          data: {
                            curator_tg_id: user.tg_id,
                            auto_delete_at: null,
                          },
                        });
                      }
                    : undefined
                }
              />
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Separate Dedicated Delete Confirmation Drawer */}
      {isDeleteDrawerOpen && (
        <Drawer
          open={isDeleteDrawerOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsDeleteDrawerOpen(false);
              setDeleteInputText('');
            }
          }}
        >
          <DrawerContent className="max-w-lg mx-auto rounded-t-3xl border-0 p-0">
            <DrawerHeader className="px-6 pt-6 pb-2 text-center sm:text-left">
              <DrawerTitle className="text-xl font-bold tracking-tight text-destructive">
                Удаление очереди
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground font-medium mt-1 text-left">
                Очередь «{subject}» будет безвозвратно удалена, а все участники
                потеряют свои места.
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
                disabled={
                  deleteInputText.trim().toLowerCase() !== 'удалить' ||
                  deleteMutation.isPending
                }
                disabledReason="Введите слово «удалить»"
              >
                {deleteMutation.isPending
                  ? 'Удаление...'
                  : 'Подтвердить удаление'}
              </Button>
              <DrawerClose asChild>
                <Button
                  variant="secondary"
                  className="w-full rounded-2xl h-12 text-sm font-medium"
                >
                  Отмена
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Direct Curator Swap Drawer */}
      {isDirectSwapOpen && (
        <DirectSwapDrawer
          subject={subject}
          queueData={queueData}
          isOpen={isDirectSwapOpen}
          onClose={() => setIsDirectSwapOpen(false)}
        />
      )}
    </>
  );
}
