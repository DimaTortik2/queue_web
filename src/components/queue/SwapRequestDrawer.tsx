import { useState, useEffect } from 'react';
import { ArrowsLeftRight, Check } from '@phosphor-icons/react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/telegram';
import { useUserStore } from '@/store/userStore';
import {
  useSwapCandidates,
  useCreateSwapRequestMutation,
} from '@/hooks/useQueueApi';
import { SwapCandidate } from '@/types';
import { SlotAvatar } from '@/components/ui/SlotAvatar';

interface SwapRequestDrawerProps {
  subject: string | null;
  isOpen: boolean;
  preselectedPos?: number | null;
  preselectedName?: string | null;
  onClose: () => void;
}

export function SwapRequestDrawer({
  subject,
  isOpen,
  preselectedPos,
  preselectedName,
  onClose,
}: SwapRequestDrawerProps) {
  const { user } = useUserStore();
  const [selectedCandidate, setSelectedCandidate] =
    useState<SwapCandidate | null>(null);
  const [message, setMessage] = useState('');

  const { data: candidates = [], isLoading } = useSwapCandidates(
    subject,
    user?.tg_id,
  );

  const createSwapMutation = useCreateSwapRequestMutation();

  useEffect(() => {
    if (preselectedPos && candidates.length > 0) {
      const match = candidates.find((c) => c.position === preselectedPos);
      if (match) setSelectedCandidate(match);
    } else if (candidates.length > 0 && !selectedCandidate) {
      setSelectedCandidate(candidates[0]);
    }
  }, [preselectedPos, candidates, selectedCandidate]);

  const handleSubmit = () => {
    if (!subject || !user?.tg_id || !selectedCandidate) return;

    createSwapMutation.mutate(
      {
        subject,
        data: {
          from_tg_id: user.tg_id,
          to_position: selectedCandidate.position,
          message: message.trim(),
        },
      },
      {
        onSuccess: () => {
          onClose();
          setMessage('');
          setSelectedCandidate(null);
        },
      },
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Предложение обмена местами</DrawerTitle>
          <DrawerDescription>
            {preselectedName
              ? `Обмен с участником: ${preselectedName}`
              : "Выберите участника для обмена местами."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-5 py-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Загрузка подходящих кандидатов...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              В очереди пока нет других участников, доступных для обмена.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">
                Выберите участника:
              </span>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {candidates.map((c) => {
                  const isSelected = selectedCandidate?.position === c.position;
                  return (
                    <button
                      key={c.position}
                      onClick={() => {
                        haptic.selection();
                        setSelectedCandidate(c);
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-150 text-left select-none ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'bg-secondary/40 hover:bg-secondary/70 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-sm font-semibold shrink-0">
                          #{c.position}
                        </span>
                        <SlotAvatar
                          photoUrl={c.photo_url}
                          name={c.name}
                          size={22}
                        />
                        <span className="text-xs truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs opacity-80">
                        <span>
                          {c.slots_difference > 0
                            ? `на ${c.slots_difference} ближе`
                            : c.slots_difference < 0
                              ? `на ${Math.abs(c.slots_difference)} дальше`
                              : 'рядом'}
                        </span>
                        {isSelected && <Check size={14} weight="bold" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-xs text-muted-foreground">
              Сообщение для участника (необязательно)
            </label>
            <input
              type="text"
              placeholder="Например: опаздываю, пропусти пожалуйста"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-secondary/70 transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <DrawerFooter className="px-6 pt-3 pb-12 mb-3 flex flex-col gap-2.5">
          <Button
            variant="default"
            className="rounded-2xl h-12 text-sm font-semibold gap-2"
            onClick={handleSubmit}
            disabled={!selectedCandidate || createSwapMutation.isPending}
          >
            <ArrowsLeftRight size={18} weight="bold" />
            {createSwapMutation.isPending
              ? 'Отправка...'
              : 'Отправить предложение'}
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" className="rounded-2xl h-11 text-xs font-semibold">
              Отмена
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
