import { create } from "zustand";
import { UserResponse } from "@/types";
import { getTelegramUser } from "@/lib/telegram";
import { api } from "@/services/api";

interface UserState {
  user: UserResponse | null;
  isLoading: boolean;
  error: string | null;
  initUser: () => Promise<void>;
  setUser: (user: UserResponse | null) => void;
  updateUserName: (name: string) => Promise<void>;
}

// Default development fallback user
const DEV_USER: UserResponse = {
  id: 1,
  name: "Пользователь",
  tg_id: 100001,
  photo_url: null,
  role: "student",
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
        const userData = {
          name: fullName || `User ${tgUser.id}`,
          tg_id: tgUser.id,
          photo_url: tgUser.photo_url || null,
          role: "student" as const,
        };
        await api.upsertUser(userData);
        const remoteUser = await api.getUserByTgId(tgUser.id);
        set({ user: remoteUser, isLoading: false });
      } else {
        // Fallback for desktop dev browser: auto-register standard dev user
        try {
          await api.upsertUser(DEV_USER);
          const remoteUser = await api.getUserByTgId(DEV_USER.tg_id);
          set({ user: remoteUser, isLoading: false });
        } catch {
          set({ user: DEV_USER, isLoading: false });
        }
      }
    } catch (err: unknown) {
      console.warn("Failed to init user via backend:", err);
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
        set({ user: DEV_USER, isLoading: false });
      }
    }
  },

  setUser: (user) => set({ user }),

  updateUserName: async (name: string) => {
    const { user } = get();
    if (!user) return;
    try {
      await api.updateUser(user.tg_id, { name });
      const updated = await api.getUserByTgId(user.tg_id);
      set({ user: updated });
    } catch {
      set({ user: { ...user, name } });
    }
  },
}));
