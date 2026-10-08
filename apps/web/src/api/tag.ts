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

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export const tagApi = {
  getTags: async () => {
    const res = await fetch(`${API_URL}/tags`, {
      headers: defaultHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch tags');
    return data as Tag[];
  },

  createTag: async (payload: { name: string; color?: string }) => {
    const res = await fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create tag');
    return data as Tag;
  },

  updateTag: async (id: string, payload: { name?: string; color?: string }) => {
    const res = await fetch(`${API_URL}/tags/${id}`, {
      method: 'PATCH',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update tag');
    return data as Tag;
  },

  deleteTag: async (id: string) => {
    const res = await fetch(`${API_URL}/tags/${id}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete tag');
    return data;
  },

  addTagToNote: async (noteId: string, tagId: string) => {
    const res = await fetch(`${API_URL}/tags/notes/${noteId}/${tagId}`, {
      method: 'POST',
      headers: defaultHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add tag to note');
    return data;
  },

  removeTagFromNote: async (noteId: string, tagId: string) => {
    const res = await fetch(`${API_URL}/tags/notes/${noteId}/${tagId}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to remove tag from note');
    return data;
  }
};
