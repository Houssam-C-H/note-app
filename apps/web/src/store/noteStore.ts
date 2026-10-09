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
}

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchNotes: (notebookId: string, sectionId: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  createNote: (notebookId: string, sectionId: string, title?: string) => Promise<void>;
  updateNote: (notebookId: string, sectionId: string, noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (notebookId: string, sectionId: string, noteId: string) => Promise<void>;
  duplicateNote: (notebookId: string, sectionId: string, noteId: string) => Promise<void>;
}

const generateId = () => crypto.randomUUID();

export const useNoteStore = create<NoteState>((set, get) => ({
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
      // 1. Load from Dexie first (fast)
      const offlineNotes = await db.notes
        .where({ sectionId })
        .toArray();
      
      const filteredNotes = offlineNotes
        .filter(n => !n.isArchived && n.deletedAt === null)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (filteredNotes.length > 0) {
        set({ notes: filteredNotes as Note[], isLoading: false });
      } else {
        set({ notes: [], isLoading: false });
      }

      // 2. Fetch from API if online
      if (useOfflineSyncStore.getState().isOnline) {
        const apiNotes = await noteApi.getNotes(notebookId, sectionId);
        
        // Save to Dexie
        await db.transaction('rw', db.notes, async () => {
          for (const note of apiNotes) {
            await db.notes.put({
              ...note,
              userId: user.id
            });
          }
        });

        set({ notes: apiNotes, isLoading: false });
      }
    } catch (err: any) {
      console.error("Fetch notes error", err);
      set({ error: err.message, isLoading: false });
    }
  },

  createNote: async (notebookId, sectionId, title) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const id = generateId();
    const newNote: Note = {
      id,
      sectionId,
      userId: user.id,
      title: title || '',
      content: null,
      plaintext: '',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      sortOrder: 0,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      data: { notebookId, sectionId, title: newNote.title }
    });
  },

  updateNote: async (notebookId, sectionId, noteId, updates) => {
    // Update locally
    const existing = await db.notes.get(noteId);
    if (existing) {
      await db.notes.put({ ...existing, ...updates, updatedAt: new Date().toISOString() } as any);
    }

    // Update state
    set((state) => ({
      notes: state.notes.map(n => n.id === noteId ? { ...n, ...updates } as Note : n)
    }));

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'UPDATE',
      entity: 'NOTE',
      entityId: noteId,
      data: { ...updates, notebookId, sectionId }
    });
  },

  deleteNote: async (notebookId, sectionId, noteId) => {
    // Soft delete locally to match backend trash feature
    const existing = await db.notes.get(noteId);
    if (existing) {
      await db.notes.put({ ...existing, isArchived: true, deletedAt: new Date().toISOString() } as any);
    }

    // Update state
    set((state) => ({
      notes: state.notes.filter(n => n.id !== noteId),
      activeNoteId: state.activeNoteId === noteId ? null : state.activeNoteId
    }));

    // Queue sync
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'DELETE',
      entity: 'NOTE',
      entityId: noteId,
      data: { notebookId, sectionId }
    });
  },

  duplicateNote: async (notebookId, sectionId, noteId) => {
    // Duplication requires reading the note, copying it, and creating a new one.
    // In an offline-first architecture, we do it locally and push a CREATE.
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

    // Save locally
    await db.notes.put(newNote);

    // Update state
    set((state) => ({
      notes: [newNote as Note, ...state.notes],
      activeNoteId: id
    }));

    // Queue sync (simulate by creating the content via a CREATE)
    await useOfflineSyncStore.getState().enqueueMutation({
      type: 'CREATE',
      entity: 'NOTE',
      entityId: id,
      data: { notebookId, sectionId, title: newNote.title, content: newNote.content, plaintext: newNote.plaintext }
    });
  }
}));
