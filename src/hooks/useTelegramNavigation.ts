import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { tg, haptic } from "@/lib/telegram";

export function useTelegramNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const webApp = tg();
    if (!webApp?.BackButton) return;

    const isRoot = location.pathname === "/";

    if (isRoot) {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();

      const handleBack = () => {
        haptic.selection();
        navigate(-1);
      };

      webApp.BackButton.onClick(handleBack);

      return () => {
        webApp.BackButton.offClick(handleBack);
      };
    }
  }, [location.pathname, navigate]);
}
