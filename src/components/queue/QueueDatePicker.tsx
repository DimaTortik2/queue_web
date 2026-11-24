import { useId, useState } from 'react';
import { CalendarBlank, CaretDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerNestedRoot, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { MonthCalendar } from '@/components/queue/MonthCalendar';
import { formatQueueDate } from '@/lib/dateUtils';
import { haptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

interface QueueDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  required: boolean;
}

function toQueueDate(date: Date) {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function QueueDatePicker({ value, onChange, required }: QueueDatePickerProps) {
  const labelId = useId();
  const valueId = useId();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(() => new Date());
  const [month, setMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const formattedValue = formatQueueDate(value);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const now = new Date();
      const current = formattedValue ? new Date(`${value}T12:00:00`) : now;
      setToday(now);
      setSelectedDate(current);
      setMonth(current);
      haptic.selection();
    }
    setOpen(nextOpen);
  }

  return (
    <DrawerNestedRoot open={open} onOpenChange={handleOpenChange} autoFocus>
      <div className="flex flex-col gap-1.5">
        <span id={labelId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Дата очереди
        </span>
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            aria-labelledby={`${labelId} ${valueId}`}
            className="min-h-12 w-full justify-start rounded-2xl px-4 py-3.5 text-sm focus-visible:bg-accent focus-visible:outline-none"
          >
            <CalendarBlank size={18} weight="bold" className="shrink-0 text-muted-foreground" />
            <span id={valueId} className={cn('truncate', !formattedValue && 'text-muted-foreground')}>
              {formattedValue ?? 'Выберите дату'}
            </span>
            <CaretDown size={14} weight="bold" className="ml-auto shrink-0 text-muted-foreground" />
          </Button>
        </DrawerTrigger>
      </div>

      <DrawerContent aria-describedby={undefined} className="z-[70] max-h-[85dvh] p-0">
        <DrawerHeader className="shrink-0 px-6 pt-5 pb-2 text-left">
          <DrawerTitle className="text-xl font-bold">Выберите дату очереди</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto px-6 py-2">
          <MonthCalendar month={month} selectedDate={selectedDate} today={today} onMonthChange={setMonth} onSelect={setSelectedDate} />
        </div>
        <DrawerFooter
          className="mb-0 shrink-0 gap-2.5 px-6 pt-3"
          style={{ paddingBottom: `calc(1.5rem + max(
            env(safe-area-inset-bottom, 0px),
            var(--tg-safe-area-inset-bottom, 0px) + var(--tg-content-safe-area-inset-bottom, 0px)
          ))` }}
        >
          <div className="flex items-center justify-between">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                haptic.selection();
                setMonth(today);
                setSelectedDate(today);
              }}
            >
              Сегодня
            </Button>
            {!required && value && (
              <DrawerClose asChild>
                <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onChange('')}>
                  Убрать дату
                </Button>
              </DrawerClose>
            )}
          </div>
          <div className="flex gap-2.5">
            <DrawerClose asChild>
              <Button type="button" variant="secondary" className="h-12 flex-1 rounded-2xl">Отмена</Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button type="button" className="h-12 flex-1 rounded-2xl" onClick={() => onChange(toQueueDate(selectedDate))}>
                Выбрать
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </DrawerNestedRoot>
  );
}
