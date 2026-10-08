import { create } from 'zustand';
import { tagApi, Tag } from '../api/tag';

interface TagState {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;

  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: string, payload: { name?: string; color?: string }) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addTagToNote: (noteId: string, tagId: string) => Promise<void>;
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await tagApi.getTags();
      set({ tags, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createTag: async (name, color) => {
    try {
      const tag = await tagApi.createTag({ name, color });
      set((state) => ({ tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }));
      return tag;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateTag: async (id, payload) => {
    try {
      const updated = await tagApi.updateTag(id, payload);
      set((state) => ({
        tags: state.tags.map(t => t.id === id ? updated : t).sort((a, b) => a.name.localeCompare(b.name))
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteTag: async (id) => {
    try {
      await tagApi.deleteTag(id);
      set((state) => ({
        tags: state.tags.filter(t => t.id !== id)
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  addTagToNote: async (noteId, tagId) => {
    try {
      await tagApi.addTagToNote(noteId, tagId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  removeTagFromNote: async (noteId, tagId) => {
    try {
      await tagApi.removeTagFromNote(noteId, tagId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  }
}));
