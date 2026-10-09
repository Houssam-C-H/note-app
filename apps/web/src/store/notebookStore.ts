import { create } from 'zustand';
import { notebookApi } from '../api/notebook';
import { db } from '../lib/db';
import { useOfflineSyncStore } from './offlineSyncStore';
import { useAuthStore } from './authStore';

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
  ensureDefaultSection: (notebookId: string) => Promise<string>;
  updateSection: (notebookId: string, sectionId: string, updates: Partial<Section>) => Promise<void>;
  deleteSection: (notebookId: string, sectionId: string) => Promise<void>;
  reorderNotebooks: (orderedIds: string[]) => Promise<void>;
  reorderSections: (notebookId: string, orderedIds: string[]) => Promise<void>;
}

const generateId = () => crypto.randomUUID();

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
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoading: false });
      return;
    }

    try {
      // 1. Load from Dexie first (fast)
      const offlineNotebooks = await db.notebooks.where('userId').equals(user.id).toArray();
      const offlineSections = await db.sections.toArray();
      
      const combined = offlineNotebooks
        .filter(nb => !nb.isArchived)
        .sort((a, b) => a.order - b.order)
        .map(nb => {
          return {
            id: nb.id,
            title: nb.title,
            color: nb.color,
            icon: '',
            sortOrder: nb.order,
            sections: offlineSections
              .filter(sec => sec.notebookId === nb.id)
              .sort((a, b) => a.order - b.order)
              .map(sec => ({
                id: sec.id,
                notebookId: sec.notebookId,
                title: sec.title,
                color: '',
                sortOrder: sec.order
              }))
          };
        });
      
      if (combined.length > 0) {
        set({ notebooks: combined, isLoading: false });
        if (!get().activeNotebookId) {
          set({ activeNotebookId: combined[0].id });
        }
      }

      // 2. Fetch from API if online
      if (useOfflineSyncStore.getState().isOnline) {
        const apiNotebooks = await notebookApi.getNotebooks();
        
        // Save to Dexie
        await db.transaction('rw', db.notebooks, db.sections, async () => {
          for (const nb of apiNotebooks) {
            await db.notebooks.put({
              id: nb.id,
              title: nb.title,
              color: nb.color || '',
              order: nb.sortOrder || 0,
              userId: user.id,
              isArchived: !!nb.isArchived,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            for (const sec of nb.sections) {
              await db.sections.put({
                id: sec.id,
                title: sec.title,
                order: sec.sortOrder || 0,
                notebookId: nb.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }
        });

        set({ notebooks: apiNotebooks, isLoading: false });
        if (!get().activeNotebookId && apiNotebooks.length > 0) {
          set({ activeNotebookId: apiNotebooks[0].id });
        }
      } else if (combined.length === 0) {
        set({ isLoading: false });
      }
    } catch (err: any) {
      console.error("Fetch error", err);
      set({ error: err.message, isLoading: false });
    }
  },

  createNotebook: async (title, color) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    const id = generateId();
    const newNb: Notebook = { id, title, color: color || '#6366f1', icon: '', sortOrder: 0, sections: [] };
    
    // Save locally
    await db.notebooks.put({
      id, title, color: newNb.color, order: 0, userId: user.id, isArchived: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

    // Also create default section so notes can be added immediately
    const defaultSecId = generateId();
    const defaultSec: Section = { id: defaultSecId, notebookId: id, title: 'Main', color: newNb.color, sortOrder: 0 };
    newNb.sections = [defaultSec];
    await db.sections.put({
      id: defaultSecId, title: 'Main', notebookId: id, order: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

    // Update state
    set((state) => ({ 
      notebooks: [...state.notebooks, newNb],
      activeNotebookId: id,
      activeSectionId: defaultSecId
    }));

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'CREATE',
      entity: 'NOTEBOOK',
      entityId: id,
      data: { id, title, color: newNb.color }
    });
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'CREATE',
      entity: 'SECTION',
      entityId: defaultSecId,
      data: { id: defaultSecId, notebookId: id, title: 'Main', color: newNb.color }
    });
  },

  ensureDefaultSection: async (notebookId: string): Promise<string> => {
    const nb = get().notebooks.find(n => n.id === notebookId);
    if (nb && nb.sections.length > 0) {
      return nb.sections[0].id;
    }
    const secId = generateId();
    const newSec: Section = { id: secId, notebookId, title: 'Main', color: nb?.color || '#7719aa', sortOrder: 0 };
    await db.sections.put({
      id: secId, title: 'Main', notebookId, order: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    set(state => ({
      notebooks: state.notebooks.map(n => n.id === notebookId ? { ...n, sections: [...n.sections, newSec] } : n),
      activeSectionId: secId
    }));
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'CREATE',
      entity: 'SECTION',
      entityId: secId,
      data: { id: secId, notebookId, title: 'Main', color: newSec.color }
    });
    return secId;
  },

  updateNotebook: async (id, updates) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Update locally
    const existing = await db.notebooks.get(id);
    if (existing) {
      await db.notebooks.put({ ...existing, ...updates, updatedAt: new Date().toISOString() } as any);
    }

    // Update state
    set((state) => ({
      notebooks: state.notebooks.map(nb => nb.id === id ? { ...nb, ...updates } : nb)
    }));

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'UPDATE',
      entity: 'NOTEBOOK',
      entityId: id,
      data: updates
    });
  },

  deleteNotebook: async (id) => {
    // Soft delete locally in Dexie so it is visible in Trash
    const existing = await db.notebooks.get(id);
    if (existing) {
      await db.notebooks.put({ ...existing, isArchived: true, deletedAt: new Date().toISOString() } as any);
    }
    
    // Also soft delete notes in this notebook locally
    const sections = await db.sections.where({ notebookId: id }).toArray();
    const secIds = sections.map(s => s.id);
    if (secIds.length > 0) {
      const relatedNotes = await db.notes.where('sectionId').anyOf(secIds).toArray();
      for (const n of relatedNotes) {
        await db.notes.put({ ...n, isArchived: true, deletedAt: new Date().toISOString() });
      }
    }

    // Update state
    set((state) => ({
      notebooks: state.notebooks.filter(nb => nb.id !== id),
      activeNotebookId: state.activeNotebookId === id ? null : state.activeNotebookId
    }));

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'DELETE',
      entity: 'NOTEBOOK',
      entityId: id
    });
  },

  createSection: async (notebookId, title, color) => {
    const id = generateId();
    const newSec: Section = { id, notebookId, title, color: color || '', sortOrder: 0 };
    
    // Save locally
    await db.sections.put({
      id, title, notebookId, order: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

    // Update state
    set((state) => ({
      notebooks: state.notebooks.map(nb => {
        if (nb.id === notebookId) {
          return { ...nb, sections: [...nb.sections, newSec] };
        }
        return nb;
      }),
      activeSectionId: id
    }));

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'CREATE',
      entity: 'SECTION',
      entityId: id,
      data: { notebookId, title, color }
    });
  },

  updateSection: async (notebookId, sectionId, updates) => {
    // Update locally
    const existing = await db.sections.get(sectionId);
    if (existing) {
      await db.sections.put({ ...existing, ...updates, updatedAt: new Date().toISOString() } as any);
    }

    // Update state
    set((state) => ({
      notebooks: state.notebooks.map(nb => {
        if (nb.id === notebookId) {
          return {
            ...nb,
            sections: nb.sections.map(sec => sec.id === sectionId ? { ...sec, ...updates } : sec)
          };
        }
        return nb;
      })
    }));

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'UPDATE',
      entity: 'SECTION',
      entityId: sectionId,
      data: { ...updates, notebookId }
    });
  },

  deleteSection: async (notebookId, sectionId) => {
    // Delete locally
    await db.sections.delete(sectionId);

    // Update state
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

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'DELETE',
      entity: 'SECTION',
      entityId: sectionId,
      data: { notebookId }
    });
  },

  reorderNotebooks: async (orderedIds: string[]) => {
    set((state) => {
      const newNotebooks = [...state.notebooks];
      newNotebooks.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
      return { notebooks: newNotebooks };
    });
    
    // Note: Reordering might need special sync or bulk sync, simplified for now
    if (useOfflineSyncStore.getState().isOnline) {
      await notebookApi.reorderNotebooks(orderedIds);
    }
  },

  reorderSections: async (notebookId: string, orderedIds: string[]) => {
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
    
    if (useOfflineSyncStore.getState().isOnline) {
      await notebookApi.reorderSections(notebookId, orderedIds);
    }
  }
}));
