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
import { Badge } from "@/components/ui/badge";
import { useQueueHistory, useQueueStats } from "@/hooks/useQueueApi";
import { Clock, ChartBar, UserCircle } from "@phosphor-icons/react";

interface QueueHistoryDrawerProps {
  subject: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QueueHistoryDrawer({
  subject,
  isOpen,
  onClose,
}: QueueHistoryDrawerProps) {
  const { data: statsData, isLoading: isLoadingStats } = useQueueStats(
    isOpen ? subject : null
  );
  const { data: historyData, isLoading: isLoadingHistory } = useQueueHistory(
    isOpen ? subject : null
  );

  const history = historyData?.history || [];

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "join":
        return <Badge variant="success">Запись</Badge>;
      case "leave":
        return <Badge variant="subtle">Выход</Badge>;
      case "advance":
        return <Badge variant="default">Сдача</Badge>;
      case "swap":
        return <Badge variant="secondary">Обмен</Badge>;
      case "kick":
        return <Badge variant="destructive">Исключение</Badge>;
      case "pause":
      case "resume":
        return <Badge variant="warning">Статус</Badge>;
      case "clear":
        return <Badge variant="destructive">Очистка</Badge>;
      default:
        return <Badge variant="subtle">{action}</Badge>;
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Статистика и история очереди</DrawerTitle>
          <DrawerDescription>{subject}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-5 py-2 max-h-[55vh] overflow-y-auto select-none">
          {/* Real-time Queue Stats Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ChartBar size={14} />
              Статистика очереди
            </span>

            {isLoadingStats ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Загрузка статистики...
              </div>
            ) : statsData ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/40 rounded-2xl p-3 flex flex-col">
                  <span className="text-[11px] text-muted-foreground">Занято</span>
                  <span className="text-base font-semibold">
                    {statsData.taken_positions} / {statsData.total_positions}
                  </span>
                </div>
                <div className="bg-secondary/40 rounded-2xl p-3 flex flex-col">
                  <span className="text-[11px] text-muted-foreground">Свободно</span>
                  <span className="text-base font-semibold">
                    {statsData.free_positions}
                  </span>
                </div>
                <div className="bg-secondary/40 rounded-2xl p-3 flex flex-col">
                  <span className="text-[11px] text-muted-foreground">Заполнено</span>
                  <span className="text-base font-semibold">
                    {statsData.occupancy_percent}%
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Activity Audit Trail */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock size={14} />
              Лента активности
            </span>

            {isLoadingHistory ? (
              <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
                <UserCircle size={24} className="animate-spin text-muted-foreground/50" />
                <span>Загрузка истории...</span>
              </div>
            ) : history.length > 0 ? (
              <div className="flex flex-col gap-2">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-secondary/30 rounded-2xl p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      {getActionBadge(item.action)}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {item.timestamp ? item.timestamp.slice(11, 16) : ""}
                      </span>
                    </div>
                    <span className="text-xs text-foreground/90">{item.details}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                История действий пуста
              </div>
            )}
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="secondary" className="w-full">
              Закрыть
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
