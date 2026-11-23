import { Star } from '@phosphor-icons/react';
import { haptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/store/preferencesStore';

interface QueuePinButtonProps {
  subject: string;
  className?: string;
}

export function QueuePinButton({ subject, className }: QueuePinButtonProps) {
  const isPinned = usePreferencesStore((state) => state.pinnedSubjects.includes(subject));
  const togglePinSubject = usePreferencesStore((state) => state.togglePinSubject);
  const label = isPinned ? 'Открепить очередь' : 'Закрепить очередь';

  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors',
        isPinned ? 'text-amber-500' : 'text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted',
        className,
      )}
      title={label}
      aria-label={label}
      aria-pressed={isPinned}
      onClick={(event) => {
        event.stopPropagation();
        haptic.selection();
        togglePinSubject(subject);
      }}
    >
      <Star size={18} weight={isPinned ? 'fill' : 'regular'} />
    </button>
  );
}
