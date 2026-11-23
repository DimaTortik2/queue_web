import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Clock, CalendarBlank } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  DrawerNestedRoot,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { MonthCalendar } from '@/components/queue/MonthCalendar';
import { haptic } from '@/lib/telegram';
import { getDefaultMskDateTime, buildMskIsoString } from '@/lib/dateUtils';

interface GoogleCalendarTimeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialTime?: string;
  onConfirm: (date: Date, time: string, isoString: string) => void;
  onClear?: () => void;
}

export function GoogleCalendarTimeDrawer({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  onConfirm,
  onClear,
}: GoogleCalendarTimeDrawerProps) {
  const now = useMemo(() => new Date(), []);

  // 'date' | 'time'
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');

  // Selected date
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDate) return new Date(initialDate);
    return getDefaultMskDateTime().date;
  });

  // Numeric hour & minute
  const [hour, setHour] = useState<number>(() => {
    if (initialTime) {
      const h = parseInt(initialTime.split(':')[0], 10);
      if (!isNaN(h)) return h;
    }
    const def = getDefaultMskDateTime();
    return parseInt(def.time.split(':')[0], 10);
  });

  const [minute, setMinute] = useState<number>(() => {
    if (initialTime) {
      const m = parseInt(initialTime.split(':')[1], 10);
      if (!isNaN(m)) return m;
    }
    const def = getDefaultMskDateTime();
    return parseInt(def.time.split(':')[1], 10);
  });

  // String values for inputs
  const [hourStr, setHourStr] = useState<string>(() => String(hour).padStart(2, '0'));
  const [minuteStr, setMinuteStr] = useState<string>(() => String(minute).padStart(2, '0'));

  // Calendar month / year view navigation
  const [month, setMonth] = useState(initialDate ?? now);

  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever drawer is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab('date');
      const def = getDefaultMskDateTime();
      const baseDate = initialDate ? new Date(initialDate) : def.date;

      setSelectedDate(baseDate);
      setMonth(baseDate);

      let h = parseInt(def.time.split(':')[0], 10);
      let m = parseInt(def.time.split(':')[1], 10);

      if (initialTime) {
        const [hS, mS] = initialTime.split(':');
        const parsedH = parseInt(hS, 10);
        const parsedM = parseInt(mS, 10);
        if (!isNaN(parsedH)) h = parsedH;
        if (!isNaN(parsedM)) m = parsedM;
      }

      setHour(h);
      setMinute(m);
      setHourStr(String(h).padStart(2, '0'));
      setMinuteStr(String(m).padStart(2, '0'));
    }
  }, [isOpen, initialDate, initialTime]);

  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Build explicit MSK ISO string (+03:00) so there is zero timezone drift!
  const isoString = useMemo(() => {
    return buildMskIsoString(selectedDate, hour, minute);
  }, [selectedDate, hour, minute]);

  const isValid = useMemo(() => {
    const targetTimestamp = new Date(isoString).getTime();
    return targetTimestamp > Date.now();
  }, [isoString]);

  // Formatted date string for top tab (e.g. "Чт, 5 нояб. 2026 г.")
  const headerDateStr = useMemo(() => {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(selectedDate);
  }, [selectedDate]);

  // Formatted title for date header (e.g. "5 нояб. 2026 г.")
  const titleDateStr = useMemo(() => {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(selectedDate);
  }, [selectedDate]);

  // ──────────────────── Hour Input Handler ────────────────────
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length === 0) {
      setHourStr('');
      return;
    }

    if (raw.length > 2) {
      raw = raw.slice(-1);
    }

    const val = parseInt(raw, 10);
    if (val > 23) {
      const lastDigit = parseInt(raw.slice(-1), 10);
      setHour(lastDigit);
      setHourStr(String(lastDigit));
      return;
    }

    setHour(val);
    setHourStr(raw);

    // If 2 digits typed (e.g. "22" or "05") or 1st digit is 3..9
    if (raw.length === 2 || val >= 3) {
      setTimeout(() => {
        minuteInputRef.current?.focus();
        minuteInputRef.current?.select();
      }, 50);
    }
  };

  const handleHourBlur = () => {
    setHourStr(String(hour).padStart(2, '0'));
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (hour + 1) % 24;
      setHour(next);
      setHourStr(String(next).padStart(2, '0'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = (hour - 1 + 24) % 24;
      setHour(prev);
      setHourStr(String(prev).padStart(2, '0'));
    }
  };

  const handleHourWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      const next = (hour + 1) % 24;
      setHour(next);
      setHourStr(String(next).padStart(2, '0'));
    } else {
      const prev = (hour - 1 + 24) % 24;
      setHour(prev);
      setHourStr(String(prev).padStart(2, '0'));
    }
  };

  // ──────────────────── Minute Input Handler ────────────────────
  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length === 0) {
      setMinuteStr('');
      return;
    }

    if (raw.length > 2) {
      raw = raw.slice(-1);
    }

    const val = parseInt(raw, 10);
    if (val > 59) {
      const lastDigit = parseInt(raw.slice(-1), 10);
      setMinute(lastDigit);
      setMinuteStr(String(lastDigit));
      return;
    }

    setMinute(val);
    setMinuteStr(raw);
  };

  const handleMinuteBlur = () => {
    setMinuteStr(String(minute).padStart(2, '0'));
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (minute + 1) % 60;
      setMinute(next);
      setMinuteStr(String(next).padStart(2, '0'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = (minute - 1 + 60) % 60;
      setMinute(prev);
      setMinuteStr(String(prev).padStart(2, '0'));
    }
  };

  const handleMinuteWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      const next = (minute + 1) % 60;
      setMinute(next);
      setMinuteStr(String(next).padStart(2, '0'));
    } else {
      const prev = (minute - 1 + 60) % 60;
      setMinute(prev);
      setMinuteStr(String(prev).padStart(2, '0'));
    }
  };

  const handleConfirm = () => {
    if (!isValid) {
      haptic.warning();
      toast.warning('Выбранное время уже прошло! Укажите время позже текущего или смените дату.');
      return;
    }
    haptic.success();
    onConfirm(selectedDate, timeString, isoString);
    onClose();
  };

  return (
    <DrawerNestedRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="z-[70] max-w-lg mx-auto rounded-t-3xl border-0 p-0 overflow-hidden bg-card">
          {/* Header Row: "Очередь удалится:" [ 5 нояб. 2026 г. ] [ 21:00 ] */}
          <DrawerHeader className="px-6 pt-5 pb-2 text-left border-0">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
              Очередь удалится:
            </span>
            <div className="flex items-center justify-between gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setActiveTab('date');
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'date'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                <CalendarBlank size={16} weight="bold" />
                <span>{headerDateStr}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setActiveTab('time');
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'time'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                <Clock size={16} weight="bold" />
                <span>{timeString}</span>
              </button>
            </div>
          </DrawerHeader>

          {/* TAB 1: Date Picker */}
          {activeTab === 'date' && (
            <div className="flex flex-col gap-4 px-6 py-3 max-h-[60vh] overflow-y-auto no-scrollbar animate-in fade-in duration-150">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Выберите дату
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
                  {titleDateStr}
                </h3>
              </div>

              <MonthCalendar
                month={month}
                selectedDate={selectedDate}
                today={now}
                minDate={now}
                onMonthChange={setMonth}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setTimeout(() => setActiveTab('time'), 180);
                }}
              />
            </div>
          )}

          {/* TAB 2: Time Picker (Clean, zero duplicate info, zero borders) */}
          {activeTab === 'time' && (
            <div className="flex flex-col items-center justify-center px-6 py-6 gap-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-center gap-4">
                {/* Hours Box with + / - steppers */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      const next = (hour + 1) % 24;
                      setHour(next);
                      setHourStr(String(next).padStart(2, '0'));
                    }}
                    className="w-12 h-8 rounded-xl bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground text-sm font-bold transition-colors select-none"
                    aria-label="Прибавить час"
                  >
                    +
                  </button>
                  <input
                    ref={hourInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={hourStr}
                    onChange={handleHourChange}
                    onFocus={(e) => e.target.select()}
                    onBlur={handleHourBlur}
                    onKeyDown={handleHourKeyDown}
                    onWheel={handleHourWheel}
                    className="w-24 h-20 rounded-2xl bg-secondary text-foreground text-center text-5xl font-bold outline-none focus:bg-primary/20 focus:text-primary transition-all cursor-pointer select-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      const prev = (hour - 1 + 24) % 24;
                      setHour(prev);
                      setHourStr(String(prev).padStart(2, '0'));
                    }}
                    className="w-12 h-8 rounded-xl bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground text-sm font-bold transition-colors select-none"
                    aria-label="Убавить час"
                  >
                    -
                  </button>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                    Часы
                  </span>
                </div>

                <span className="text-5xl font-bold text-muted-foreground/40 -mt-7">
                  :
                </span>

                {/* Minutes Box with + / - steppers */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      const next = (minute + 1) % 60;
                      setMinute(next);
                      setMinuteStr(String(next).padStart(2, '0'));
                    }}
                    className="w-12 h-8 rounded-xl bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground text-sm font-bold transition-colors select-none"
                    aria-label="Прибавить минуту"
                  >
                    +
                  </button>
                  <input
                    ref={minuteInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={minuteStr}
                    onChange={handleMinuteChange}
                    onFocus={(e) => e.target.select()}
                    onBlur={handleMinuteBlur}
                    onKeyDown={handleMinuteKeyDown}
                    onWheel={handleMinuteWheel}
                    className="w-24 h-20 rounded-2xl bg-secondary text-foreground text-center text-5xl font-bold outline-none focus:bg-primary/20 focus:text-primary transition-all cursor-pointer select-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      const prev = (minute - 1 + 60) % 60;
                      setMinute(prev);
                      setMinuteStr(String(prev).padStart(2, '0'));
                    }}
                    className="w-12 h-8 rounded-xl bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground text-sm font-bold transition-colors select-none"
                    aria-label="Убавить минуту"
                  >
                    -
                  </button>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                    Минуты
                  </span>
                </div>
              </div>

              {!isValid && (
                <div className="text-xs text-amber-500 font-medium px-4 py-2 bg-amber-500/10 rounded-xl text-center animate-in fade-in">
                  Указанное время уже прошло сегодня. Выберите время позже текущего или смените дату.
                </div>
              )}
            </div>
          )}

          {/* Action Bar with generous bottom clearance */}
          <DrawerFooter className="px-6 pt-3 pb-12 mb-3 flex flex-row items-center justify-between gap-2.5 border-0">
            {onClear && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  haptic.warning();
                  onClear();
                  onClose();
                }}
                className="rounded-2xl px-4 h-12 text-sm font-semibold border-0"
              >
                Отключить
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="rounded-2xl px-5 h-12 text-sm font-semibold flex-1 border-0"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="rounded-2xl px-5 h-12 text-sm font-semibold flex-1 shadow-sm border-0"
            >
              ОК
            </Button>
          </DrawerFooter>
        </DrawerContent>
    </DrawerNestedRoot>
  );
}
