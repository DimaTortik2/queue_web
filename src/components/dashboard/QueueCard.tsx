import { CalendarBlank, CheckCircle, CrownSimple, LockSimple, Trash } from "@phosphor-icons/react";
import { QueueMetaInfo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { QueuePinButton } from "@/components/queue/QueuePinButton";
import { formatAutoDeleteTime, formatQueueDate } from "@/lib/dateUtils";

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
      className="group relative flex flex-col gap-4 rounded-2xl bg-card p-5 transition-all duration-150 cursor-pointer select-none tap-press animate-list-item hover:bg-secondary/60 active:scale-[0.975]"
    >
      {/* Top Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        <div className="flex items-start gap-3 min-w-0">
          <QueuePinButton subject={queue.subject} className="p-1 -ml-1 mt-0.5" />

          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {queue.subject_name}
            </span>
            <h3 className="text-base font-semibold text-foreground tracking-tight truncate mt-0.5">
              {queue.queue_type}
            </h3>
          </div>
        </div>

        <div className="flex items-start gap-1.5 shrink-0">
          {isCreator && (
            <CrownSimple size={18} weight="fill" role="img" alt="Создатель очереди" className="mt-0.5 shrink-0 text-primary" />
          )}
          <div className="flex flex-col items-end gap-1.5">
            {queue.is_paused && (
              <Badge variant="warning" className="flex items-center gap-1">
                <LockSimple size={12} weight="bold" />
                Пауза
              </Badge>
            )}
            {isJoined && (
              <Badge className="whitespace-nowrap bg-primary text-primary-foreground">
                <CheckCircle size={13} weight="fill" className="shrink-0" />
                Моё место {myPosition}
              </Badge>
            )}
            {!queue.is_paused && !isJoined && (
              <Badge variant="success">
                Свободно {queue.total_positions - queue.taken_positions} мест
              </Badge>
            )}
          </div>
        </div>
        {queueDateLabel && (
          <time dateTime={queue.queue_date ?? undefined} className="col-span-2 flex items-center gap-1.5 whitespace-nowrap pl-8 text-xs font-medium text-muted-foreground">
            <CalendarBlank size={14} className="shrink-0" />
            {queueDateLabel}
          </time>
        )}
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
            <span className="flex items-center gap-1 shrink-0">
              <Trash size={13} weight="bold" />
              {autoDeleteLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
