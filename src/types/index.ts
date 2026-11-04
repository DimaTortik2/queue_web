export type Role = "student" | "curator";

export interface User {
  name: string;
  tg_id: number;
  photo_url?: string | null;
  role: Role;
}

export interface UserResponse extends User {
  id: number;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
}

export interface UserUpdate {
  name?: string;
  photo_url?: string | null;
  role?: Role;
}

export interface SetRoleDto {
  role: Role;
}

export interface Subject {
  name: string;
}

export interface SubjectResponse extends Subject {
  id: number;
}

export interface ListOfSubjects {
  subject_list: SubjectResponse[];
  total: number;
}

export interface QueueUserInfo {
  name?: string | null;
  tg_id?: number | null;
  position: number;
  target_position?: number | null;
  photo_url?: string | null;
  is_free: boolean;
}

export interface QueueResponse {
  subject: string;
  queue: QueueUserInfo[];
  total_positions: number;
  taken_positions: number;
  is_paused: boolean;
}

export interface QueueMetaInfo {
  subject: string;
  subject_name: string;
  queue_type: string;
  created_by_tg_id: number;
  created_by_name?: string | null;
  created_at: string;
  taken_positions: number;
  total_positions: number;
  is_paused: boolean;
}

export interface QueueListResponse {
  queues: QueueMetaInfo[];
  total: number;
}

export interface MyPositionResponse {
  in_queue: boolean;
  subject: string;
  position?: number | null;
  people_ahead: number;
  is_next: boolean;
  estimated_wait_minutes: number;
}

export interface SwapCandidate {
  position: number;
  tg_id: number;
  name: string;
  photo_url?: string | null;
  slots_difference: number;
}

export interface QueueStatsResponse {
  subject: string;
  total_positions: number;
  taken_positions: number;
  free_positions: number;
  occupancy_percent: number;
  is_paused: boolean;
  active_swap_requests: number;
}

export interface QueueHistoryItem {
  timestamp: string;
  action: string;
  details: string;
}

export type SwapStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export interface SwapRequestInfo {
  id: string;
  subject: string;
  from_tg_id: number;
  to_tg_id: number;
  from_position: number;
  to_position: number;
  from_name?: string | null;
  to_name?: string | null;
  message: string;
  status: SwapStatus;
  response_message?: string | null;
  created_at: string;
}

export interface SwapRequestListResponse {
  requests: SwapRequestInfo[];
  total: number;
}

export interface UserDto {
  tg_id: number;
  position: number;
}

export interface QueueCreateDto {
  subject_name: string;
  queue_type: string;
  created_by_tg_id: number;
}

export interface KickDto {
  curator_tg_id: number;
  target_tg_id: number;
}

export interface AdvanceQueueDto {
  curator_tg_id: number;
}

export interface PauseQueueDto {
  curator_tg_id: number;
  paused: boolean;
}

export interface ClearQueueDto {
  curator_tg_id: number;
}

export interface SwapRequestCreateDto {
  from_tg_id: number;
  to_position: number;
  message: string;
}

export interface SwapRequestRespondDto {
  tg_id: number;
  message?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

// ──────────────────── WebSocket Realtime Event Schemas ────────────────────

export type RoomEventType =
  | "queue_updated"
  | "queue_advanced"
  | "queue_paused"
  | "queue_resumed"
  | "queue_cleared"
  | "queue_deleted"
  | "swap_request_created"
  | "swap_request_accepted"
  | "swap_request_rejected"
  | "swap_request_cancelled";

export interface RoomWsMessage {
  event: RoomEventType;
  subject?: string;
  data?: QueueResponse | SwapRequestInfo;
  swap?: SwapRequestInfo;
  is_paused?: boolean;
  completed_tg_id?: number;
  kicked_tg_id?: number;
}

export type UserEventType =
  | "connected"
  | "incoming_swap_request"
  | "swap_accepted"
  | "swap_rejected"
  | "swap_cancelled"
  | "your_turn"
  | "submission_completed"
  | "kicked";

export interface UserWsMessage {
  event: UserEventType;
  subject?: string;
  message?: string;
  data?: SwapRequestInfo;
}
