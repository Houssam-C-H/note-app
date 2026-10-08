import { api } from './index';

export interface ShareUser {
  id: string;
  email: string;
  displayName: string;
}

export interface ShareResponse {
  id: string;
  noteId?: string;
  notebookId?: string;
  ownerId: string;
  sharedWithId: string;
  permission: 'READ' | 'EDIT';
  sharedWith: ShareUser;
}

export const shareApi = {
  // Notebook Shares
  shareNotebook: async (notebookId: string, email: string, permission: 'READ' | 'EDIT') => {
    const res = await api.post(`/shares/notebooks/${notebookId}`, { email, permission });
    return res.data as ShareResponse;
  },
  
  listNotebookShares: async (notebookId: string) => {
    const res = await api.get(`/shares/notebooks/${notebookId}`);
    return res.data as ShareResponse[];
  },
  
  revokeNotebookShare: async (notebookId: string, sharedWithId: string) => {
    const res = await api.delete(`/shares/notebooks/${notebookId}/${sharedWithId}`);
    return res.data;
  },

  // Note Shares
  shareNote: async (noteId: string, email: string, permission: 'READ' | 'EDIT') => {
    const res = await api.post(`/shares/notes/${noteId}`, { email, permission });
    return res.data as ShareResponse;
  },
  
  listNoteShares: async (noteId: string) => {
    const res = await api.get(`/shares/notes/${noteId}`);
    return res.data as ShareResponse[];
  },
  
  revokeNoteShare: async (noteId: string, sharedWithId: string) => {
    const res = await api.delete(`/shares/notes/${noteId}/${sharedWithId}`);
    return res.data;
  },

  // Shared With Me
  getSharedWithMe: async () => {
    const res = await api.get('/shares/me');
    return res.data;
  }
};
