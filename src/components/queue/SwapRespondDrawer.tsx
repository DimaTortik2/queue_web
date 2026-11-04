import { useState } from "react";
import { Check, X, ArrowRight } from "@phosphor-icons/react";
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
import { useAcceptSwapMutation, useRejectSwapMutation } from "@/hooks/useQueueApi";
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
  const [replyMessage, setReplyMessage] = useState("");

  const acceptMutation = useAcceptSwapMutation();
  const rejectMutation = useRejectSwapMutation();

  if (!request) return null;

  const handleAccept = () => {
    if (!user?.tg_id) return;
    acceptMutation.mutate(
      {
        requestId: request.id,
        subject: request.subject,
        data: {
          tg_id: user.tg_id,
          message: replyMessage.trim(),
        },
      },
      {
        onSuccess: () => {
          setReplyMessage("");
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
          message: replyMessage.trim(),
        },
      },
      {
        onSuccess: () => {
          setReplyMessage("");
          onClose();
        },
      }
    );
  };

  const isPending = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Предложение обмена местами</DrawerTitle>
          <DrawerDescription>{request.subject}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-5 py-2 max-h-[50vh] overflow-y-auto select-none">
          {/* Exchange preview card */}
          <div className="bg-secondary/40 rounded-2xl p-4 flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Параметры обмена</span>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                {request.from_name || `ID ${request.from_tg_id}`}
              </span>
              <div className="flex items-center gap-2 font-medium">
                <span>#{request.from_position}</span>
                <ArrowRight size={14} className="text-muted-foreground" />
                <span>#{request.to_position} (Вы)</span>
              </div>
            </div>

            {request.message && (
              <div className="mt-1 bg-secondary/60 rounded-xl p-3 text-xs text-foreground/90 italic">
                "{request.message}"
              </div>
            )}
          </div>

          {/* Reply message input */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-xs text-muted-foreground">
              Ответное сообщение (необязательно)
            </label>
            <input
              type="text"
              placeholder="Например: договорились или не могу уступить"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-xs focus:outline-none focus:bg-secondary/70 transition-all placeholder:text-muted-foreground/50 text-foreground"
            />
          </div>
        </div>

        <DrawerFooter>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="default"
              onClick={handleAccept}
              disabled={isPending}
            >
              <Check size={16} weight="bold" />
              Принять
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
            >
              <X size={16} weight="bold" />
              Отклонить
            </Button>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost">Закрыть</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
