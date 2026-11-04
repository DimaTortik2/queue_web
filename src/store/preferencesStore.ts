import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StatusFilter = "all" | "active" | "paused";

interface PreferencesState {
  pinnedSubjects: string[];
  statusFilter: StatusFilter;
  hapticsEnabled: boolean;
  togglePinSubject: (subject: string) => void;
  unpinAllSubjects: () => void;
  isPinned: (subject: string) => boolean;
  setStatusFilter: (filter: StatusFilter) => void;
  toggleHaptics: () => void;
  setHapticsEnabled: (enabled: boolean) => void;
  resetPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      pinnedSubjects: [],
      statusFilter: "all",
      hapticsEnabled: true,

      togglePinSubject: (subject: string) => {
        const { pinnedSubjects } = get();
        if (pinnedSubjects.includes(subject)) {
          set({ pinnedSubjects: pinnedSubjects.filter((s) => s !== subject) });
        } else {
          set({ pinnedSubjects: [...pinnedSubjects, subject] });
        }
      },

      unpinAllSubjects: () => {
        set({ pinnedSubjects: [] });
      },

      isPinned: (subject: string) => {
        return get().pinnedSubjects.includes(subject);
      },

      setStatusFilter: (statusFilter: StatusFilter) => {
        set({ statusFilter });
      },

      toggleHaptics: () => {
        set({ hapticsEnabled: !get().hapticsEnabled });
      },

      setHapticsEnabled: (hapticsEnabled: boolean) => {
        set({ hapticsEnabled });
      },

      resetPreferences: () => {
        set({
          pinnedSubjects: [],
          statusFilter: "all",
          hapticsEnabled: true,
        });
      },
    }),
    {
      name: "queue_preferences_storage",
    }
  )
);
