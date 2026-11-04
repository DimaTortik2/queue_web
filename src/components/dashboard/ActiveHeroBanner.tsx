import { Clock, ArrowsLeftRight } from "@phosphor-icons/react";
import { QueueMetaInfo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/telegram";
import { useMyPosition } from "@/hooks/useQueueApi";

interface ActiveHeroBannerProps {
  queue: QueueMetaInfo;
  tgId?: number;
  myPosition?: number;
  onOpenQueue: () => void;
  onOpenSwap: () => void;
}

export function ActiveHeroBanner({
  queue,
  tgId,
  myPosition: initialPosition,
  onOpenQueue,
  onOpenSwap,
}: ActiveHeroBannerProps) {
  const { data: myPosData } = useMyPosition(queue.subject, tgId);

  const position = myPosData?.position ?? initialPosition ?? 1;
  const peopleAhead = myPosData?.people_ahead ?? Math.max(0, position - 1);
  const waitMinutes = myPosData?.estimated_wait_minutes ?? peopleAhead * 8;

  return (
    <div className="bg-secondary/40 rounded-3xl p-5 flex flex-col gap-3 transition-all select-none">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Ваша активная очередь</span>
          <span className="text-base font-semibold tracking-tight">{queue.subject}</span>
        </div>
        <Badge
          variant={myPosData?.is_next ? "success" : "default"}
          className="text-xs font-semibold px-3 py-1"
        >
          {myPosData?.is_next ? "Вы следующий!" : `Место #${position}`}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <Clock size={14} weight="bold" />
          <span>Ожидание ~{waitMinutes} мин</span>
        </div>
        <span>-</span>
        <span>Перед вами: {peopleAhead} чел</span>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          size="sm"
          variant="default"
          className="flex-1"
          onClick={() => {
            haptic.selection();
            onOpenQueue();
          }}
        >
          Открыть слоты
        </Button>
        <Button
          size="sm"
          variant="subtle"
          onClick={() => {
            haptic.light();
            onOpenSwap();
          }}
        >
          <ArrowsLeftRight size={14} />
          Обмен
        </Button>
      </div>
    </div>
  );
}
