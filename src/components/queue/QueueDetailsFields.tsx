import { useId } from 'react';

interface QueueDetailsFieldsProps {
  title: string;
  onTitleChange: (title: string) => void;
  date: string;
  onDateChange: (date: string) => void;
  dateRequired?: boolean;
}

const inputClassName = 'w-full min-w-0 bg-secondary rounded-2xl px-4 py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 border-0 outline-none';
const labelClassName = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider';

export function QueueDetailsFields({
  title, onTitleChange, date, onDateChange, dateRequired = false,
}: QueueDetailsFieldsProps) {
  const titleId = useId();
  const dateId = useId();

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={titleId} className={labelClassName}>Название очереди</label>
        <input
          id={titleId}
          type="text"
          value={title}
          placeholder="Лаба 1…"
          required
          onChange={(event) => onTitleChange(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={dateId} className={labelClassName}>Дата очереди</label>
        <input
          id={dateId}
          type="date"
          value={date}
          required={dateRequired}
          onChange={(event) => onDateChange(event.target.value)}
          className={`${inputClassName} min-h-12 [color-scheme:light] dark:[color-scheme:dark]`}
        />
      </div>
    </>
  );
}
