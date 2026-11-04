import { useState } from "react";
import { toast } from "sonner";
import {
  Trash,
  Plus,
  PencilSimple,
  Check,
  X,
  Sun,
  Moon,
  Desktop,
  Vibrate,
  ArrowsClockwise,
  Palette,
} from "@phosphor-icons/react";
import { useUserStore } from "@/store/userStore";
import {
  usePreferencesStore,
  DEFAULT_ACCENT_HEX,
} from "@/store/preferencesStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/telegram";
import {
  useSubjectsList,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
} from "@/hooks/useQueueApi";

export function ProfileView() {
  const { user, updateUserName } = useUserStore();
  const {
    theme,
    setTheme,
    accentMode,
    setAccentMode,
    customColor,
    setCustomColor,
    hapticsEnabled,
    toggleHaptics,
    resetPreferences,
  } = usePreferencesStore();

  const [newSubjectName, setNewSubjectName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: number; name: string } | null>(null);

  const { data: subjectsData, isLoading: isLoadingSubjects } = useSubjectsList();
  const createSubjectMutation = useCreateSubjectMutation();
  const deleteSubjectMutation = useDeleteSubjectMutation();

  const subjects = subjectsData?.subject_list || [];

  const handleStartEditName = () => {
    haptic.selection();
    setNameInput(user?.name || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setIsSavingName(true);
    try {
      await updateUserName(nameInput.trim());
      haptic.success();
      toast.success("Имя профиля обновлено");
      setIsEditingName(false);
    } catch {
      haptic.error();
      toast.error("Не удалось обновить имя");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    createSubjectMutation.mutate(newSubjectName.trim(), {
      onSuccess: () => {
        setNewSubjectName("");
        haptic.success();
        toast.success("Предмет добавлен");
      },
    });
  };

  const handleDeleteSubjectConfirm = () => {
    if (!subjectToDelete) return;
    haptic.warning();
    deleteSubjectMutation.mutate(subjectToDelete.id, {
      onSuccess: () => {
        setSubjectToDelete(null);
        toast.info("Предмет удален из каталога");
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-32 max-w-lg mx-auto w-full select-none native-page-enter">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Профиль
        </h1>
        <p className="text-xs text-muted-foreground font-medium">
          Аккаунт и настройки приложения
        </p>
      </header>

      {/* Account Info Card */}
      <div className="bg-card rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col flex-1 mr-3 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ваш аккаунт
            </span>
            {isEditingName ? (
              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ваше имя..."
                  className="flex-1 bg-secondary rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 border-0 outline-none"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSaveName}
                  disabled={isSavingName || !nameInput.trim()}
                  className="h-9 w-9 p-0 rounded-xl"
                >
                  <Check size={16} weight="bold" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsEditingName(false)}
                  className="h-9 w-9 p-0 rounded-xl"
                >
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <span className="text-base font-bold tracking-tight text-foreground truncate mt-0.5">
                {user?.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isEditingName && (
              <button
                onClick={handleStartEditName}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
                title="Изменить имя"
              >
                <PencilSimple size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="bg-card rounded-2xl p-5 flex flex-col gap-3.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Тема оформления
        </span>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              haptic.selection();
              setTheme("system");
            }}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all ${
              theme === "system"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <Desktop size={20} weight={theme === "system" ? "fill" : "regular"} />
            <span>Системная</span>
          </button>

          <button
            onClick={() => {
              haptic.selection();
              setTheme("light");
            }}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all ${
              theme === "light"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <Sun size={20} weight={theme === "light" ? "fill" : "regular"} />
            <span>Светлая</span>
          </button>

          <button
            onClick={() => {
              haptic.selection();
              setTheme("dark");
            }}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all ${
              theme === "dark"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <Moon size={20} weight={theme === "dark" ? "fill" : "regular"} />
            <span>Темная</span>
          </button>
        </div>
      </div>

      {/* Accent Color Selection */}
      <div className="bg-card rounded-2xl p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-primary" weight="bold" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Цвет акцента
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Default purple */}
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setAccentMode("default");
            }}
            className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl text-xs font-semibold transition-all border-0 outline-none ${
              accentMode === "default"
                ? "bg-primary/15 text-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <div
              className="w-4 h-4 rounded-full shrink-0 border border-black/10 dark:border-white/10"
              style={{ backgroundColor: DEFAULT_ACCENT_HEX }}
            />
            <span>По умолчанию</span>
          </button>

          {/* Custom user color */}
          <div
            onClick={() => {
              if (accentMode !== "custom") {
                haptic.selection();
                setAccentMode("custom");
              }
            }}
            style={{
              backgroundColor: accentMode === "custom" ? `${customColor}24` : undefined,
            }}
            className={`relative flex items-center justify-center gap-2.5 p-3.5 rounded-xl text-xs font-semibold transition-all border-0 outline-none cursor-pointer ${
              accentMode === "custom"
                ? "text-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <label
              className="relative cursor-pointer shrink-0 flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              />
              <div
                className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-sm"
                style={{ backgroundColor: customColor }}
                title="Выбрать свой цвет"
              />
            </label>
            <span className="font-mono text-xs uppercase">{customColor}</span>
          </div>
        </div>
      </div>

      {/* Subject Catalog Management */}
      <div className="bg-card rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Предметы
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">
            Каталог учебных дисциплин для очередей
          </span>
        </div>

        {/* Add Subject Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Название предмета..."
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="flex-1 bg-secondary rounded-xl px-4 py-3 text-xs font-medium focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50 border-0 outline-none"
          />
          <Button
            size="sm"
            variant="default"
            onClick={handleAddSubject}
            disabled={createSubjectMutation.isPending || !newSubjectName.trim()}
            disabledReason="Введите название нового предмета"
            className="rounded-xl px-4 h-10 text-xs font-semibold gap-1"
          >
            <Plus size={14} weight="bold" />
            Добавить
          </Button>
        </div>

        {/* Delete Confirmation Box */}
        {subjectToDelete && (
          <div className="bg-destructive/10 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in">
            <span className="font-semibold text-destructive">
              Удалить предмет «{subjectToDelete.name}»?
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="destructive"
                className="h-8 px-3 rounded-lg text-xs"
                onClick={handleDeleteSubjectConfirm}
                disabled={deleteSubjectMutation.isPending}
              >
                Удалить
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-2.5 rounded-lg text-xs"
                onClick={() => setSubjectToDelete(null)}
              >
                Отмена
              </Button>
            </div>
          </div>
        )}

        {/* Subjects List */}
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
          {isLoadingSubjects ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : subjects.length > 0 ? (
            subjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary rounded-xl transition-all"
              >
                <span className="text-xs font-semibold text-foreground">{s.name}</span>
                <button
                  onClick={() => {
                    haptic.selection();
                    setSubjectToDelete(s);
                  }}
                  className="text-muted-foreground/60 hover:text-destructive p-1 rounded-lg transition-colors"
                  title="Удалить предмет"
                >
                  <Trash size={15} />
                </button>
              </div>
            ))
          ) : (
            <span className="text-xs text-muted-foreground py-2 text-center">
              Каталог предметов пуст
            </span>
          )}
        </div>
      </div>

      {/* Tactile and Reset Options */}
      <div className="bg-card rounded-2xl p-5 flex flex-col gap-4">
        {/* Haptics Toggle with adaptive high-contrast handle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate size={20} className="text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Виброотклик</span>
              <span className="text-[11px] text-muted-foreground">
                Тактильная отдача в Telegram
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              toggleHaptics();
              if (!hapticsEnabled) haptic.success();
            }}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              hapticsEnabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            {/* High-contrast handle that dynamically adapts and never merges with the track */}
            <div
              className={`w-5 h-5 rounded-full shadow-sm transition-transform duration-150 absolute top-1 border border-black/15 dark:border-white/15 ${
                hapticsEnabled
                  ? "left-6 bg-primary-foreground"
                  : "left-1 bg-foreground/70"
              }`}
            />
          </button>
        </div>

        {/* Reset Preferences */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground font-medium">
            Сброс настроек
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-destructive hover:bg-destructive/10 rounded-xl h-8 font-semibold"
            onClick={() => {
              haptic.warning();
              resetPreferences();
              toast.info("Настройки сброшены");
            }}
          >
            <ArrowsClockwise size={14} className="mr-1" />
            Сбросить
          </Button>
        </div>
      </div>
    </div>
  );
}
