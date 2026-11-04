import { create } from "zustand";
import { SwapRequestInfo } from "@/types";

export interface UrgentAlert {
  type: "your_turn" | "submission_completed" | "kicked";
  subject?: string;
  message: string;
  timestamp: number;
}

interface NotificationState {
  urgentAlert: UrgentAlert | null;
  activeSwapProposal: SwapRequestInfo | null;
  pendingIncomingCount: number;
  setUrgentAlert: (alert: UrgentAlert | null) => void;
  dismissUrgentAlert: () => void;
  setActiveSwapProposal: (proposal: SwapRequestInfo | null) => void;
  setPendingIncomingCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  urgentAlert: null,
  activeSwapProposal: null,
  pendingIncomingCount: 0,

  setUrgentAlert: (alert) => set({ urgentAlert: alert }),
  dismissUrgentAlert: () => set({ urgentAlert: null }),
  setActiveSwapProposal: (proposal) => set({ activeSwapProposal: proposal }),
  setPendingIncomingCount: (count) => set({ pendingIncomingCount: count }),
}));
