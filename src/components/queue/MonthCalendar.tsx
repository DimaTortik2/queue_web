import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { haptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' });
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface MonthCalendarProps {
  month: Date;
  selectedDate: Date;
  today: Date;
  minDate?: Date;
  onMonthChange: (month: Date) => void;
  onSelect: (date: Date) => void;
}

function calendarDay(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function MonthCalendar({ month, selectedDate, today, minDate, onMonthChange, onSelect }: MonthCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (calendarDay(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = calendarDay(year, monthIndex + 1, 0).getDate();
  const previousMonth = calendarDay(year, monthIndex - 1, 1);
  const nextMonth = calendarDay(year, monthIndex + 1, 1);
  const minDay = minDate && calendarDay(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  const minMonth = minDate && calendarDay(minDate.getFullYear(), minDate.getMonth(), 1);

  const moveToMonth = (date: Date) => {
    haptic.selection();
    onMonthChange(date);
  };

  const monthButtonClass = 'flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-25 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span aria-live="polite" className="text-sm font-semibold text-foreground first-letter:uppercase">
          {monthFormatter.format(month)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={monthButtonClass}
            disabled={previousMonth.getFullYear() < 1 || Boolean(minMonth && previousMonth < minMonth)}
            onClick={() => moveToMonth(previousMonth)}
            aria-label="Предыдущий месяц"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            className={monthButtonClass}
            disabled={nextMonth.getFullYear() > 9999}
            onClick={() => moveToMonth(nextMonth)}
            aria-label="Следующий месяц"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 justify-items-center gap-x-1 gap-y-1.5">
        {weekdays.map((day) => (
          <span key={day} className="py-1 text-xs font-semibold text-muted-foreground">{day}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => <div key={`empty-${i}`} aria-hidden="true" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = calendarDay(year, monthIndex, i + 1);
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === today.toDateString();
          const disabled = Boolean(minDay && date < minDay);

          return (
            <button
              key={i + 1}
              type="button"
              disabled={disabled}
              aria-label={dayFormatter.format(date)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => {
                haptic.selection();
                onSelect(date);
              }}
              className={cn(
                'flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                disabled && 'cursor-not-allowed opacity-30',
                isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground enabled:hover:bg-secondary',
                isToday && !isSelected && 'bg-primary/15 text-accent-foreground',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
