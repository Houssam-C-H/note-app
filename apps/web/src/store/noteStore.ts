import { create } from 'zustand';
import { noteApi } from '../api/note';
import { db } from '../lib/db';
import { useOfflineSyncStore } from './offlineSyncStore';
import { useAuthStore } from './authStore';

export interface Note {
  id: string;
  sectionId: string;
  userId: string;
  title: string;
  content: any;
  plaintext: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  sortOrder: number;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
}

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchNotes: (notebookId: string, sectionId: string) => Promise<void>;
  fetchNotesForNotebook: (notebookId: string, sections: { id: string }[]) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  createNote: (notebookId: string, sectionId: string, title?: string, parentId?: string | null) => Promise<string | undefined>;
  updateNote: (notebookId: string, sectionId: string, noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (notebookId: string, sectionId: string, noteId: string) => Promise<void>;
  duplicateNote: (notebookId: string, sectionId: string, noteId: string) => Promise<void>;
}

const generateId = () => crypto.randomUUID();

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  activeNoteId: null,
  isLoading: false,
  error: null,

  setActiveNote: (id) => set({ activeNoteId: id }),

  fetchNotes: async (notebookId, sectionId) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoading: false });
      return;
    }

    try {
      const offlineNotes = await db.notes
        .where({ sectionId })
        .toArray();
      
      const filteredNotes = offlineNotes
        .filter(n => !n.isArchived && n.deletedAt === null)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (filteredNotes.length > 0) {
        set((state) => {
          const map = new Map(state.notes.map(n => [n.id, n]));
          for (const n of filteredNotes) {
            map.set(n.id, n as unknown as Note);
          }
          return { notes: Array.from(map.values()), isLoading: false };
        });
      }

      if (useOfflineSyncStore.getState().isOnline) {
        const apiNotes = await noteApi.getNotes(notebookId, sectionId);
        
        await db.transaction('rw', db.notes, async () => {
          for (const note of apiNotes) {
            await db.notes.put({
              ...note,
              userId: user.id
            });
          }
        });

        set((state) => {
          const map = new Map(state.notes.map(n => [n.id, n]));
          for (const n of apiNotes) {
            map.set(n.id, n);
          }
          return { notes: Array.from(map.values()), isLoading: false };
        });
      }
    } catch (err: any) {
      console.error("Fetch notes error", err);
      set({ error: err.message, isLoading: false });
    }
  },

  fetchNotesForNotebook: async (notebookId, sections) => {
    const user = useAuthStore.getState().user;
    if (!user || sections.length === 0) return;

    const sectionIds = sections.map(s => s.id);

    try {
      // 1. Load from Dexie
      const offlineNotes = await db.notes
        .where('sectionId')
        .anyOf(sectionIds)
        .toArray();
      
      const filtered = offlineNotes
        .filter(n => !n.isArchived && n.deletedAt === null);

      if (filtered.length > 0) {
        set(state => {
          const map = new Map(state.notes.map(n => [n.id, n]));
          for (const n of filtered) {
            map.set(n.id, n as unknown as Note);
          }
          return { notes: Array.from(map.values()) };
        });
      }

      // 2. Load from API if online
      if (useOfflineSyncStore.getState().isOnline) {
        const allFetched: Note[] = [];
        for (const sec of sections) {
          try {
            const apiNotes = await noteApi.getNotes(notebookId, sec.id);
            allFetched.push(...apiNotes);
            await db.transaction('rw', db.notes, async () => {
              for (const n of apiNotes) {
                await db.notes.put({ ...n, userId: user.id });
              }
            });
          } catch (e) {
            // Section might be empty
          }
        }

        if (allFetched.length > 0) {
          set(state => {
            const map = new Map(state.notes.map(n => [n.id, n]));
            for (const n of allFetched) {
              map.set(n.id, n);
            }
            return { notes: Array.from(map.values()) };
          });
        }
      }
    } catch (err) {
      console.error("Fetch notes for notebook error", err);
    }
  },

  createNote: async (notebookId, sectionId, title, parentId) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const id = generateId();
    const newNote: Note = {
      id,
      sectionId,
      userId: user.id,
      title: title || 'Untitled Page',
      content: null,
      plaintext: '',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      sortOrder: 0,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId: parentId || null
    };

    // Save locally
    await db.notes.put({ ...newNote, deletedAt: null });

    // Update state
    set((state) => ({ 
      notes: [newNote, ...state.notes],
      activeNoteId: id
    }));

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'CREATE',
      entity: 'NOTE',
      entityId: id,
      data: { id, notebookId, sectionId, title: newNote.title }
    });

    return id;
  },

  updateNote: async (notebookId, sectionId, noteId, updates) => {
    const existing = await db.notes.get(noteId);
    if (existing) {
      await db.notes.put({ ...existing, ...updates, updatedAt: new Date().toISOString() } as any);
    }

    set((state) => ({
      notes: state.notes.map(n => n.id === noteId ? { ...n, ...updates } as Note : n)
    }));

    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'UPDATE',
      entity: 'NOTE',
      entityId: noteId,
      data: { ...updates, notebookId, sectionId }
    });
  },

  deleteNote: async (notebookId, sectionId, noteId) => {
    const existing = await db.notes.get(noteId);
    if (existing) {
      await db.notes.put({ ...existing, isArchived: true, deletedAt: new Date().toISOString() } as any);
    }

    set((state) => ({
      notes: state.notes.filter(n => n.id !== noteId),
      activeNoteId: state.activeNoteId === noteId ? null : state.activeNoteId
    }));

    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'DELETE',
      entity: 'NOTE',
      entityId: noteId,
      data: { notebookId, sectionId }
    });
  },

  duplicateNote: async (notebookId, sectionId, noteId) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const existing = await db.notes.get(noteId);
    if (!existing) return;

    const id = generateId();
    const newNote = {
      ...existing,
      id,
      title: `${existing.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
    };

    await db.notes.put(newNote);

    set((state) => ({
      notes: [newNote as unknown as Note, ...state.notes],
      activeNoteId: id
    }));

    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'CREATE',
      entity: 'NOTE',
      entityId: id,
      data: { notebookId, sectionId, title: newNote.title, content: newNote.content, plaintext: newNote.plaintext }
    });
  }
}));
