import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/services/api";
import { haptic } from "@/lib/telegram";
import {
  UserDto,
  QueueCreateDto,
  KickDto,
  AdvanceQueueDto,
  PauseQueueDto,
  ClearQueueDto,
  SwapRequestCreateDto,
  SwapRequestRespondDto,
  SwapRequestListResponse,
  SetRoleDto,
} from "@/types";

// ──────────────────── Query Keys Factory ────────────────────

export const queueKeys = {
  all: ["queues"] as const,
  lists: () => [...queueKeys.all, "list"] as const,
  list: (params?: { search?: string; subject_name?: string; is_paused?: boolean }) =>
    [...queueKeys.lists(), params] as const,
  userQueues: (tgId: number) => [...queueKeys.all, "user", tgId] as const,
  detail: (subject: string) => [...queueKeys.all, "detail", subject] as const,
  myPosition: (subject: string, tgId: number) =>
    [...queueKeys.all, "my-position", subject, tgId] as const,
  swapCandidates: (subject: string, tgId: number) =>
    [...queueKeys.all, "swap-candidates", subject, tgId] as const,
  stats: (subject: string) => [...queueKeys.all, "stats", subject] as const,
  history: (subject: string) => [...queueKeys.all, "history", subject] as const,
  subjects: ["subjects"] as const,
  subjectsList: (search?: string) => [...queueKeys.subjects, search] as const,
  swaps: ["swaps"] as const,
  incomingSwaps: (subject: string, tgId: number) =>
    [...queueKeys.swaps, "incoming", subject, tgId] as const,
  outgoingSwaps: (subject: string, tgId: number) =>
    [...queueKeys.swaps, "outgoing", subject, tgId] as const,
  users: ["users"] as const,
  usersList: (params?: { search?: string; role?: string }) =>
    [...queueKeys.users, params] as const,
};

// ──────────────────── Queries ────────────────────

export function useUsersList(params?: { search?: string; role?: string }) {
  return useQuery({
    queryKey: queueKeys.usersList(params),
    queryFn: () => api.getUsers(params),
  });
}

export function useQueuesList(params?: {
  search?: string;
  subject_name?: string;
  is_paused?: boolean;
}) {
  return useQuery({
    queryKey: queueKeys.list(params),
    queryFn: () => api.listQueues(params),
  });
}

export function useUserActiveQueues(tgId: number | undefined) {
  return useQuery({
    queryKey: queueKeys.userQueues(tgId || 0),
    queryFn: () => (tgId ? api.getUserQueues(tgId) : Promise.resolve({ queues: [], total: 0 })),
    enabled: !!tgId,
  });
}

