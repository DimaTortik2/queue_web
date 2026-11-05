import { useState, useMemo, useEffect } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';
import { haptic } from '@/lib/telegram';
import { GoogleCalendarTimeDrawer } from '@/components/queue/GoogleCalendarTimeDrawer';
import {
  formatAutoDeleteTime,
  getDefaultMskDateTime,
  getMskMidnightIso,
  buildMskIsoString,
} from '@/lib/dateUtils';

export type AutoDeletePreset = 'never' | '3h' | 'midnight' | '24h' | 'custom';

interface AutoDeleteSelectorProps {
  value: string | null;
  onChange: (isoString: string | null, isValid: boolean) => void;
}

export function AutoDeleteSelector({ onChange }: AutoDeleteSelectorProps) {
  const [preset, setPreset] = useState<AutoDeletePreset>('never');
  const [isCalendarDrawerOpen, setIsCalendarDrawerOpen] = useState(false);

  // Default custom MSK values
  const defaultMsk = useMemo(() => getDefaultMskDateTime(), []);
  const [customDate, setCustomDate] = useState<Date>(() => defaultMsk.date);
  const [customTime, setCustomTime] = useState<string>(() => defaultMsk.time);
  const [customIsoString, setCustomIsoString] = useState<string | null>(null);

  // Compute ISO string according to current preset
  const { isoString, isValid, customTimeLabel } = useMemo(() => {
    const currentNow = new Date();

    if (preset === 'never') {
      return {
        isoString: null,
        isValid: true,
        customTimeLabel: null,
      };
    }

    if (preset === '3h') {
      const target = new Date(currentNow.getTime() + 3 * 60 * 60 * 1000);
      return {
        isoString: target.toISOString(),
        isValid: true,
        customTimeLabel: null,
      };
    }

    if (preset === 'midnight') {
      const midnightIso = getMskMidnightIso();
      return {
        isoString: midnightIso,
        isValid: true,
        customTimeLabel: null,
      };
    }

    if (preset === '24h') {
      const target = new Date(currentNow.getTime() + 24 * 60 * 60 * 1000);
      return {
        isoString: target.toISOString(),
        isValid: true,
        customTimeLabel: null,
      };
    }

    // Custom
    if (!customIsoString) {
      const [h, m] = customTime.split(':').map(Number);
      const iso = buildMskIsoString(customDate, isNaN(h) ? 0 : h, isNaN(m) ? 0 : m);
      const isPast = new Date(iso).getTime() <= currentNow.getTime();
      return {
        isoString: isPast ? null : iso,
        isValid: !isPast,
        customTimeLabel: formatAutoDeleteTime(iso),
      };
    }

    const target = new Date(customIsoString);
    const isPast = target.getTime() <= currentNow.getTime();
    const label = formatAutoDeleteTime(customIsoString);

    return {
      isoString: isPast ? null : customIsoString,
      isValid: !isPast,
      customTimeLabel: label,
    };
  }, [preset, customDate, customTime, customIsoString]);

  // Propagate changes to parent
  useEffect(() => {
    onChange(isoString, isValid);
  }, [isoString, isValid, onChange]);

  const handleCustomConfirm = (date: Date, time: string, iso: string) => {
    setCustomDate(date);
    setCustomTime(time);
    setCustomIsoString(iso);
    setPreset('custom');
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Section Header without any clock icon */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Удалится сама через
          </label>
        </div>

        {/* Presets: "Никогда", "Через 3 часа", "В 00:00", "Через 24 часа", "Другое" */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setPreset('never');
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              preset === 'never'
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            Никогда
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setPreset('3h');
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              preset === '3h'
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            Через 3 часа
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setPreset('midnight');
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              preset === 'midnight'
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            В 00:00
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setPreset('24h');
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              preset === '24h'
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            Через 24 часа
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setIsCalendarDrawerOpen(true);
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              preset === 'custom'
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarBlank size={14} weight="bold" />
            {preset === 'custom' && customTimeLabel ? customTimeLabel : 'Другое'}
          </button>
        </div>
      </div>

      {/* Google Calendar Date & Time Drawer */}
      <GoogleCalendarTimeDrawer
        isOpen={isCalendarDrawerOpen}
        onClose={() => setIsCalendarDrawerOpen(false)}
        initialDate={customDate}
        initialTime={customTime}
        onConfirm={handleCustomConfirm}
      />
    </>
  );
}
