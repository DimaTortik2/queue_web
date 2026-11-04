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

// Dev test users with demo avatar photos for easy local multi-user testing
const DEV_USERS: Record<string, UserResponse> = {
  "1": {
    id: 1,
    name: "Алексей Иванов",
    tg_id: 100001,
    photo_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face",
    role: "student",
  },
  "2": {
    id: 2,
    name: "Дарья Смирнова",
    tg_id: 100002,
    photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face",
    role: "student",
  },
  "3": {
    id: 3,
    name: "Максим Ковалев",
    tg_id: 100003,
    photo_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop&crop=face",
    role: "student",
  },
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
        const urlParams = new URLSearchParams(window.location.search);
        const isLocalDev =
          import.meta.env.DEV ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          urlParams.has("dev") ||
          urlParams.has("user");

        if (isLocalDev) {
          // Локальная разработка: поддержка нескольких тестовых пользователей для обмена
          const userKey = urlParams.get("user") || urlParams.get("dev") || "1";
          const devUser = DEV_USERS[userKey] || {
            id: Number(userKey) || 1,
            name: `Тестер ${userKey}`,
            tg_id: 100000 + (Number(userKey) || 1),
            photo_url: DEV_USERS["1"].photo_url,
            role: "student" as const,
          };

          try {
            let remoteUser: UserResponse | null = null;
            try {
              remoteUser = await api.getUserByTgId(devUser.tg_id);
            } catch {
              remoteUser = null;
            }

            if (!remoteUser) {
              await api.upsertUser(devUser);
              remoteUser = await api.getUserByTgId(devUser.tg_id);
            } else if (!remoteUser.photo_url && devUser.photo_url) {
              // Если у тестового юзера в базе еще нет фото — обновим его для теста
              await api.updateUser(devUser.tg_id, {
                photo_url: devUser.photo_url,
                name: remoteUser.name === "Пользователь" ? devUser.name : remoteUser.name,
              });
              remoteUser = await api.getUserByTgId(devUser.tg_id);
            }
            set({ user: remoteUser, isLoading: false });
          } catch {
            set({ user: devUser, isLoading: false });
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