export function useQueueDetail(subject: string | null) {
  return useQuery({
    queryKey: queueKeys.detail(subject || ""),
    queryFn: () => (subject ? api.getQueue(subject) : Promise.reject("No subject")),
    enabled: !!subject,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useMyPosition(subject: string | null, tgId: number | undefined) {
  return useQuery({
    queryKey: queueKeys.myPosition(subject || "", tgId || 0),
    queryFn: () =>
      subject && tgId
        ? api.getMyPosition(subject, tgId)
        : Promise.reject("Missing subject or tgId"),
    enabled: !!subject && !!tgId,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useSwapCandidates(subject: string | null, tgId: number | undefined) {
  return useQuery({
    queryKey: queueKeys.swapCandidates(subject || "", tgId || 0),
    queryFn: () =>
      subject && tgId
        ? api.getSwapCandidates(subject, tgId)
        : Promise.resolve([]),
    enabled: !!subject && !!tgId,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useQueueStats(subject: string | null) {
  return useQuery({
    queryKey: queueKeys.stats(subject || ""),
    queryFn: () => (subject ? api.getQueueStats(subject) : Promise.reject("No subject")),
    enabled: !!subject,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useQueueHistory(subject: string | null) {
  return useQuery({
    queryKey: queueKeys.history(subject || ""),
    queryFn: () => (subject ? api.getQueueHistory(subject) : Promise.reject("No subject")),
    enabled: !!subject,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useSubjectsList(search?: string) {
  return useQuery({
    queryKey: queueKeys.subjectsList(search),
    queryFn: () => api.getSubjects(search),
  });
}

export function useIncomingSwaps(subject: string | null, tgId: number | undefined) {
  return useQuery({
    queryKey: queueKeys.incomingSwaps(subject || "", tgId || 0),
    queryFn: () =>
      subject && tgId
        ? api.getIncomingSwapRequests(subject, tgId)
        : Promise.resolve({ requests: [], total: 0 }),
    enabled: !!subject && !!tgId,
  });
}

export function useOutgoingSwaps(subject: string | null, tgId: number | undefined) {
  return useQuery({
    queryKey: queueKeys.outgoingSwaps(subject || "", tgId || 0),
    queryFn: () =>
      subject && tgId
        ? api.getOutgoingSwapRequests(subject, tgId)
        : Promise.resolve({ requests: [], total: 0 }),
    enabled: !!subject && !!tgId,
  });
}

// ──────────────────── Mutations ────────────────────

export function useJoinQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subject, data }: { subject: string; data: UserDto }) =>
      api.joinQueue(subject, data),
    onSuccess: (_, { subject, data }) => {
      haptic.success();
      toast.success(`Вы заняли место #${data.position}`, { id: `queue_join_${subject}` });
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.myPosition(subject, data.tg_id) });
      queryClient.invalidateQueries({ queryKey: queueKeys.userQueues(data.tg_id) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Не удалось занять место", { id: "queue_action_err" });
    },
  });
}

export function useLeaveQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subject, data }: { subject: string; data: UserDto }) =>
      api.leaveQueue(subject, data),
    onSuccess: (_, { subject, data }) => {
      haptic.medium();
      toast.info("Вы вышли из очереди", { id: `queue_leave_${subject}` });
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.myPosition(subject, data.tg_id) });
      queryClient.invalidateQueries({ queryKey: queueKeys.userQueues(data.tg_id) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка выхода из очереди", { id: "queue_action_err" });
    },
  });
}

export function useCreateSwapRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subject, data }: { subject: string; data: SwapRequestCreateDto }) =>
      api.createSwapRequest(subject, data),
    onSuccess: (_, { subject, data }) => {
      haptic.success();
      toast.success("Запрос на обмен отправлен", { id: "swap_req" });
      queryClient.invalidateQueries({ queryKey: queueKeys.outgoingSwaps(subject, data.from_tg_id) });
      queryClient.invalidateQueries({ queryKey: queueKeys.swapCandidates(subject, data.from_tg_id) });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка создания запроса на обмен", { id: "swap_err" });
    },
  });
}

export function useAcceptSwapMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      subject: string;
      data: SwapRequestRespondDto;
    }) => api.acceptSwapRequest(requestId, data),
    onMutate: async ({ requestId }) => {
      // Optimistically remove from all swap caches
      queryClient.setQueriesData<SwapRequestListResponse>(
        { queryKey: queueKeys.swaps },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            requests: old.requests.filter((r) => r.id !== requestId),
            total: Math.max(0, old.total - 1),
          };
        }
      );
    },
    onSuccess: (_, { subject, data }) => {
      haptic.success();
      toast.success("Обмен местами подтвержден", { id: "swap_accepted" });
      queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.myPosition(subject, data.tg_id) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queueKeys.userQueues(data.tg_id) });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка подтверждения обмена", { id: "swap_err" });
      queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
  });
}

export function useRejectSwapMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      subject: string;
      data: SwapRequestRespondDto;
    }) => api.rejectSwapRequest(requestId, data),
    onMutate: async ({ requestId }) => {
      queryClient.setQueriesData<SwapRequestListResponse>(
        { queryKey: queueKeys.swaps },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            requests: old.requests.filter((r) => r.id !== requestId),
            total: Math.max(0, old.total - 1),
          };
        }
      );
    },
    onSuccess: (_, { subject }) => {
      haptic.light();
      toast.info("Запрос на обмен отклонен");
      queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка отклонения обмена");
      queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
    },
  });
}

