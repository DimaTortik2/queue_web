import { useState } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
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
import { useDirectSwapMutation } from "@/hooks/useQueueApi";
import { useUserStore } from "@/store/userStore";
import { QueueResponse } from "@/types";

interface DirectSwapDrawerProps {
  subject: string | null;
  queueData?: QueueResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DirectSwapDrawer({
  subject,
  queueData,
  isOpen,
  onClose,
}: DirectSwapDrawerProps) {
  const { user } = useUserStore();
  const [pos1, setPos1] = useState<number | "">("");
  const [pos2, setPos2] = useState<number | "">("");

  const directSwapMutation = useDirectSwapMutation();

  const occupiedSlots =
    queueData?.queue?.filter((s) => !s.is_free) || [];

  const handleSwap = () => {
    if (!subject || typeof pos1 !== "number" || typeof pos2 !== "number") return;

    directSwapMutation.mutate(
      {
        subject,
        data: { position1: pos1, position2: pos2 },
      },
      {
        onSuccess: () => {
          onClose();
          setPos1("");
          setPos2("");
        },
      }
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Прямой обмен слотов (Куратор)</DrawerTitle>
          <DrawerDescription>
            Мгновенный обмен местами между двумя участниками без согласования.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-5 py-2 max-h-[50vh] overflow-y-auto select-none">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Первое место</label>
            <select
              value={pos1}
              onChange={(e) => setPos1(Number(e.target.value) || "")}
              className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-secondary/70 transition-all text-foreground"
            >
              <option value="">Выберите первое место</option>
              {occupiedSlots.map((s) => {
                const isMe = user?.tg_id && Number(s.tg_id) === Number(user.tg_id);
                return (
                  <option key={s.position} value={s.position}>
                    Место #{s.position}: {s.name || `ID ${s.tg_id}`}{isMe ? " (Вы)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Второе место</label>
            <select
              value={pos2}
              onChange={(e) => setPos2(Number(e.target.value) || "")}
              className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-secondary/70 transition-all text-foreground"
            >
              <option value="">Выберите второе место</option>
              {occupiedSlots.map((s) => {
                const isMe = user?.tg_id && Number(s.tg_id) === Number(user.tg_id);
                return (
                  <option key={s.position} value={s.position}>
                    Место #{s.position}: {s.name || `ID ${s.tg_id}`}{isMe ? " (Вы)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <DrawerFooter>
          <Button
            variant="default"
            onClick={handleSwap}
            disabled={
              directSwapMutation.isPending ||
              typeof pos1 !== "number" ||
              typeof pos2 !== "number" ||
              pos1 === pos2
            }
          >
            <ArrowsLeftRight size={16} />
            {directSwapMutation.isPending ? "Обмен..." : "Поменять местами"}
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost">Отмена</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
