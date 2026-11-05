import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  PencilSimple,
  Check,
  X,
  Sun,
  Moon,
  Desktop,
  Vibrate,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useUserStore } from '@/store/userStore';
import {
  usePreferencesStore,
  DEFAULT_ACCENT_HEX,
} from '@/store/preferencesStore';
import { Button } from '@/components/ui/button';
import { SlotAvatar } from '@/components/ui/SlotAvatar';
import { haptic } from '@/lib/telegram';

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

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleCustomTileClick = () => {
    haptic.selection();
    if (accentMode !== 'custom') {
      setAccentMode('custom');
    }
    colorInputRef.current?.click();
  };

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

          <div className="grid grid-cols-2 gap-2.5">
            {/* Default purple */}
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setAccentMode('default');
              }}
              style={{
                borderBottomColor:
                  accentMode === 'default'
                    ? DEFAULT_ACCENT_HEX
                    : `${DEFAULT_ACCENT_HEX}50`,
                backgroundColor:
                  accentMode === 'default' ? `${DEFAULT_ACCENT_HEX}20` : undefined,
              }}
              className={`flex items-center justify-center p-3.5 rounded-xl text-xs font-semibold transition-all border-0 border-b-4 outline-none select-none active:scale-[0.98] ${
                accentMode === 'default'
                  ? 'text-foreground font-bold shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <span>По умолчанию</span>
            </button>

            {/* Custom user color */}
            <input
              ref={colorInputRef}
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
              }}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={handleCustomTileClick}
              style={{
                borderBottomColor:
                  accentMode === 'custom'
                    ? customColor
                    : `${customColor}70`,
                backgroundColor:
                  accentMode === 'custom' ? `${customColor}20` : undefined,
              }}
              className={`relative flex items-center justify-center p-3.5 rounded-xl text-xs font-semibold transition-all border-0 border-b-4 outline-none select-none cursor-pointer active:scale-[0.98] ${
                accentMode === 'custom'
                  ? 'text-foreground font-bold shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <span className="font-mono text-xs uppercase tracking-wider">{customColor}</span>
            </button>
          </div>
        </div>

        {/* Sub-block 3: Haptics Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate size={20} className="text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">
                Виброотклик
              </span>
              <span className="text-[11px] text-muted-foreground">
                Тактильная отдача в интерфейсе
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              toggleHaptics();
              if (!hapticsEnabled) haptic.success();
            }}
            className={`w-12 h-7 rounded-full transition-colors relative ${
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

        {/* Sub-block 4: Reset Preferences */}
        <div className="flex items-center justify-between pt-0.5">
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
              toast.info('Настройки сброшены');
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
