import { WarningCircle, ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface RetryBannerProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function RetryBanner({
  message = "Не удалось загрузить данные",
  onRetry,
  isRetrying = false,
}: RetryBannerProps) {
  return (
    <div className="bg-secondary/40 rounded-2xl p-4 flex items-center justify-between gap-3 select-none">
      <div className="flex items-center gap-2.5">
        <WarningCircle size={18} className="text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>
      <Button
        size="sm"
        variant="subtle"
        onClick={onRetry}
        disabled={isRetrying}
        className="text-xs h-7 px-2.5 shrink-0"
      >
        <ArrowsClockwise
          size={12}
          className={isRetrying ? "animate-spin" : ""}
          weight="bold"
        />
        Повторить
      </Button>
    </div>
  );
}
