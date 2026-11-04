import { Bell, CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useNotificationStore } from "@/store/notificationStore";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/telegram";

export function UrgentAlertBanner() {
  const { urgentAlert, dismissUrgentAlert } = useNotificationStore();

  if (!urgentAlert) return null;

  const handleDismiss = () => {
    haptic.light();
    dismissUrgentAlert();
  };

  const isYourTurn = urgentAlert.type === "your_turn";
  const isCompleted = urgentAlert.type === "submission_completed";

  let containerClass = "bg-amber-500/15 text-foreground";
  let title = "Ваша очередь";
  let Icon = Bell;

  if (isCompleted) {
    containerClass = "bg-emerald-500/15 text-foreground";
    title = "Сдача завершена";
    Icon = CheckCircle;
  } else if (!isYourTurn) {
    containerClass = "bg-rose-500/15 text-foreground";
    title = "Уведомление очереди";
    Icon = WarningCircle;
  }

  return (
    <div className="px-4 pt-2 select-none">
      <div
        className={`p-4 rounded-2xl flex flex-col gap-2 transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${containerClass}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Icon size={20} weight="bold" className="mt-0.5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-tight">{title}</span>
              {urgentAlert.subject && (
                <span className="text-[11px] opacity-80">{urgentAlert.subject}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs leading-relaxed opacity-95 pl-7">
          {urgentAlert.message}
        </p>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant="default"
            onClick={handleDismiss}
            className="text-xs h-7 px-3"
          >
            Понятно
          </Button>
        </div>
      </div>
    </div>
  );
}
