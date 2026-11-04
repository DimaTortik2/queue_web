import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/userStore";
import { useSubjectsList, useCreateQueueMutation } from "@/hooks/useQueueApi";

interface CreateQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateQueueDrawer({ isOpen, onClose }: CreateQueueDrawerProps) {
  const { user } = useUserStore();
  const { data: subjectsData } = useSubjectsList();
  const createQueueMutation = useCreateQueueMutation();

  const [subjectName, setSubjectName] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [queueType, setQueueType] = useState("");

  const subjects = subjectsData?.subject_list || [];

  const handleCreate = () => {
    const finalSubject = (subjectName === "custom" ? customSubject : subjectName).trim();
    const finalType = queueType.trim();

    if (!finalSubject || !finalType || !user?.tg_id) return;

    createQueueMutation.mutate(
      {
        subject_name: finalSubject,
        queue_type: finalType,
        created_by_tg_id: user.tg_id,
      },
      {
        onSuccess: () => {
          onClose();
          setSubjectName("");
          setCustomSubject("");
          setQueueType("");
        },
      }
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Создание новой очереди</DrawerTitle>
          <DrawerDescription>
            Укажите учебную дисциплину и тип сдачи (например, Лабораторная 1).
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-5 py-2 max-h-[50vh] overflow-y-auto">
          {/* Subject Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Предмет / Дисциплина</label>
            <select
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-secondary/70 transition-all text-foreground"
            >
              <option value="">Выберите предмет из каталога</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              <option value="custom">Указать другой предмет...</option>
            </select>
          </div>

          {/* Custom Subject Name if selected */}
          {subjectName === "custom" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Название нового предмета</label>
              <input
                type="text"
                placeholder="Например: Базы данных"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-secondary/70 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          )}

          {/* Queue Type Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Тип сдачи</label>
            <input
              type="text"
              placeholder="Например: Лабораторная 1, Коллоквиум"
              value={queueType}
              onChange={(e) => setQueueType(e.target.value)}
              className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-secondary/70 transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <DrawerFooter>
          <Button
            variant="default"
            onClick={handleCreate}
            disabled={
              createQueueMutation.isPending ||
              (!subjectName && !customSubject) ||
              !queueType.trim()
            }
          >
            <Plus size={16} weight="bold" />
            {createQueueMutation.isPending ? "Создание..." : "Создать очередь"}
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost">Отмена</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
