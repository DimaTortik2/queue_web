import { useId } from 'react';
import { QueueDatePicker } from '@/components/queue/QueueDatePicker';

interface QueueDetailsFieldsProps {
  title: string;
  onTitleChange: (title: string) => void;
  date: string;
  onDateChange: (date: string) => void;
  dateRequired?: boolean;
}

const inputClassName = 'w-full min-w-0 rounded-2xl bg-secondary px-4 py-3.5 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50 focus:bg-accent';
const labelClassName = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider';

export function QueueDetailsFields({
  title, onTitleChange, date, onDateChange, dateRequired = false,
}: QueueDetailsFieldsProps) {
  const titleId = useId();

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
      <QueueDatePicker value={date} onChange={onDateChange} required={dateRequired} />
    </>
  );
}
