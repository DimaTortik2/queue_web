import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  BookOpen,
  Trash,
  Plus,
  Users,
  MagnifyingGlass,
  Check,
  PencilSimple,
  Copy,
  X,
  Sliders,
  Vibrate,
  Star,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useUserStore } from "@/store/userStore";
import { usePreferencesStore } from "@/store/preferencesStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/telegram";
import { api } from "@/services/api";
import {
  useSubjectsList,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useUsersList,
  useSetRoleMutation,
  useDeleteUserMutation,
} from "@/hooks/useQueueApi";

export function ProfileView() {
  const { user, setUser, switchMockUser, setCustomDevUser } = useUserStore();
  const [customTgIdInput, setCustomTgIdInput] = useState("");
  const {
    hapticsEnabled,
    toggleHaptics,
    pinnedSubjects,
    unpinAllSubjects,
    resetPreferences,
  } = usePreferencesStore();
  const [newSubjectName, setNewSubjectName] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const { data: subjectsData, isLoading: isLoadingSubjects } = useSubjectsList();
  const { data: usersData, isLoading: isLoadingUsers } = useUsersList({
    search: userSearch.trim() || undefined,
    role: userRoleFilter || undefined,
  });

  const createSubjectMutation = useCreateSubjectMutation();
  const deleteSubjectMutation = useDeleteSubjectMutation();
  const setRoleMutation = useSetRoleMutation();
  const deleteUserMutation = useDeleteUserMutation();

  const subjects = subjectsData?.subject_list || [];
  const usersList = usersData?.users || [];
  const isCurator = user?.role === "curator";

  const handleStartEditName = () => {
    haptic.selection();
    setNameInput(user?.name || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!user?.tg_id || !nameInput.trim()) return;
    setIsSavingName(true);
    try {
      await api.updateUser(user.tg_id, { name: nameInput.trim() });
      setUser({ ...user, name: nameInput.trim() });
      haptic.success();
      toast.success("Имя профиля сохранено");
      setIsEditingName(false);
    } catch {
      haptic.error();
      toast.error("Не удалось обновить имя");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCopyTgId = () => {
    if (!user?.tg_id) return;
    navigator.clipboard.writeText(String(user.tg_id));
    haptic.success();
    toast.info("Telegram ID скопирован");
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    createSubjectMutation.mutate(newSubjectName.trim(), {
      onSuccess: () => setNewSubjectName(""),
    });
  };

  const handleDeleteSubject = (id: number) => {
    deleteSubjectMutation.mutate(id);
  };

  const handleToggleUserRole = (targetTgId: number, currentRole: string) => {
    haptic.selection();
    const nextRole = currentRole === "curator" ? "student" : "curator";
    setRoleMutation.mutate({
      tgId: targetTgId,
      data: { role: nextRole },
    });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28 max-w-lg mx-auto w-full select-none">
      <div className="flex flex-col gap-0.5 pt-1">
        <span className="text-base font-semibold tracking-tight">Профиль и управление</span>
        <span className="text-xs text-muted-foreground">Данные аккаунта и настройки</span>
      </div>

      {/* User Information Card */}
      <div className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3">
        {/* Name with inline editing */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col flex-1 mr-2">
            <span className="text-xs text-muted-foreground">Имя пользователя</span>
            {isEditingName ? (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ваше имя..."
                  className="flex-1 bg-secondary/60 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:bg-secondary/80"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName || !nameInput.trim()}
                  className="p-1.5 text-foreground hover:opacity-80 active:scale-95 transition-all"
                  title="Сохранить"
                >
                  <Check size={14} weight="bold" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-1.5 text-muted-foreground hover:opacity-80 active:scale-95 transition-all"
                  title="Отмена"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <span className="text-sm font-semibold tracking-tight">{user?.name}</span>
            )}
          </div>
          {!isEditingName && (
            <button
              onClick={handleStartEditName}
              className="p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              title="Изменить имя"
            >
              <PencilSimple size={14} />
            </button>
          )}
        </div>

        {/* Telegram ID with one-click copy */}
        <div
          onClick={handleCopyTgId}
          className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Telegram ID</span>
            <span className="text-sm font-mono">{user?.tg_id}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyTgId();
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            title="Скопировать ID"
          >
            <Copy size={14} />
          </button>
        </div>

        {/* Role badge */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Текущая роль</span>
          <div className="pt-1">
            <Badge variant={isCurator ? "default" : "secondary"}>
              {isCurator ? "Куратор" : "Студент"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Subject Catalog Management (Curator Section) */}
      {isCurator && (
        <div className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <BookOpen size={16} />
            <span>Каталог предметов</span>
          </div>

          {/* Add Subject Input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Новый предмет (например: Физика)"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="flex-1 bg-secondary/50 rounded-xl px-4 py-2 text-xs focus:outline-none focus:bg-secondary/70 transition-all placeholder:text-muted-foreground/50 text-foreground"
            />
            <Button
              size="sm"
              variant="default"
              onClick={handleAddSubject}
              disabled={createSubjectMutation.isPending || !newSubjectName.trim()}
            >
              <Plus size={14} weight="bold" />
              Добавить
            </Button>
          </div>

          {/* Subjects List */}
          <div className="flex flex-col gap-1.5 pt-1 max-h-40 overflow-y-auto">
            {isLoadingSubjects ? (
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-9 w-full rounded-xl" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ) : subjects.length > 0 ? (
              subjects.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 bg-secondary/40 rounded-xl"
                >
                  <span className="text-xs font-medium">{s.name}</span>
                  <button
                    onClick={() => handleDeleteSubject(s.id)}
                    className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Каталог пока пуст</span>
            )}
          </div>
        </div>
      )}

      {/* User & Role Management (Curator Section) */}
      {isCurator && (
        <div className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Users size={16} />
            <span>Управление ролями пользователей</span>
          </div>

          {/* User Search & Filter */}
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-secondary/50 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:bg-secondary/70 transition-all placeholder:text-muted-foreground/50 text-foreground"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setUserRoleFilter(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                userRoleFilter === null
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary/40 text-muted-foreground"
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setUserRoleFilter("student")}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                userRoleFilter === "student"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary/40 text-muted-foreground"
              }`}
            >
              Студенты
            </button>
            <button
              onClick={() => setUserRoleFilter("curator")}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                userRoleFilter === "curator"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary/40 text-muted-foreground"
              }`}
            >
              Кураторы
            </button>
          </div>

          {/* User Cards List */}
          <div className="flex flex-col gap-1.5 pt-1 max-h-48 overflow-y-auto">
            {isLoadingUsers ? (
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : usersList.length > 0 ? (
              usersList.map((u) => {
                const isTargetCurator = u.role === "curator";
                const isSelf = u.tg_id === user?.tg_id;

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2.5 bg-secondary/40 rounded-xl"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{u.name}</span>
                        {isSelf && <span className="text-[10px] text-muted-foreground">(Вы)</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        TG: {u.tg_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={isTargetCurator ? "default" : "secondary"}>
                        {isTargetCurator ? "Куратор" : "Студент"}
                      </Badge>

                      {!isSelf && (
                        <>
                          <Button
                            size="sm"
                            variant="subtle"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => handleToggleUserRole(u.tg_id, u.role)}
                            disabled={setRoleMutation.isPending}
                          >
                            <Check size={12} weight="bold" />
                            {isTargetCurator ? "В студенты" : "В кураторы"}
                          </Button>
                          <button
                            onClick={() => {
                              haptic.warning();
                              deleteUserMutation.mutate(u.tg_id);
                            }}
                            className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                          >
                            <Trash size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground">Пользователи не найдены</span>
            )}
          </div>
        </div>
      )}

      {/* Interface and Preferences Section */}
      <div className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Sliders size={16} />
          <span>Настройки интерфейса</span>
        </div>

        {/* Haptics Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Vibrate size={18} className="text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Тактильный виброотклик</span>
              <span className="text-[10px] text-muted-foreground">
                Вибрация при тапах и системных событиях
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              toggleHaptics();
              if (!hapticsEnabled) haptic.success();
            }}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              hapticsEnabled ? "bg-primary" : "bg-secondary/80"
            }`}
            title="Переключить виброотклик"
            aria-label="Переключить виброотклик"
          >
            <div
              className={`w-4 h-4 rounded-full bg-background transition-transform duration-150 absolute top-1 ${
                hapticsEnabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        {/* Pinned Queues Status */}
        <div className="flex items-center justify-between py-1 border-t border-border/20 pt-2.5">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Закрепленные очереди</span>
              <span className="text-[10px] text-muted-foreground">
                {pinnedSubjects.length > 0
                  ? `Закреплено: ${pinnedSubjects.length}`
                  : "Нет закрепленных очередей"}
              </span>
            </div>
          </div>
          {pinnedSubjects.length > 0 && (
            <Button
              size="sm"
              variant="subtle"
              className="text-xs h-7"
              onClick={() => {
                haptic.light();
                unpinAllSubjects();
                toast.info("Все очереди откреплены");
              }}
            >
              Открепить все
            </Button>
          )}
        </div>

        {/* Reset Preferences */}
        <div className="flex items-center justify-between border-t border-border/20 pt-2.5">
          <span className="text-xs text-muted-foreground">
            Сброс локальных параметров
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 text-rose-500 hover:text-rose-600"
            onClick={() => {
              haptic.warning();
              resetPreferences();
              toast.info("Настройки интерфейса сброшены");
            }}
          >
            <ArrowsClockwise size={12} className="mr-1" />
            Сбросить
          </Button>
        </div>
      </div>

      {/* Dev Mode Switcher */}
      <div className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <ShieldCheck size={16} />
          <span>Переключение роли (Dev Mode)</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Эмуляция студента и куратора для тестирования очередей в браузере:
        </span>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            size="sm"
            variant={user?.role === "student" ? "default" : "subtle"}
            onClick={() => {
              haptic.selection();
              switchMockUser("student");
            }}
          >
            Студент
          </Button>
          <Button
            size="sm"
            variant={user?.role === "curator" ? "default" : "subtle"}
            onClick={() => {
              haptic.selection();
              switchMockUser("curator");
            }}
          >
            Куратор
          </Button>
        </div>

        {/* Custom Telegram ID for testing */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
          <span className="text-[11px] text-muted-foreground">
            Или задайте свой Telegram ID для тестирования:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="TG ID (напр. 12345678)"
              value={customTgIdInput}
              onChange={(e) => setCustomTgIdInput(e.target.value)}
              className="flex-1 bg-secondary/50 rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <Button
              size="sm"
              variant="subtle"
              className="text-xs h-7"
              onClick={async () => {
                const id = parseInt(customTgIdInput.trim());
                if (!id) return;
                haptic.selection();
                await setCustomDevUser(id, user?.name || `Пользователь ${id}`, "curator");
                toast.success(`Установлен TG ID: ${id}`);
                setCustomTgIdInput("");
              }}
            >
              Задать
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
