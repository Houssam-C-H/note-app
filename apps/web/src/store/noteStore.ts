import { create } from 'zustand';
import { noteApi } from '../api/note';

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

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  isLoading: false,
  error: null,

  setActiveNote: (id) => set({ activeNoteId: id }),

  fetchNotes: async (notebookId, sectionId) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await noteApi.getNotes(notebookId, sectionId);
      set({ notes, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createNote: async (notebookId, sectionId, title) => {
    try {
      const note = await noteApi.createNote(notebookId, sectionId, { title });
      set((state) => ({ 
        notes: [note, ...state.notes],
        activeNoteId: note.id
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateNote: async (notebookId, sectionId, noteId, updates) => {
    try {
      // Optimistic update
      set((state) => ({
        notes: state.notes.map(n => n.id === noteId ? { ...n, ...updates } : n)
      }));
      await noteApi.updateNote(notebookId, sectionId, noteId, updates);
    } catch (err: any) {
      set({ error: err.message });
      // Revert optimistic update by fetching again
      get().fetchNotes(notebookId, sectionId);
    }
  },

  deleteNote: async (notebookId, sectionId, noteId) => {
    try {
      await noteApi.deleteNote(notebookId, sectionId, noteId);
      set((state) => ({
        notes: state.notes.filter(n => n.id !== noteId),
        activeNoteId: state.activeNoteId === noteId ? null : state.activeNoteId
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  duplicateNote: async (notebookId, sectionId, noteId) => {
    try {
      const duplicate = await noteApi.duplicateNote(notebookId, sectionId, noteId);
      set((state) => ({
        notes: [duplicate, ...state.notes],
        activeNoteId: duplicate.id
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  }
}));
