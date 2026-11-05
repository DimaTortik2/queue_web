/**
 * Formats an ISO expiration date string into clean MSK time format.
 * - Today: "22:00" or "00:30"
 * - This week (1..6 days): "сб. 00:30", "пт. 18:00"
 * - Later (> 6 days): "18.11 00:30"
 */
export function formatAutoDeleteTime(isoString?: string | null): string | null {
  if (!isoString) return null;

  try {
    const target = new Date(isoString);
    if (isNaN(target.getTime())) return null;

    // Time in Europe/Moscow 24-hour format
    const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const timeStr = timeFormatter.format(target);

    const now = new Date();

    // Dates in MSK (YYYY-MM-DD)
    const mskDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
    });
    const targetMskDate = mskDateFormatter.format(target);
    const nowMskDate = mskDateFormatter.format(now);

    // 1. If today in MSK: just time! e.g. "00:30" or "22:00"
    if (targetMskDate === nowMskDate) {
      return timeStr;
    }

    // Difference in days between MSK dates
    const targetZero = new Date(targetMskDate).getTime();
    const nowZero = new Date(nowMskDate).getTime();
    const diffDays = Math.round((targetZero - nowZero) / (1000 * 60 * 60 * 24));

    // 2. If within this week (1 to 6 days): "сб. 00:30", "пт. 18:00"
    if (diffDays >= 1 && diffDays <= 6) {
      const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow',
        weekday: 'short',
      });
      const weekdayStr = weekdayFormatter
        .format(target)
        .toLowerCase()
        .replace('.', '');
      return `${weekdayStr}. ${timeStr}`;
    }

    // 3. Further out: e.g. "07.11 00:30"
    const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
    });
    return `${shortDateFormatter.format(target)} ${timeStr}`;
  } catch {
    return null;
  }
}

/**
 * Returns formatted MSK date and time for Google Calendar picker header
 */
export function formatGoogleCalendarHeader(date: Date, timeStr: string): {
  dateLabel: string;
  timeLabel: string;
} {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      isNaN(h) ? 0 : h,
      isNaN(m) ? 0 : m,
    );

    const dateLabel = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d);

    return {
      dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
      timeLabel: timeStr,
    };
  } catch {
    return {
      dateLabel: '',
      timeLabel: timeStr,
    };
  }
}

/**
 * Returns default date & time in Moscow timezone (now + 30 min, rounded to nearest 5 min)
 */
export function getDefaultMskDateTime(): { date: Date; time: string } {
  const now = new Date();
  const mskFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = mskFormatter.formatToParts(now);
  const getP = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10);
  const y = getP('year');
  const m = getP('month') - 1;
  const d = getP('day');
  const curH = getP('hour');
  const curM = getP('minute');

  // Round up to nearest 5/10 min + 30 min
  let targetM = Math.ceil((curM + 30) / 5) * 5;
  let targetH = curH;
  if (targetM >= 60) {
    targetH += Math.floor(targetM / 60);
    targetM = targetM % 60;
  }

  let targetDate = new Date(y, m, d);
  if (targetH >= 24) {
    targetH = targetH % 24;
    targetDate = new Date(y, m, d + 1);
  }

  const timeStr = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;
  return { date: targetDate, time: timeStr };
}

/**
 * Returns exact next 00:00 MSK ISO string (+03:00)
 */
export function getMskMidnightIso(): string {
  const now = new Date();
  const mskFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, d] = mskFormatter.format(now).split('-').map(Number);
  const tomorrowMsk = new Date(Date.UTC(y, m - 1, d + 1));
  const tmY = tomorrowMsk.getUTCFullYear();
  const tmM = String(tomorrowMsk.getUTCMonth() + 1).padStart(2, '0');
  const tmD = String(tomorrowMsk.getUTCDate()).padStart(2, '0');
  return `${tmY}-${tmM}-${tmD}T00:00:00+03:00`;
}

/**
 * Constructs an explicit MSK ISO string (+03:00) from a Date and hour/minute numbers
 */
export function buildMskIsoString(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:00+03:00`;
}

/**
 * Parses an ISO string into Date and "HH:mm" in MSK
 */
export function parseMskIso(isoString: string): { date: Date; time: string } | null {
  try {
    const target = new Date(isoString);
    if (isNaN(target.getTime())) return null;

    const mskFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = mskFormatter.formatToParts(target);
    const getP = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10);
    const y = getP('year');
    const m = getP('month') - 1;
    const d = getP('day');
    const h = getP('hour');
    const min = getP('minute');

    return {
      date: new Date(y, m, d),
      time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
    };
  } catch {
    return null;
  }
}

