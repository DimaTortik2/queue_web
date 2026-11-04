import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
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
import { useUserStore } from '@/store/userStore';
import {
  useSubjectsList,
  useCreateSubjectMutation,
  useCreateQueueMutation,
  useJoinQueueMutation,
} from '@/hooks/useQueueApi';
import { haptic } from '@/lib/telegram';

interface CreateQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateQueueDrawer({ isOpen, onClose }: CreateQueueDrawerProps) {
  const { user } = useUserStore();
  const { data: subjectsData } = useSubjectsList();
  const createSubjectMutation = useCreateSubjectMutation();
  const createQueueMutation = useCreateQueueMutation();
  const joinMutation = useJoinQueueMutation();

  const [subjectName, setSubjectName] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [queueType, setQueueType] = useState('');
  const [maxPositions, setMaxPositions] = useState<number>(30);
  const [chosenPosition, setChosenPosition] = useState<number>(1);
  const [joinImmediately, setJoinImmediately] = useState<boolean>(true);

  const subjects = subjectsData?.subject_list || [];

  const handleCreate = async () => {
    const finalSubject = (
      subjectName === 'custom' ? customSubject : subjectName
    ).trim();
    const finalType = queueType.trim();

    if (!finalSubject || !finalType || !user?.tg_id) return;

    // Auto-register custom subject in catalog if it doesn't exist yet
    const alreadyExists = subjects.some(
      (s) => s.name.toLowerCase() === finalSubject.toLowerCase(),
    );
    if (!alreadyExists) {
      try {
        await createSubjectMutation.mutateAsync(finalSubject);
      } catch (err) {
        console.warn('Auto-register subject error:', err);
      }
    }

    createQueueMutation.mutate(
      {
        subject_name: finalSubject,
        queue_type: finalType,
        created_by_tg_id: user.tg_id,
      },
      {
        onSuccess: () => {
          const fullSubjectKey = `${finalSubject}:${finalType}`;
          if (
            joinImmediately &&
            chosenPosition >= 1 &&
            chosenPosition <= maxPositions
          ) {
            joinMutation.mutate({
              subject: fullSubjectKey,
              data: {
                tg_id: user.tg_id,
                position: chosenPosition,
              },
            });
          }
          onClose();
          setSubjectName('');
          setCustomSubject('');
          setQueueType('');
          setMaxPositions(30);
          setChosenPosition(1);
        },
      },
    );
  };

  const isFormValid = Boolean(
    (subjectName === 'custom' ? customSubject.trim() : subjectName.trim()) &&
    queueType.trim(),
  );

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-lg mx-auto rounded-t-3xl border-0 p-0">
        <DrawerHeader className="px-6 pt-6 pb-2">
          <DrawerTitle className="text-xl font-bold tracking-tight text-foreground">
            Новая очередь
          </DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground font-medium mt-1">
            Выберите предмет из списка или введите свой, а также тип сдачи.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-5 px-6 py-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          {/* Subject Selection Pills */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Предмет
            </label>

            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const isSelected = subjectName === s.name;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setSubjectName(s.name);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-foreground text-background'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setSubjectName('custom');
                }}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  subjectName === 'custom'
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                + Свой предмет
              </button>
            </div>
          </div>

          {/* Custom Subject Name input if chosen */}
          {subjectName === 'custom' && (
            <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Название предмета
              </label>
              <input
                type="text"
                placeholder="Например: Базы данных (добавится в каталог)"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-medium focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50 border-0 outline-none"
                autoFocus
              />
            </div>
          )}

          {/* Queue Type Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Тип сдачи
            </label>
            <input
              type="text"
              placeholder="Лабораторная 1..."
              value={queueType}
              onChange={(e) => setQueueType(e.target.value)}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-medium focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50 border-0 outline-none"
            />
          </div>

          {/* Max Positions Carousel Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Всего мест в очереди ({maxPositions})
            </label>
            <div className="w-full overflow-hidden">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth snap-x snap-mandatory">
                {[10, 15, 20, 25, 30].map((count) => {
                  const isSelected = maxPositions === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        haptic.selection();
                        setMaxPositions(count);
                        if (chosenPosition > count) setChosenPosition(count);
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 snap-start min-w-[85px] transition-all ${
                        isSelected
                          ? 'bg-foreground text-background'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {count} мест
                    </button>
                  );
                })}
                <div className="shrink-0 w-4" />
              </div>
            </div>
          </div>

          {/* Creator Slot Selection - Smooth Horizontal Carousel strictly within bounds */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ваше место в очереди
              </label>
              <button
                type="button"
                onClick={() => setJoinImmediately(!joinImmediately)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {joinImmediately ? 'Встать в очередь' : 'Не занимать место'}
              </button>
            </div>

            {joinImmediately && (
              <div className="flex flex-col gap-1.5">
                <div className="w-full overflow-hidden">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth snap-x snap-mandatory">
                    {Array.from({ length: maxPositions }, (_, i) => i + 1).map(
                      (pos) => {
                        const isSelected = chosenPosition === pos;
                        return (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => {
                              haptic.selection();
                              setChosenPosition(pos);
                            }}
                            className={`w-12 h-12 rounded-xl text-xs font-semibold flex items-center justify-center shrink-0 snap-start transition-all ${
                              isSelected
                                ? 'bg-foreground text-background scale-105'
                                : 'bg-secondary text-foreground hover:bg-secondary/80'
                            }`}
                          >
                            #{pos}
                          </button>
                        );
                      },
                    )}
                    <div className="shrink-0 w-4" />
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Выбрано место #{chosenPosition}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Generous bottom padding */}
        <DrawerFooter className="px-6 pt-5 pb-12 mb-3 flex flex-col gap-3">
          <Button
            variant="default"
            onClick={handleCreate}
            disabled={createQueueMutation.isPending || !isFormValid}
            disabledReason={
              !subjectName
                ? 'Сначала выберите предмет'
                : subjectName === 'custom' && !customSubject.trim()
                  ? 'Введите название предмета'
                  : !queueType.trim()
                    ? 'Введите тип сдачи (например: Лабораторная 1)'
                    : undefined
            }
            className="w-full rounded-2xl h-12 text-sm font-semibold gap-1.5"
          >
            {createQueueMutation.isPending ? (
              'Создание...'
            ) : (
              <>
                <Plus size={18} weight="bold" />
                Создать очередь
              </>
            )}
          </Button>
          <DrawerClose asChild>
            <Button
              variant="secondary"
              className="w-full rounded-2xl h-12 text-sm font-medium"
            >
              Отмена
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
