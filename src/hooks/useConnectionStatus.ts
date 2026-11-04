import { useState, useEffect } from "react";
import { wsService, ConnectionStatus } from "@/services/ws";

export function useConnectionStatus(): ConnectionStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>(wsService.getStatus());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = wsService.onStatusChange((newStatus) => {
      setWsStatus(newStatus);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  if (!isOnline) {
    return "disconnected";
  }

  return wsStatus;
}
