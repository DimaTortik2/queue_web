import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerNestedRoot, DrawerTitle } from '@/components/ui/drawer';
import { QueueDetailsFields } from '@/components/queue/QueueDetailsFields';
import { useUpdateQueueDetailsMutation } from '@/hooks/useQueueApi';

interface EditQueueDetailsDrawerProps {
  subject: string;
  initialTitle: string;
  initialDate?: string | null;
  onClose: () => void;
}

export function EditQueueDetailsDrawer({ subject, initialTitle, initialDate, onClose }: EditQueueDetailsDrawerProps) {
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate ?? '');
  const update = useUpdateQueueDetailsMutation();

  const trimmedTitle = title.trim();
  const hasChanges = trimmedTitle !== initialTitle || date !== (initialDate ?? '');

  return (
    <DrawerNestedRoot open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent aria-describedby={undefined} className="p-0">
        <DrawerHeader className="px-6 pt-6 pb-2">
          <DrawerTitle className="text-xl font-bold tracking-tight text-foreground">
            Редактирование очереди
          </DrawerTitle>
        </DrawerHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmedTitle || !hasChanges || update.isPending) return;
            update.mutate(
              { subject, data: { queue_type: trimmedTitle, queue_date: date || null } },
              { onSuccess: onClose },
            );
          }}
        >
          <div className="flex flex-col gap-5 px-6 py-3">
            <QueueDetailsFields title={title} onTitleChange={setTitle} date={date} onDateChange={setDate} />
          </div>
          <DrawerFooter className="px-6 pt-4 gap-2.5">
            <Button type="submit" className="h-12 w-full rounded-2xl" disabled={!trimmedTitle || !hasChanges || update.isPending}>
              {update.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="secondary" className="h-12 w-full rounded-2xl">
                Отмена
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </DrawerNestedRoot>
  );
}
