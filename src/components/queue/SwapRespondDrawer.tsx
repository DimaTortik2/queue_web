import { ArrowsLeftRight, Check, X } from "@phosphor-icons/react";
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
import { useUserStore } from "@/store/userStore";
import { useAcceptSwapMutation, useQueueDetail, useRejectSwapMutation } from "@/hooks/useQueueApi";
import { formatQueueDate } from "@/lib/dateUtils";
import { SwapRequestInfo } from "@/types";

interface SwapRespondDrawerProps {
  request: SwapRequestInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SwapRespondDrawer({
  request,
  isOpen,
  onClose,
}: SwapRespondDrawerProps) {
  const { user } = useUserStore();

  const acceptMutation = useAcceptSwapMutation();
  const rejectMutation = useRejectSwapMutation();
  const { data: queue } = useQueueDetail(isOpen ? request?.subject ?? null : null);

  if (!request) return null;

  const handleAccept = () => {
    if (!user?.tg_id) return;
    acceptMutation.mutate(
      {
        requestId: request.id,
        subject: request.subject,
        data: {
          tg_id: user.tg_id,
          message: "",
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const handleReject = () => {
    if (!user?.tg_id) return;
    rejectMutation.mutate(
      {
        requestId: request.id,
        subject: request.subject,
        data: {
          tg_id: user.tg_id,
          message: "",
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const isPending = acceptMutation.isPending || rejectMutation.isPending;
  const queueLabel = queue?.subject === request.subject && queue.subject_name
    ? [queue.subject_name, queue.queue_type, formatQueueDate(queue.queue_date)].filter(Boolean).join(' • ')
    : request.subject.includes(':') ? request.subject.replace(':', ' • ') : 'Очередь';

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Предложение обмена местами</DrawerTitle>
          <DrawerDescription>
            {queueLabel}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-6 py-2 max-h-[50vh] overflow-y-auto select-none">
          {/* Exchange preview card */}
          <div className="bg-secondary/40 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs text-muted-foreground font-medium">Параметры обмена</span>
            
            <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3">
              {/* Requester current position */}
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-background/70">
                <span className="text-xs text-muted-foreground font-medium truncate max-w-full">
                  {request.from_name || `ID ${request.from_tg_id}`}
                </span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  #{request.from_position}
                </span>
                <span className="text-[10px] text-muted-foreground/75 mt-0.5">
                  Его текущее
                </span>
              </div>

              {/* Direction / Swap icon */}
              <div className="flex flex-col items-center justify-center text-primary shrink-0">
                <ArrowsLeftRight size={22} weight="bold" />
              </div>

              {/* Target / My position */}
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-primary/10">
                <span className="text-xs text-primary font-bold">
                  Вы
                </span>
                <span className="text-lg font-bold text-primary mt-0.5">
                  #{request.to_position}
                </span>
                <span className="text-[10px] text-primary/75 mt-0.5">
                  Куда хочет
                </span>
              </div>
            </div>

            <p className="text-[11px] text-center text-muted-foreground leading-relaxed pt-0.5">
              В случае согласия вы перейдете на <b>место #{request.from_position}</b>, а {request.from_name || 'участник'} займет ваше <b>место #{request.to_position}</b>.
            </p>

            {request.message && (
              <div className="bg-secondary/70 rounded-xl p-3 text-xs text-foreground font-medium italic">
                "{request.message}"
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="px-6 pt-3 pb-12 mb-3 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              variant="default"
              className="rounded-2xl h-12 text-xs font-semibold gap-1.5"
              onClick={handleAccept}
              disabled={isPending}
            >
              <Check size={16} weight="bold" />
              Принять
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl h-12 text-xs font-semibold gap-1.5"
              onClick={handleReject}
              disabled={isPending}
            >
              <X size={16} weight="bold" />
              Отклонить
            </Button>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" className="rounded-2xl h-11 text-xs font-semibold">
              Закрыть
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
