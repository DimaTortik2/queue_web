import { Star } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/store/preferencesStore';

interface QueuePinButtonProps {
  subject: string;
  className?: string;
  appearance?: 'card' | 'drawer';
}

export function QueuePinButton({ subject, className, appearance = 'card' }: QueuePinButtonProps) {
  const isPinned = usePreferencesStore((state) => state.pinnedSubjects.includes(subject));
  const togglePinSubject = usePreferencesStore((state) => state.togglePinSubject);
  const label = isPinned ? 'Открепить очередь' : 'Закрепить очередь';
  const isDrawer = appearance === 'drawer';

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        'shrink-0',
        !isDrawer && 'h-auto rounded-lg p-1',
        !isDrawer && (isPinned
          ? 'text-amber-500 hover:bg-transparent'
          : 'text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted'),
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
      <Star size={isDrawer ? 16 : 18} weight={isPinned ? 'fill' : 'regular'} />
    </Button>
  );
}
