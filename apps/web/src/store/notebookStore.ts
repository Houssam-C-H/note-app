import { create } from 'zustand';
import { notebookApi } from '../api/notebook';

export interface Section {
  id: string;
  notebookId: string;
  title: string;
  color: string;
  sortOrder: number;
}

export interface Notebook {
  id: string;
  title: string;
  color: string;
  icon: string;
  sortOrder: number;
  sections: Section[];
}

interface NotebookState {
  notebooks: Notebook[];
  activeNotebookId: string | null;
  activeSectionId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchNotebooks: () => Promise<void>;
  setActiveNotebook: (id: string | null) => void;
  setActiveSection: (id: string | null) => void;
  createNotebook: (title: string, color?: string) => Promise<void>;
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  createSection: (notebookId: string, title: string, color?: string) => Promise<void>;
  updateSection: (notebookId: string, sectionId: string, updates: Partial<Section>) => Promise<void>;
  deleteSection: (notebookId: string, sectionId: string) => Promise<void>;
  reorderNotebooks: (orderedIds: string[]) => Promise<void>;
  reorderSections: (notebookId: string, orderedIds: string[]) => Promise<void>;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  activeNotebookId: null,
  activeSectionId: null,
  isLoading: false,
  error: null,

  setActiveNotebook: (id) => set({ activeNotebookId: id, activeSectionId: null }),
  setActiveSection: (id) => set({ activeSectionId: id }),

  fetchNotebooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const notebooks = await notebookApi.getNotebooks();
      set({ notebooks, isLoading: false });
      
      const { activeNotebookId } = get();
      if (!activeNotebookId && notebooks.length > 0) {
        set({ activeNotebookId: notebooks[0].id });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createNotebook: async (title, color) => {
    try {
      const notebook = await notebookApi.createNotebook({ title, color });
      set((state) => ({ 
        notebooks: [...state.notebooks, { ...notebook, sections: [] }],
        activeNotebookId: notebook.id
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateNotebook: async (id, updates) => {
    try {
      const updated = await notebookApi.updateNotebook(id, updates);
      set((state) => ({
        notebooks: state.notebooks.map(nb => nb.id === id ? { ...nb, ...updated } : nb)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteNotebook: async (id) => {
    try {
      await notebookApi.deleteNotebook(id);
      set((state) => ({
        notebooks: state.notebooks.filter(nb => nb.id !== id),
        activeNotebookId: state.activeNotebookId === id ? null : state.activeNotebookId
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  createSection: async (notebookId, title, color) => {
    try {
      const section = await notebookApi.createSection(notebookId, { title, color });
      set((state) => ({
        notebooks: state.notebooks.map(nb => {
          if (nb.id === notebookId) {
            return { ...nb, sections: [...nb.sections, section] };
          }
          return nb;
        }),
        activeSectionId: section.id
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateSection: async (notebookId, sectionId, updates) => {
    try {
      const updated = await notebookApi.updateSection(notebookId, sectionId, updates);
      set((state) => ({
        notebooks: state.notebooks.map(nb => {
          if (nb.id === notebookId) {
            return {
              ...nb,
              sections: nb.sections.map(sec => sec.id === sectionId ? { ...sec, ...updated } : sec)
            };
          }
          return nb;
        })
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteSection: async (notebookId, sectionId) => {
    try {
      await notebookApi.deleteSection(notebookId, sectionId);
      set((state) => ({
        notebooks: state.notebooks.map(nb => {
          if (nb.id === notebookId) {
            return {
              ...nb,
              sections: nb.sections.filter(sec => sec.id !== sectionId)
            };
          }
          return nb;
        }),
        activeSectionId: state.activeSectionId === sectionId ? null : state.activeSectionId
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  reorderNotebooks: async (orderedIds: string[]) => {
    try {
      // Optimistic update
      set((state) => {
        const newNotebooks = [...state.notebooks];
        newNotebooks.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
        return { notebooks: newNotebooks };
      });
      await notebookApi.reorderNotebooks(orderedIds);
    } catch (err: any) {
      set({ error: err.message });
      get().fetchNotebooks(); // Rollback
    }
  },

  reorderSections: async (notebookId: string, orderedIds: string[]) => {
    try {
      // Optimistic update
      set((state) => ({
        notebooks: state.notebooks.map(nb => {
          if (nb.id === notebookId) {
            const newSections = [...nb.sections];
            newSections.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
            return { ...nb, sections: newSections };
          }
          return nb;
        })
      }));
      await notebookApi.reorderSections(notebookId, orderedIds);
    } catch (err: any) {
      set({ error: err.message });
      get().fetchNotebooks(); // Rollback
    }
  }
}));
