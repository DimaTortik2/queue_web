import { LinkSimple, PaperPlaneTilt } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  copyQueueLink,
  getQueueShareMessage,
  shareQueueLink,
  type QueueShareDetails,
} from '@/lib/deepLink';
import { haptic } from '@/lib/telegram';

interface QueueShareDrawerProps {
  queue: QueueShareDetails;
  onClose: () => void;
}

export function QueueShareDrawer({ queue, onClose }: QueueShareDrawerProps) {
  const message = getQueueShareMessage(queue);

  const handleCopy = async () => {
    try {
      await copyQueueLink(queue.subject);
      haptic.light();
      toast.success('Ссылка на очередь скопирована');
    } catch {
      haptic.error();
      toast.error('Не удалось скопировать ссылку');
    }
  };

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="px-6 pt-5 pb-3 text-left">
          <DrawerTitle className="text-xl">Поделиться очередью</DrawerTitle>
          <DrawerDescription>Предпросмотр сообщения</DrawerDescription>
        </DrawerHeader>

        <div className="mx-6 rounded-2xl bg-primary/10 px-4 py-3.5">
          <p className="text-sm font-bold">{message.title}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.description}</p>
          <p className="mt-2 text-xs text-primary [overflow-wrap:anywhere]">{message.url}</p>
        </div>

        <DrawerFooter className="px-6">
          <Button type="button" onClick={() => shareQueueLink(message)}>
            <PaperPlaneTilt size={18} weight="fill" />
            Поделиться в Telegram
          </Button>
          <Button type="button" variant="secondary" onClick={handleCopy}>
            <LinkSimple size={18} />
            Скопировать ссылку
          </Button>
          <DrawerClose asChild>
            <Button type="button" variant="ghost">Закрыть</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
