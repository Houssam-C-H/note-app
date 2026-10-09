import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RibbonTab = 'File' | 'Home' | 'Insert' | 'Draw' | 'History' | 'Review' | 'View' | 'Help';
export type DrawTool = 'type' | 'pen' | 'highlighter' | 'eraser';

interface UiState {
  isSidebarOpen: boolean;
  currentView: 'notebooks' | 'shared' | 'trash';
  isPrintLayout: boolean;
  activeRibbonTab: RibbonTab;
  isStickyNotesOpen: boolean;
  ruledLines: boolean;
  gridLines: boolean;
  // Drawing states for the Draw tab
  drawTool: DrawTool;
  drawColor: string;
  drawWidth: number;
  clearInkCounter: number;
  toggleSidebar: () => void;
  setView: (view: 'notebooks' | 'shared' | 'trash') => void;
  togglePrintLayout: () => void;
  setRibbonTab: (tab: RibbonTab) => void;
  toggleStickyNotes: () => void;
  toggleRuledLines: () => void;
  toggleGridLines: () => void;
  setDrawTool: (tool: DrawTool) => void;
  setDrawColor: (color: string) => void;
  setDrawWidth: (width: number) => void;
  clearInk: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      currentView: 'notebooks',
      isPrintLayout: false,
      activeRibbonTab: 'Home',
      isStickyNotesOpen: false,
      ruledLines: false,
      gridLines: false,
      drawTool: 'pen',
      drawColor: '#7719aa',
      drawWidth: 3,
      clearInkCounter: 0,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setView: (view) => set({ currentView: view }),
      togglePrintLayout: () => set((state) => ({ isPrintLayout: !state.isPrintLayout })),
      setRibbonTab: (tab) => set({ activeRibbonTab: tab }),
      toggleStickyNotes: () => set((state) => ({ isStickyNotesOpen: !state.isStickyNotesOpen })),
      toggleRuledLines: () => set((state) => ({ ruledLines: !state.ruledLines, gridLines: false })),
      toggleGridLines: () => set((state) => ({ gridLines: !state.gridLines, ruledLines: false })),
      setDrawTool: (tool) => set({ drawTool: tool }),
      setDrawColor: (color) => set({ drawColor: color }),
      setDrawWidth: (width) => set({ drawWidth: width }),
      clearInk: () => set((state) => ({ clearInkCounter: state.clearInkCounter + 1 })),
    }),
    {
      name: 'ui-storage',
    }
  )
);
