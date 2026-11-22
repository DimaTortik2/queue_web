import { getTelegramInitData } from "@/lib/telegram";
import {
  User,
  UserResponse,
  UserListResponse,
  UserUpdate,
  SetRoleDto,
  ListOfSubjects,
  SubjectResponse,
  QueueListResponse,
  QueueResponse,
  MyPositionResponse,
  SwapCandidate,
  QueueStatsResponse,
  QueueHistoryItem,
  QueueCreateDto,
  UserDto,
  KickDto,
  AdvanceQueueDto,
  PauseQueueDto,
  ClearQueueDto,
  UpdateAutoDeleteDto,
  SwapRequestInfo,
  SwapRequestListResponse,
  SwapRequestCreateDto,
  SwapRequestRespondDto,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const initData = getTelegramInitData();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (initData) {
    headers["X-Telegram-Init-Data"] = initData;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      // ignore json parse error
    }
    throw new ApiError(response.status, errorDetail);
  }

  // Handle 204 or empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return {} as T;
}

export const api = {
  getAuthMe: () => request<{ tg_id: number; is_admin: boolean }>("/api/auth/me"),

  // Users
  getUsers: (params?: { search?: string; role?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.role) q.append("role", params.role);
    if (params?.skip !== undefined) q.append("skip", String(params.skip));
    if (params?.limit !== undefined) q.append("limit", String(params.limit));
    return request<UserListResponse>(`/api/users?${q.toString()}`);
  },

  getUserByTgId: (tgId: number) => request<UserResponse>(`/api/users/${tgId}`),

  upsertUser: (userData: User) =>
    request<{ message: string; id: number; tg_id: number; role: string }>("/api/users/add_user", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  updateUser: (tgId: number, data: UserUpdate) =>
    request<{ message: string }>(`/api/users/${tgId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  setUserRole: (tgId: number, data: SetRoleDto) =>
    request<UserResponse>(`/api/users/${tgId}/role`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteUser: (tgId: number) =>
    request<{ message: string }>(`/api/users/${tgId}`, {
      method: "DELETE",
    }),

  // Subjects
  getSubjects: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<ListOfSubjects>(`/api/subjects${q}`);
  },

  createSubject: (name: string) =>
    request<SubjectResponse>("/api/subjects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  deleteSubject: (id: number) =>
    request<{ status: string }>(`/api/subjects/${id}`, {
      method: "DELETE",
    }),

  deleteSubjectByName: (name: string) =>
    request<{ status: string }>(`/api/subjects/by-name/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),

  // Queues
  listQueues: (params?: { search?: string; subject_name?: string; is_paused?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.subject_name) q.append("subject_name", params.subject_name);
    if (params?.is_paused !== undefined) q.append("is_paused", String(params.is_paused));
    return request<QueueListResponse>(`/queue/list?${q.toString()}`);
  },

  getUserQueues: (tgId: number) =>
    request<{ queues: QueueListResponse["queues"]; total: number }>(`/queue/user/${tgId}/queues`),

  getQueue: (subject: string) => request<QueueResponse>(`/queue/${encodeURIComponent(subject)}`),

  getMyPosition: (subject: string, tgId: number) =>
    request<MyPositionResponse>(`/queue/${encodeURIComponent(subject)}/my-position/${tgId}`),

  getSwapCandidates: (subject: string, tgId: number) =>
    request<SwapCandidate[]>(`/queue/${encodeURIComponent(subject)}/swap-candidates/${tgId}`),

  getQueueStats: (subject: string) =>
    request<QueueStatsResponse>(`/queue/${encodeURIComponent(subject)}/stats`),

  getQueueHistory: (subject: string, limit = 20) =>
    request<{ subject: string; history: QueueHistoryItem[]; total: number }>(
      `/queue/${encodeURIComponent(subject)}/history?limit=${limit}`
    ),

  createQueue: (data: QueueCreateDto) =>
    request<{ status: string; data: unknown }>("/queue/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  joinQueue: (subject: string, data: UserDto) =>
    request<{ status: string }>(`/queue/${encodeURIComponent(subject)}/join`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  leaveQueue: (subject: string, data: UserDto) =>
    request<{ status: string }>(`/queue/${encodeURIComponent(subject)}/leave`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  moveQueuePosition: (subject: string, data: UserDto) =>
    request<{ status: string; position?: number }>(
      `/queue/${encodeURIComponent(subject)}/move`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ).catch(async (err: unknown) => {
      // Graceful fallback if backend has not reloaded /move endpoint yet
      const status = err instanceof ApiError ? err.status : undefined;
      const message = err instanceof Error ? err.message : String(err);
      if (status === 404 || message.includes("404")) {
        await api.leaveQueue(subject, { tg_id: data.tg_id, position: 0 });
        return api.joinQueue(subject, data);
      }
      throw err;
    }),

  kickFromQueue: (subject: string, data: KickDto) =>
    request<{ status: string }>(`/queue/${encodeURIComponent(subject)}/kick`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  advanceQueue: (subject: string, data: AdvanceQueueDto) =>
    request<{ status: string; completed_tg_id: number }>(
      `/queue/${encodeURIComponent(subject)}/advance`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  pauseQueue: (subject: string, data: PauseQueueDto) =>
    request<{ status: string; data: unknown }>(`/queue/${encodeURIComponent(subject)}/pause`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAutoDelete: (subject: string, data: UpdateAutoDeleteDto) =>
    request<{ status: string; data: unknown }>(`/queue/${encodeURIComponent(subject)}/auto-delete`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  clearQueue: (subject: string, data: ClearQueueDto) =>
    request<{ status: string; data: unknown }>(`/queue/${encodeURIComponent(subject)}/clear`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteQueue: (subject: string, curatorTgId: number) =>
    request<{ status: string }>(`/queue/${encodeURIComponent(subject)}?curator_tg_id=${curatorTgId}`, {
      method: "DELETE",
    }),

  directSwap: (subject: string, data: { position1: number; position2: number }) =>
    request<{ status: string }>(`/queue/${encodeURIComponent(subject)}/swap`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Swap requests
  createSwapRequest: (subject: string, data: SwapRequestCreateDto) =>
    request<{ status: string; data: SwapRequestInfo }>(
      `/queue/${encodeURIComponent(subject)}/swap-request`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getIncomingSwapRequests: (subject: string, tgId: number) =>
    request<SwapRequestListResponse>(
      `/queue/${encodeURIComponent(subject)}/swap-requests/incoming/${tgId}`
    ),

  getOutgoingSwapRequests: (subject: string, tgId: number) =>
    request<SwapRequestListResponse>(
      `/queue/${encodeURIComponent(subject)}/swap-requests/outgoing/${tgId}`
    ),

  acceptSwapRequest: (requestId: string, data: SwapRequestRespondDto) =>
    request<{ status: string; data: SwapRequestInfo }>(
      `/queue/swap-request/${requestId}/accept`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  rejectSwapRequest: (requestId: string, data: SwapRequestRespondDto) =>
    request<{ status: string; data: SwapRequestInfo }>(
      `/queue/swap-request/${requestId}/reject`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  cancelSwapRequest: (requestId: string, data: SwapRequestRespondDto) =>
    request<{ status: string; data: SwapRequestInfo }>(
      `/queue/swap-request/${requestId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
};
