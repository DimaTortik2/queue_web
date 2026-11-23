import { CalendarBlank, LockSimple, Trash } from "@phosphor-icons/react";
import { QueueMetaInfo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { QueuePinButton } from "@/components/queue/QueuePinButton";
import { formatAutoDeleteTime, formatQueueDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface QueueCardProps {
  queue: QueueMetaInfo;
  isCreator?: boolean;
  onClick: () => void;
}

export function QueueCard({
  queue,
  isCreator,
  onClick,
}: QueueCardProps) {
  const occupancyPercent = queue.total_positions > 0
    ? Math.round((queue.taken_positions / queue.total_positions) * 100)
    : 0;

  const autoDeleteLabel = formatAutoDeleteTime(queue.auto_delete_at);
  const queueDateLabel = formatQueueDate(queue.queue_date);
  const myPosition = queue.my_position;
  const isJoined = myPosition != null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative active:scale-[0.975] rounded-2xl p-5 flex flex-col gap-4 transition-all duration-150 cursor-pointer select-none tap-press animate-list-item shadow-sm hover:shadow",
        isJoined ? "bg-accent hover:bg-accent/70 ring-1 ring-inset ring-primary/30" : "bg-card hover:bg-secondary/60",
      )}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <QueuePinButton subject={queue.subject} className="p-1 -ml-1 mt-0.5" />

          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {queue.subject_name}
            </span>
            <h3 className="text-base font-semibold text-foreground tracking-tight truncate mt-0.5">
              {queue.queue_type}
            </h3>
            {queueDateLabel && (
              <time dateTime={queue.queue_date ?? undefined} className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarBlank size={14} className="shrink-0" />
                {queueDateLabel}
              </time>
            )}
          </div>
        </div>

        <div className="flex items-start gap-1.5 shrink-0">
          {isCreator && (
            <Badge variant="subtle">
              Создатель
            </Badge>
          )}
          <div className="flex flex-col items-end gap-1.5">
            {queue.is_paused && (
              <Badge variant="warning" className="flex items-center gap-1">
                <LockSimple size={12} weight="bold" />
                Пауза
              </Badge>
            )}
            {isJoined && <Badge variant="default">Моё место {myPosition}</Badge>}
            {!queue.is_paused && !isJoined && (
              <Badge variant="success">
                Свободно {queue.total_positions - queue.taken_positions} мест
              </Badge>
            )}
          </div>
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
