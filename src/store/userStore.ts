import { create } from "zustand";
import { UserResponse, Role } from "@/types";
import { getTelegramUser } from "@/lib/telegram";
import { api } from "@/services/api";

interface UserState {
  user: UserResponse | null;
  isLoading: boolean;
  error: string | null;
  initUser: () => Promise<void>;
  setUser: (user: UserResponse | null) => void;
  setRole: (role: Role) => Promise<void>;
  switchMockUser: (type: "student" | "curator") => Promise<void>;
  setCustomDevUser: (tgId: number, name: string, role?: Role) => Promise<void>;
}

const MOCK_STUDENT: UserResponse = {
  id: 1,
  name: "Алексей Смирнов",
  tg_id: 100001,
  photo_url: null,
  role: "student",
};

const MOCK_CURATOR: UserResponse = {
  id: 2,
  name: "Преподаватель Иванов",
  tg_id: 100002,
  photo_url: null,
  role: "curator",
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  initUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const tgUser = getTelegramUser();

      if (tgUser) {
        const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");
        await api.upsertUser({
          name: fullName || `User ${tgUser.id}`,
          tg_id: tgUser.id,
          photo_url: tgUser.photo_url || null,
          role: "student",
        });

        const remoteUser = await api.getUserByTgId(tgUser.id);
        set({ user: remoteUser, isLoading: false });
      } else {
        // Fallback for desktop dev browser: auto-register mock user on backend
        try {
          await api.upsertUser(MOCK_CURATOR);
          const remoteUser = await api.getUserByTgId(MOCK_CURATOR.tg_id);
          set({ user: remoteUser, isLoading: false });
        } catch {
          set({ user: MOCK_CURATOR, isLoading: false });
        }
      }
    } catch (err: unknown) {
      console.warn("Failed to init user via backend:", err);
      // Fallback in case backend is offline during frontend design
      const tgUser = getTelegramUser();
      if (tgUser) {
        set({
          user: {
            id: 0,
            name: tgUser.first_name,
            tg_id: tgUser.id,
            photo_url: tgUser.photo_url || null,
            role: "student",
          },
          isLoading: false,
        });
      } else {
        set({ user: MOCK_CURATOR, isLoading: false });
      }
    }
  },

  setUser: (user) => set({ user }),

  setRole: async (role: Role) => {
    const { user } = get();
    if (!user) return;
    try {
      const updated = await api.setUserRole(user.tg_id, { role });
      set({ user: updated });
    } catch {
      set({ user: { ...user, role } });
    }
  },

  switchMockUser: async (type: "student" | "curator") => {
    const target = type === "student" ? MOCK_STUDENT : MOCK_CURATOR;
    try {
      await api.upsertUser(target);
      const remoteUser = await api.getUserByTgId(target.tg_id);
      set({ user: remoteUser });
    } catch {
      set({ user: target });
    }
  },

  setCustomDevUser: async (tgId: number, name: string, role: Role = "curator") => {
    const customUser = {
      name,
      tg_id: tgId,
      photo_url: null,
      role,
    };
    try {
      await api.upsertUser(customUser);
      const remoteUser = await api.getUserByTgId(tgId);
      set({ user: remoteUser });
    } catch {
      set({ user: { id: tgId, ...customUser } });
    }
  },
}));