export function useCancelSwapMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      subject: string;
      data: SwapRequestRespondDto;
    }) => api.cancelSwapRequest(requestId, data),
    onMutate: async ({ requestId }) => {
      queryClient.setQueriesData<SwapRequestListResponse>(
        { queryKey: queueKeys.swaps },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            requests: old.requests.filter((r) => r.id !== requestId),
            total: Math.max(0, old.total - 1),
          };
        }
      );
    },
    onSuccess: () => {
      haptic.light();
      toast.info("Запрос на обмен отозван");
      queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка отмены запроса");
      queryClient.invalidateQueries({ queryKey: queueKeys.swaps });
    },
  });
}

// ──────────────────── Curator Actions ────────────────────

export function useCuratorAdvanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subject, data }: { subject: string; data: AdvanceQueueDto }) =>
      api.advanceQueue(subject, data),
    onSuccess: (_, { subject }) => {
      haptic.success();
      toast.success("Сдача завершена, очередь сдвинута");
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка продвижения очереди");
    },
  });
}

export function useCuratorPauseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subject, data }: { subject: string; data: PauseQueueDto }) =>
      api.pauseQueue(subject, data),
    onSuccess: (_, { subject, data }) => {
      haptic.medium();
      toast.info(data.paused ? "Очередь приостановлена" : "Очередь возобновлена");
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка изменения статуса очереди");
    },
  });
}

export function useCuratorClearMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subject, data }: { subject: string; data: ClearQueueDto }) =>
      api.clearQueue(subject, data),
    onSuccess: (_, { subject }) => {
      haptic.warning();
      toast.success("Очередь очищена");
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка очистки очереди");
    },
  });
}

export function useCuratorKickMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subject, data }: { subject: string; data: KickDto }) =>
      api.kickFromQueue(subject, data),
    onSuccess: (_, { subject }) => {
      haptic.warning();
      toast.success("Участник исключен из очереди");
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка исключения участника");
    },
  });
}

export function useCuratorDeleteQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subject, curatorTgId }: { subject: string; curatorTgId: number }) =>
      api.deleteQueue(subject, curatorTgId),
    onSuccess: () => {
      haptic.success();
      toast.success("Очередь удалена");
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка удаления очереди");
    },
  });
}

export function useCreateQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: QueueCreateDto) => api.createQueue(data),
    onSuccess: () => {
      haptic.success();
      toast.success("Очередь успешно создана");
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка создания очереди");
    },
  });
}

export function useCreateSubjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.createSubject(name),
    onSuccess: () => {
      haptic.success();
      toast.success("Предмет добавлен в каталог");
      queryClient.invalidateQueries({ queryKey: queueKeys.subjects });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка создания предмета");
    },
  });
}

export function useDeleteSubjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteSubject(id),
    onSuccess: () => {
      haptic.success();
      toast.info("Предмет удален");
      queryClient.invalidateQueries({ queryKey: queueKeys.subjects });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка удаления предмета");
    },
  });
}

export function useSetRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tgId, data }: { tgId: number; data: SetRoleDto }) =>
      api.setUserRole(tgId, data),
    onSuccess: (updated) => {
      haptic.success();
      toast.success(`Роль обновлена: ${updated.role === "curator" ? "Куратор" : "Студент"}`);
      queryClient.invalidateQueries({ queryKey: queueKeys.users });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка изменения роли");
    },
  });
}

export function useDirectSwapMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subject,
      data,
    }: {
      subject: string;
      data: { position1: number; position2: number };
    }) => api.directSwap(subject, data),
    onSuccess: (_, { subject }) => {
      haptic.success();
      toast.success("Места успешно обменены");
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(subject) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка прямого обмена");
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tgId: number) => api.deleteUser(tgId),
    onSuccess: () => {
      haptic.success();
      toast.info("Пользователь удален");
      queryClient.invalidateQueries({ queryKey: queueKeys.users });
    },
    onError: (err: Error) => {
      haptic.error();
      toast.error(err.message || "Ошибка удаления пользователя");
    },
  });
}
