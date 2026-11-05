import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { wsService } from "@/services/ws";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";
import { usePreferencesStore } from "@/store/preferencesStore";
import { haptic } from "@/lib/telegram";
import { queueKeys } from "@/hooks/useQueueApi";
import { UserWsMessage, RoomWsMessage } from "@/types";

interface WebSocketContextType {
  subscribeToRoom: (subject: string) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  subscribeToRoom: () => () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUserStore();
  const queryClient = useQueryClient();
  const { setUrgentAlert, setActiveSwapProposal } = useNotificationStore();

  // ──────────────────── Personal User Socket ────────────────────
  useEffect(() => {
    if (!user?.tg_id) return;

    wsService.connectUser(user.tg_id);

    const unsubscribe = wsService.onUserEvent((msg: UserWsMessage) => {
      switch (msg.event) {
        case "incoming_swap_request": {
          haptic.warning();
          toast.info(msg.message || "Вам предложен обмен местами", { id: "incoming_swap" });
          const { disableSwapPopups } = usePreferencesStore.getState();
          if (msg.data && !disableSwapPopups) {
            setActiveSwapProposal(msg.data);
          }
          if (msg.subject) {
            queryClient.invalidateQueries({
              queryKey: queueKeys.incomingSwaps(msg.subject, user.tg_id),
            });
          }
          queryClient.invalidateQueries({
            queryKey: queueKeys.incomingSwaps("all", user.tg_id),
          });
          queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
          break;
        }

        case "swap_accepted":
          haptic.success();
          toast.success(msg.message || "Ваш запрос на обмен принят", { id: "swap_accepted" });
          if (msg.subject) {
            queryClient.invalidateQueries({ queryKey: queueKeys.detail(msg.subject) });
            queryClient.invalidateQueries({
              queryKey: queueKeys.myPosition(msg.subject, user.tg_id),
            });
          }
          queryClient.invalidateQueries({ queryKey: queueKeys.userQueues(user.tg_id) });
          queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
          break;

        case "swap_rejected":
          haptic.error();
          toast.info(msg.message || "Запрос на обмен отклонен", { id: "swap_rejected" });
          if (msg.subject) {
            queryClient.invalidateQueries({
              queryKey: queueKeys.outgoingSwaps(msg.subject, user.tg_id),
            });
          }
          queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
          break;

        case "swap_cancelled":
          haptic.light();
          toast.info(msg.message || "Запрос на обмен отозван", { id: "swap_cancelled" });
          if (msg.subject) {
            queryClient.invalidateQueries({
              queryKey: queueKeys.incomingSwaps(msg.subject, user.tg_id),
            });
          }
          queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
          break;

        case "your_turn":
          haptic.heavy();
          setUrgentAlert({
            type: "your_turn",
            subject: msg.subject,
            message: msg.message || "Вы следующий в очереди! Подойдите к преподавателю.",
            timestamp: Date.now(),
          });
          toast.warning(msg.message || "Вы следующий в очереди!", { id: "your_turn" });
          break;

        case "submission_completed":
          haptic.success();
          setUrgentAlert({
            type: "submission_completed",
            subject: msg.subject,
            message: msg.message || "Ваша сдача завершена!",
            timestamp: Date.now(),
          });
          toast.success(msg.message || "Ваша сдача завершена", { id: "submission_completed" });
          if (msg.subject) {
            queryClient.invalidateQueries({ queryKey: queueKeys.detail(msg.subject) });
            queryClient.invalidateQueries({
              queryKey: queueKeys.myPosition(msg.subject, user.tg_id),
            });
          }
          queryClient.invalidateQueries({ queryKey: queueKeys.userQueues(user.tg_id) });
          break;

        case "kicked":
          haptic.error();
          setUrgentAlert({
            type: "kicked",
            subject: msg.subject,
            message: msg.message || "Вы были удалены из очереди создателем.",
            timestamp: Date.now(),
          });
          toast.error(msg.message || "Вы были удалены из очереди", { id: "kicked" });
          if (msg.subject) {
            queryClient.invalidateQueries({ queryKey: queueKeys.detail(msg.subject) });
            queryClient.invalidateQueries({
              queryKey: queueKeys.myPosition(msg.subject, user.tg_id),
            });
          }
          queryClient.invalidateQueries({ queryKey: queueKeys.userQueues(user.tg_id) });
          break;

        case "queue_created":
        case "queue_deleted":
        case "queue_paused":
        case "queue_resumed":
        case "queue_updated":
        case "queue_advanced":
        case "queue_cleared":
        case "swap_request_accepted":
          queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
          queryClient.invalidateQueries({ queryKey: queueKeys.all });
          if (msg.subject) {
            queryClient.invalidateQueries({ queryKey: queueKeys.detail(msg.subject) });
            queryClient.invalidateQueries({ queryKey: queueKeys.stats(msg.subject) });
            queryClient.invalidateQueries({
              queryKey: queueKeys.myPosition(msg.subject, user.tg_id),
            });
          }
          queryClient.invalidateQueries({ queryKey: queueKeys.userQueues(user.tg_id) });
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnectUser();
    };
  }, [user?.tg_id, queryClient, setUrgentAlert, setActiveSwapProposal]);

  // ──────────────────── Room Subscription Helper ────────────────────
  const subscribeToRoom = useCallback((subject: string) => {
    wsService.connectRoom(subject);

    const unsubscribe = wsService.onRoomEvent((msg: RoomWsMessage) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.stats(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.history(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });

      if (user?.tg_id) {
        queryClient.invalidateQueries({ queryKey: queueKeys.myPosition(subject, user.tg_id) });
        queryClient.invalidateQueries({ queryKey: queueKeys.swapCandidates(subject, user.tg_id) });
        queryClient.invalidateQueries({ queryKey: queueKeys.userQueues(user.tg_id) });
      }

      if (msg.event === "queue_deleted") {
        toast.info("Очередь была удалена создателем", { id: "queue_deleted" });
        queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
      } else if (msg.event === "queue_cleared") {
        toast.info("Очередь была очищена создателем", { id: "queue_cleared" });
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnectRoom();
    };
  }, [queryClient, user?.tg_id]);

  return (
    <WebSocketContext.Provider value={{ subscribeToRoom }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export function useRoomSubscription(subject: string | null) {
  const { subscribeToRoom } = useWebSocket();

  useEffect(() => {
    if (!subject) return;
    const cleanup = subscribeToRoom(subject);
    return cleanup;
  }, [subject, subscribeToRoom]);
}
