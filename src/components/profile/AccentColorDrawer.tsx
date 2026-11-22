import { useId, useState, type CSSProperties } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { haptic } from '@/lib/telegram';
import {
  DEFAULT_ACCENT_HEX,
  hexToHsl,
  normalizeAccentHex,
  usePreferencesStore,
  type AccentMode,
} from '@/store/preferencesStore';

const PRESETS = [
  { label: 'По умолчанию', hex: DEFAULT_ACCENT_HEX },
  { label: 'Синий', hex: '#2563eb' },
  { label: 'Голубой', hex: '#0369a1' },
  { label: 'Бирюзовый', hex: '#0f766e' },
  { label: 'Зелёный', hex: '#15803d' },
  { label: 'Оранжевый', hex: '#c2410c' },
  { label: 'Розовый', hex: '#be185d' },
  { label: 'Графитовый', hex: '#475569' },
];

type ColorChannels = Pick<ReturnType<typeof hexToHsl>, 'h' | 's' | 'l'>;

function channelsToHex({ h, s, l }: ColorChannels) {
  const lightness = l / 100;
  const chroma = (s / 100) * Math.min(lightness, 1 - lightness);
  const channel = (offset: number) => {
    const hue = (offset + h / 30) % 12;
    const value = lightness - chroma * Math.max(-1, Math.min(hue - 3, 9 - hue, 1));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

interface AccentColorSliderProps {
  label: string;
  value: number;
  max: number;
  gradient: string;
  onChange: (value: number) => void;
}

function AccentColorSlider({ label, value, max, gradient, onChange }: AccentColorSliderProps) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="accent-color-range"
        style={{ '--accent-color-track': gradient } as CSSProperties}
      />
    </label>
  );
}

export function AccentColorDrawer({ onClose }: { onClose: () => void }) {
  const { accentMode, customColor, setAccentMode, setCustomColor } = usePreferencesStore();
  const savedHex = normalizeAccentHex(customColor) ?? DEFAULT_ACCENT_HEX;
  const [mode, setMode] = useState<AccentMode>(accentMode);
  const [hexInput, setHexInput] = useState(savedHex);
  const [channels, setChannels] = useState<ColorChannels>(() => hexToHsl(savedHex));
  const [isCustomOpen, setIsCustomOpen] = useState(
    accentMode === 'custom' && !PRESETS.some(({ hex }) => hex === savedHex && hex !== DEFAULT_ACCENT_HEX),
  );
  const hexId = useId();
  const hex = normalizeAccentHex(hexInput);
  const isValid = mode === 'default' || hex !== null;
  const previewHex = mode === 'default' ? DEFAULT_ACCENT_HEX : (hex ?? channelsToHex(channels));
  const { h, s, l } = channels;

  const selectPreset = (presetHex: string) => {
    haptic.selection();
    const isDefault = presetHex === DEFAULT_ACCENT_HEX;
    setMode(isDefault ? 'default' : 'custom');
    if (!isDefault) {
      setHexInput(presetHex);
      setChannels(hexToHsl(presetHex));
    }
  };

  const changeHex = (input: string) => {
    setMode('custom');
    setHexInput(input);
    const normalized = normalizeAccentHex(input);
    if (normalized) setChannels(hexToHsl(normalized));
  };

  const changeChannel = (channel: keyof ColorChannels, value: number) => {
    const next = { ...channels, [channel]: value };
    setMode('custom');
    setChannels(next);
    setHexInput(channelsToHex(next));
  };

  const applyColor = () => {
    if (mode === 'default') setAccentMode('default');
    else if (hex) setCustomColor(hex);
    else return;

    haptic.selection();
    onClose();
  };

  return (
    <Drawer open repositionInputs onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="shrink-0 px-6 pt-5 pb-3 text-left">
          <DrawerTitle className="text-xl">Цвет акцента</DrawerTitle>
          <DrawerDescription className="sr-only">Выберите цвет интерфейса.</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-2">
          <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-full border border-foreground/15" style={{ backgroundColor: previewHex }} />
            <span className="text-sm font-semibold">
              {mode === 'default' ? 'По умолчанию' : previewHex.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Палитра акцентов">
            {PRESETS.map(({ label, hex: presetHex }) => {
              const isSelected = presetHex === DEFAULT_ACCENT_HEX
                ? mode === 'default'
                : mode === 'custom' && hex === presetHex;
              return (
                <button
                  key={presetHex}
                  type="button"
                  aria-label={label}
                  aria-pressed={isSelected}
                  title={label}
                  onClick={() => selectPreset(presetHex)}
                  style={{ backgroundColor: presetHex }}
                  className="tap-press grid h-12 place-items-center rounded-xl text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {isSelected && <Check aria-hidden="true" size={20} weight="bold" />}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-secondary/70">
            <button
              type="button"
              aria-expanded={isCustomOpen}
              onClick={() => setIsCustomOpen(!isCustomOpen)}
              className="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl px-4 text-left text-sm font-semibold"
            >
              Свой цвет
              <CaretDown aria-hidden="true" size={16} className={isCustomOpen ? 'rotate-180' : undefined} />
            </button>

            {isCustomOpen && (
              <div data-vaul-no-drag="" className="space-y-2 px-4 pb-4">
                <AccentColorSlider
                  label="Оттенок"
                  value={h}
                  max={360}
                  gradient="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
                  onChange={(value) => changeChannel('h', value)}
                />
                <AccentColorSlider
                  label="Насыщенность"
                  value={s}
                  max={100}
                  gradient={`linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`}
                  onChange={(value) => changeChannel('s', value)}
                />
                <AccentColorSlider
                  label="Светлота"
                  value={l}
                  max={100}
                  gradient={`linear-gradient(to right, #000, hsl(${h}, ${s}%, 50%), #fff)`}
                  onChange={(value) => changeChannel('l', value)}
                />
                <div className="flex items-center gap-3 rounded-xl bg-card px-3">
                  <label htmlFor={hexId} className="text-xs font-semibold text-muted-foreground">HEX</label>
                  <input
                    id={hexId}
                    type="text"
                    value={hexInput}
                    placeholder="#7C3AED"
                    onChange={(event) => changeHex(event.currentTarget.value)}
                    aria-invalid={!isValid}
                    aria-describedby={isValid ? undefined : `${hexId}-error`}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="h-11 min-w-0 flex-1 rounded-lg bg-transparent px-1 font-mono text-base uppercase"
                  />
                </div>
                {!isValid && (
                  <p id={`${hexId}-error`} className="text-xs text-destructive">Введите 3 или 6 символов HEX.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="shrink-0 flex-row gap-2 px-6 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="button" className="flex-1" disabled={!isValid} aria-disabled={!isValid} onClick={applyColor}>
            Применить
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
