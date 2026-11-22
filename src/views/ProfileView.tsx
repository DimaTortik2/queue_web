import { useState } from 'react';
import { toast } from 'sonner';
import {
  PencilSimple,
  Check,
  CaretRight,
  X,
  Sun,
  Moon,
  Desktop,
  Vibrate,
  SpeakerHigh,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { useUserStore } from '@/store/userStore';
import {
  usePreferencesStore,
  normalizeAccentHex,
} from '@/store/preferencesStore';
import { AccentColorDrawer } from '@/components/profile/AccentColorDrawer';
import { Button } from '@/components/ui/button';
import { SlotAvatar } from '@/components/ui/SlotAvatar';
import { haptic } from '@/lib/telegram';
import { sound } from '@/lib/sound';

export function ProfileView() {
  const { user, updateUserName } = useUserStore();
  const {
    theme,
    setTheme,
    accentMode,
    customColor,
    hapticsEnabled,
    toggleHaptics,
    soundsEnabled,
    toggleSounds,
    disableSwapPopups,
    toggleDisableSwapPopups,
  } = usePreferencesStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isAccentDrawerOpen, setIsAccentDrawerOpen] = useState(false);
  const accentLabel = accentMode === 'custom'
    ? normalizeAccentHex(customColor)?.toUpperCase() ?? 'По умолчанию'
    : 'По умолчанию';

  const handleStartEditName = () => {
    haptic.selection();
    setNameInput(user?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setIsSavingName(true);
    try {
      await updateUserName(nameInput.trim());
      haptic.success();
      toast.success('Имя профиля обновлено');
      setIsEditingName(false);
    } catch {
      haptic.error();
      toast.error('Не удалось обновить имя');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-32 max-w-lg mx-auto w-full select-none native-page-enter">
      {/* Account Info Card */}
      <div className="bg-card rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <SlotAvatar
            photoUrl={user?.photo_url}
            name={user?.name}
            isMe={true}
            size={52}
          />

          <div className="flex flex-col flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ваше имя..."
                  className="min-w-0 flex-1 bg-secondary rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 border-0 outline-none"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSaveName}
                  disabled={isSavingName || !nameInput.trim()}
                  className="h-9 w-9 p-0 rounded-xl shrink-0"
                >
                  <Check size={16} weight="bold" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsEditingName(false)}
                  className="h-9 w-9 p-0 rounded-xl shrink-0"
                >
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5 min-w-0">
                <span className="text-base font-bold tracking-tight text-foreground truncate">
                  {user?.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {!isEditingName && (
          <button
            onClick={handleStartEditName}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all tap-press shrink-0"
            title="Изменить имя"
          >
            <PencilSimple size={18} />
          </button>
        )}
      </div>

      {/* Unified Settings Card */}
      <div className="bg-card rounded-2xl p-5 flex flex-col gap-5">
        {/* Sub-block 1: Theme Selection */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Тема оформления
          </span>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                haptic.selection();
                setTheme('system');
              }}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all ${
                theme === 'system'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <Desktop
                size={20}
                weight={theme === 'system' ? 'fill' : 'regular'}
              />
              <span>Системная</span>
            </button>

            <button
              onClick={() => {
                haptic.selection();
                setTheme('light');
              }}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <Sun size={20} weight={theme === 'light' ? 'fill' : 'regular'} />
              <span>Светлая</span>
            </button>

            <button
              onClick={() => {
                haptic.selection();
                setTheme('dark');
              }}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <Moon size={20} weight={theme === 'dark' ? 'fill' : 'regular'} />
              <span>Темная</span>
            </button>
          </div>
        </div>

        {/* Sub-block 2: Accent Color Selection */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Цвет акцента
          </span>

          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`Цвет акцента, ${accentLabel}`}
            onClick={() => {
              haptic.selection();
              setIsAccentDrawerOpen(true);
            }}
            className="tap-press flex min-h-12 w-full items-center gap-3 rounded-xl bg-secondary px-3.5 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-secondary/80"
          >
            <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border border-foreground/15 bg-primary" />
            <span className="flex-1">{accentLabel}</span>
            <CaretRight aria-hidden="true" size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Sub-block 3: Haptics Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Vibrate size={20} className="text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground">
                Виброотклик
              </span>
              <span className="text-[11px] text-muted-foreground">
                Тактильная отдача в интерфейсе
              </span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hapticsEnabled}
            onClick={() => {
              toggleHaptics();
              sound.switch();
              if (!hapticsEnabled) haptic.success();
            }}
            className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
              hapticsEnabled ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full shadow-sm transition-transform duration-150 absolute top-1 border border-black/15 dark:border-white/15 ${
                hapticsEnabled
                  ? 'left-6 bg-primary-foreground'
                  : 'left-1 bg-foreground/70'
              }`}
            />
          </button>
        </div>

        {/* Sub-block 4: Sounds Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <SpeakerHigh size={20} className="text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground">
                Звуковые эффекты
              </span>
              <span className="text-[11px] text-muted-foreground">
                Звуки уведомлений и действий в приложении
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {soundsEnabled && (
              <button
                type="button"
                onClick={() => sound.turn()}
                className="text-[11px] font-semibold text-primary px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all"
                title="Прослушать пример звука"
              >
                Тест
              </button>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={soundsEnabled}
              onClick={() => {
                const willEnable = !soundsEnabled;
                toggleSounds();
                if (willEnable) {
                  haptic.success();
                  sound.success();
                } else {
                  sound.switch();
                }
              }}
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
                soundsEnabled ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full shadow-sm transition-transform duration-150 absolute top-1 border border-black/15 dark:border-white/15 ${
                  soundsEnabled
                    ? 'left-6 bg-primary-foreground'
                    : 'left-1 bg-foreground/70'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sub-block 5: Disable Swap Popups Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <ArrowsLeftRight size={20} className="text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground">
                Отключить всплывающее окно обмена
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                Предложения об обмене местами не будут всплывать, перекрывая экран, а будут просто ждать в соответствующей вкладке
              </span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={disableSwapPopups}
            onClick={() => {
              toggleDisableSwapPopups();
              sound.switch();
              if (!disableSwapPopups) haptic.success();
              else haptic.selection();
            }}
            className={`w-12 h-7 rounded-full transition-colors relative tap-press active:scale-95 shrink-0 ${
              disableSwapPopups ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full shadow-sm transition-transform duration-150 absolute top-1 border border-black/15 dark:border-white/15 ${
                disableSwapPopups
                  ? 'left-6 bg-primary-foreground'
                  : 'left-1 bg-foreground/70'
              }`}
            />
          </button>
        </div>
      </div>
      {isAccentDrawerOpen && (
        <AccentColorDrawer onClose={() => setIsAccentDrawerOpen(false)} />
      )}
    </div>
  );
}
