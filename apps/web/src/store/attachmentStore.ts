import { create } from 'zustand';
import { attachmentApi, Attachment } from '../api/attachment';

interface AttachmentState {
  attachments: Record<string, Attachment[]>; // Keyed by noteId
  isLoading: boolean;
  error: string | null;

  fetchAttachments: (noteId: string) => Promise<void>;
  uploadAttachment: (noteId: string, file: File) => Promise<Attachment>;
  deleteAttachment: (noteId: string, id: string) => Promise<void>;
}

export const useAttachmentStore = create<AttachmentState>((set) => ({
  attachments: {},
  isLoading: false,
  error: null,

  fetchAttachments: async (noteId) => {
    set({ isLoading: true, error: null });
    try {
      const atts = await attachmentApi.getAttachments(noteId);
      set((state) => ({
        attachments: { ...state.attachments, [noteId]: atts },
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  uploadAttachment: async (noteId, file) => {
    set({ isLoading: true, error: null });
    try {
      const att = await attachmentApi.uploadAttachment(noteId, file);
      set((state) => {
        const current = state.attachments[noteId] || [];
        return {
          attachments: { ...state.attachments, [noteId]: [att, ...current] },
          isLoading: false
        };
      });
      return att;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteAttachment: async (noteId, id) => {
    try {
      await attachmentApi.deleteAttachment(id);
      set((state) => {
        const current = state.attachments[noteId] || [];
        return {
          attachments: { ...state.attachments, [noteId]: current.filter(a => a.id !== id) }
        };
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  }
}));
