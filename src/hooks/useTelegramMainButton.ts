import { useEffect, useRef } from "react";
import { tg, haptic } from "@/lib/telegram";

interface UseTelegramMainButtonOptions {
  text: string;
  isVisible: boolean;
  isEnabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function useTelegramMainButton({
  text,
  isVisible,
  isEnabled = true,
  isLoading = false,
  onClick,
}: UseTelegramMainButtonOptions) {
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    const webApp = tg();
    const mainButton = webApp?.MainButton;
    if (!mainButton) return;

    if (isVisible) {
      mainButton.setText(text);
      mainButton.show();

      if (isEnabled && !isLoading) {
        mainButton.enable();
      } else {
        mainButton.disable();
      }

      if (isLoading) {
        mainButton.showProgress(false);
      } else {
        mainButton.hideProgress();
      }

      const handler = () => {
        haptic.light();
        onClickRef.current();
      };

      mainButton.onClick(handler);

      return () => {
        mainButton.offClick(handler);
        mainButton.hide();
      };
    } else {
      mainButton.hide();
    }
  }, [text, isVisible, isEnabled, isLoading]);
}
