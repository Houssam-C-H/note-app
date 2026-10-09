import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  isSidebarOpen: boolean;
  currentView: 'notebooks' | 'shared' | 'trash';
  toggleSidebar: () => void;
  setView: (view: 'notebooks' | 'shared' | 'trash') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      currentView: 'notebooks',
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setView: (view) => set({ currentView: view }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
