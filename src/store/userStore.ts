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
        let remoteUser: UserResponse | null = null;
        try {
          // 1. Проверяем, существует ли уже пользователь в базе
          remoteUser = await api.getUserByTgId(tgUser.id);
        } catch {
          // Пользователь еще не создан в БД (404)
          remoteUser = null;
        }

        if (!remoteUser) {
          // 2. Создаем только при первой регистрации
          const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");
          const userData = {
            name: fullName || `User ${tgUser.id}`,
            tg_id: tgUser.id,
            photo_url: tgUser.photo_url || null,
            role: "student" as const,
          };
          await api.upsertUser(userData);
          remoteUser = await api.getUserByTgId(tgUser.id);
        }

        set({ user: remoteUser, isLoading: false });
      } else {
        // Запуск вне Telegram (в обычном браузере)
        const isLocalDev =
          import.meta.env.DEV ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          new URLSearchParams(window.location.search).has("dev");

        if (isLocalDev) {
          // Локальная разработка: позволяем тестировать разработчику
          try {
            let remoteUser: UserResponse | null = null;
            try {
              remoteUser = await api.getUserByTgId(DEV_USER.tg_id);
            } catch {
              remoteUser = null;
            }

            if (!remoteUser) {
              await api.upsertUser(DEV_USER);
              remoteUser = await api.getUserByTgId(DEV_USER.tg_id);
            }
            set({ user: remoteUser, isLoading: false });
          } catch {
            set({ user: DEV_USER, isLoading: false });
          }
        } else {
          // В продакшене/обычном браузере: не логинимся под фейковым юзером
          set({ user: null, isLoading: false });
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
        set({ user: null, isLoading: false });
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
