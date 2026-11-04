import React from "react";
import { Star } from "@phosphor-icons/react";
import { QueueMetaInfo } from "@/types";
import { Badge } from "@/components/ui/badge";

interface QueueCardProps {
  queue: QueueMetaInfo;
  myPosition?: number | null;
  isPinned?: boolean;
  onTogglePin?: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export function QueueCard({
  queue,
  myPosition,
  isPinned = false,
  onTogglePin,
  onClick,
}: QueueCardProps) {
  const occupancyPercent = Math.round((queue.taken_positions / queue.total_positions) * 100);

  return (
    <div
      onClick={onClick}
      className="bg-secondary/30 hover:bg-secondary/50 active:scale-[0.99] rounded-2xl p-4 flex flex-col gap-3 transition-all duration-150 cursor-pointer select-none"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-0.5 mt-0.5 transition-colors ${
                isPinned ? "text-amber-500" : "text-muted-foreground/40 hover:text-muted-foreground"
              }`}
              title={isPinned ? "Открепить" : "Закрепить в начале"}
              aria-label={isPinned ? "Открепить очередь" : "Закрепить очередь"}
            >
              <Star size={15} weight={isPinned ? "fill" : "regular"} />
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{queue.subject_name}</span>
            <span className="text-sm font-semibold tracking-tight">{queue.queue_type}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {queue.is_paused ? (
            <Badge variant="warning">Пауза</Badge>
          ) : myPosition ? (
            <Badge variant="default">Вы #{myPosition}</Badge>
          ) : (
            <Badge variant="subtle">Открыта</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full bg-secondary/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/70 rounded-full transition-all duration-300"
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Занято {queue.taken_positions} из {queue.total_positions}
          </span>
          <span>{occupancyPercent}%</span>
        </div>
      </div>
    </div>
  );
}
