import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getCsrfHeader = () => {
  const token = document.cookie.split('; ').find(row => row.startsWith('csrf_token='))?.split('=')[1];
  return { 'X-CSRF-Token': token || '' };
};

const defaultHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getCsrfHeader(),
  };
  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const noteApi = {
  getNotes: async (notebookId: string, sectionId: string) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections/${sectionId}/notes`, { 
      headers: defaultHeaders(),
      credentials: 'include' 
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch notes');
    return data;
  },

  createNote: async (notebookId: string, sectionId: string, payload: { title?: string; content?: any; plaintext?: string }) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections/${sectionId}/notes`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create note');
    return data;
  },

  updateNote: async (notebookId: string, sectionId: string, noteId: string, payload: any) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections/${sectionId}/notes/${noteId}`, {
      method: 'PATCH',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update note');
    return data;
  },

  deleteNote: async (notebookId: string, sectionId: string, noteId: string) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections/${sectionId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete note');
    return data;
  },

  duplicateNote: async (notebookId: string, sectionId: string, noteId: string) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections/${sectionId}/notes/${noteId}/duplicate`, {
      method: 'POST',
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to duplicate note');
    return data;
  },

  getTrashedNotes: async () => {
    const res = await fetch(`${API_URL}/notes/trash`, {
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch trashed notes');
    return data;
  },

  restoreNote: async (noteId: string) => {
    const res = await fetch(`${API_URL}/notes/trash/${noteId}/restore`, {
      method: 'POST',
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to restore note');
    return data;
  },

  permanentDeleteNote: async (noteId: string) => {
    const res = await fetch(`${API_URL}/notes/trash/${noteId}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to permanently delete note');
    return data;
  },
};
