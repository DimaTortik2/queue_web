import React from "react";
import { Star, LockSimple, Trash } from "@phosphor-icons/react";
import { QueueMetaInfo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatAutoDeleteTime } from "@/lib/dateUtils";

interface QueueCardProps {
  queue: QueueMetaInfo;
  isCreator?: boolean;
  myPosition?: number | null;
  isPinned?: boolean;
  onTogglePin?: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export function QueueCard({
  queue,
  isCreator,
  myPosition,
  isPinned = false,
  onTogglePin,
  onClick,
}: QueueCardProps) {
  const occupancyPercent = queue.total_positions > 0
    ? Math.round((queue.taken_positions / queue.total_positions) * 100)
    : 0;

  const autoDeleteLabel = formatAutoDeleteTime(queue.auto_delete_at);

  return (
    <div
      onClick={onClick}
      className="group relative bg-card hover:bg-secondary/60 active:scale-[0.975] rounded-2xl p-5 flex flex-col gap-4 transition-all duration-150 cursor-pointer select-none tap-press animate-list-item shadow-sm hover:shadow"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1 -ml-1 mt-0.5 rounded-lg transition-colors ${
                isPinned
                  ? "text-amber-500"
                  : "text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted"
              }`}
              title={isPinned ? "Открепить" : "Закрепить"}
              aria-label={isPinned ? "Открепить" : "Закрепить"}
            >
              <Star size={18} weight={isPinned ? "fill" : "regular"} />
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {queue.subject_name}
            </span>
            <h3 className="text-base font-semibold text-foreground tracking-tight truncate mt-0.5">
              {queue.queue_type}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isCreator && (
            <Badge variant="subtle">
              Создатель
            </Badge>
          )}
          {queue.is_paused ? (
            <Badge variant="warning" className="flex items-center gap-1">
              <LockSimple size={12} weight="bold" />
              Пауза
            </Badge>
          ) : myPosition ? (
            <Badge variant="default">Место {myPosition}</Badge>
          ) : (
            <Badge variant="success">
              Свободно {queue.total_positions - queue.taken_positions} мест
            </Badge>
          )}
        </div>
      </div>

      {/* Progress & Occupancy Info */}
      <div className="flex flex-col gap-2">
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium gap-2">
          <span>
            Занято {queue.taken_positions} из {queue.total_positions} мест
          </span>
          {autoDeleteLabel && (
            <span className="flex items-center gap-1 text-[11px] text-primary font-semibold shrink-0">
              <Trash size={13} weight="bold" />
              {autoDeleteLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
