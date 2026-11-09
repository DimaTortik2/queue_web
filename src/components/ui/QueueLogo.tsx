import { useId, useState, useEffect } from "react";
import {
  usePreferencesStore,
  DEFAULT_ACCENT_HEX,
  hexToHsl,
} from "@/store/preferencesStore";

interface QueueLogoProps {
  className?: string;
  size?: number;
}

function hslToHex(h: number, s: number, l: number): string {
  const lFrac = l / 100;
  const a = (s * Math.min(lFrac, 1 - lFrac)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lFrac - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function getDarkenedAccent(hex: string): string {
  if (hex.toUpperCase() === "#35FFF8") {
    return "#00DBD4";
  }
  const { h, s, l } = hexToHsl(hex);
  const darkenedL = Math.max(l - 17, 10);
  return hslToHex(h, s, darkenedL);
}

export function QueueLogo({ className = "w-10 h-10", size = 40 }: QueueLogoProps) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `queue-logo-grad-${rawId}`;

  const { theme, accentMode, customColor } = usePreferencesStore();

  // Primary accent color (follows the app default purple #7c3aed, or user custom color)
  const accentColor =
    accentMode === "custom" && customColor && customColor.startsWith("#")
      ? customColor
      : DEFAULT_ACCENT_HEX;

  // Slightly darkened version of the accent color
  const darkenedColor = getDarkenedAccent(accentColor);

  // Track whether dark theme is currently active
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    const updateIsDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateIsDark();

    const observer = new MutationObserver(updateIsDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [theme]);

  // Dark theme: Stop 0 is crisp white (#ffffff), Stop 1 is accent color
  // Light theme: Stop 0 is darkened accent, Stop 1 is accent color
  const stop0Color = isDark ? "#ffffff" : darkenedColor;
  const stop1Color = accentColor;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="215.5"
          y1="199.5"
          x2="365.314"
          y2="369.983"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={stop0Color} />
          <stop offset="100%" stopColor={stop1Color} />
        </linearGradient>
      </defs>

      <path
        d="M251 361C275.301 361 295 380.699 295 405C295 429.301 275.301 449 251 449C226.699 449 207 429.301 207 405C207 380.699 226.699 361 251 361ZM180.5 86C215.997 86 246.38 107.888 258.893 138.903C288.51 208.001 307.771 216.779 370.418 221.137C407.02 223.416 436 253.824 436 291C436 329.66 404.66 361 366 361C338.733 361 315.109 345.41 303.552 322.657C274.158 267.444 258.086 253.744 181.88 254.988V254.987C181.421 254.995 180.961 255 180.5 255C133.832 255 96 217.168 96 170.5C96 123.832 133.832 86 180.5 86Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

/**
 * Monochrome navigation footer icon of the logo.
 * Takes Phosphor-like props (size, className, weight) and fills with currentColor
 * so it responds seamlessly to active/inactive tabs, transitions, and hover states.
 */
export interface QueueNavIconProps {
  size?: number | string;
  weight?: string;
  className?: string;
}

export function QueueNavIcon({ size = 20, className = "" }: QueueNavIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="50 40 432 432"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <path d="M251 361C275.301 361 295 380.699 295 405C295 429.301 275.301 449 251 449C226.699 449 207 429.301 207 405C207 380.699 226.699 361 251 361ZM180.5 86C215.997 86 246.38 107.888 258.893 138.903C288.51 208.001 307.771 216.779 370.418 221.137C407.02 223.416 436 253.824 436 291C436 329.66 404.66 361 366 361C338.733 361 315.109 345.41 303.552 322.657C274.158 267.444 258.086 253.744 181.88 254.988V254.987C181.421 254.995 180.961 255 180.5 255C133.832 255 96 217.168 96 170.5C96 123.832 133.832 86 180.5 86Z" />
    </svg>
  );
}
