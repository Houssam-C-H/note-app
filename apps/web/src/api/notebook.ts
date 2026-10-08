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

export const notebookApi = {
  getNotebooks: async () => {
    const res = await fetch(`${API_URL}/notebooks`, { 
      headers: defaultHeaders(),
      credentials: 'include' 
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch notebooks');
    return data;
  },

  createNotebook: async (payload: { title: string; color?: string; icon?: string }) => {
    const res = await fetch(`${API_URL}/notebooks`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create notebook');
    return data;
  },

  updateNotebook: async (id: string, payload: { title?: string; color?: string; icon?: string }) => {
    const res = await fetch(`${API_URL}/notebooks/${id}`, {
      method: 'PATCH',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update notebook');
    return data;
  },

  deleteNotebook: async (id: string) => {
    const res = await fetch(`${API_URL}/notebooks/${id}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete notebook');
    return data;
  },

  createSection: async (notebookId: string, payload: { title: string; color?: string }) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create section');
    return data;
  },

  updateSection: async (notebookId: string, sectionId: string, payload: { title?: string; color?: string }) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections/${sectionId}`, {
      method: 'PATCH',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update section');
    return data;
  },

  deleteSection: async (notebookId: string, sectionId: string) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections/${sectionId}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete section');
    return data;
  },

  reorderNotebooks: async (orderedIds: string[]) => {
    const res = await fetch(`${API_URL}/notebooks/reorder`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify({ orderedIds }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reorder notebooks');
    return data;
  },

  reorderSections: async (notebookId: string, orderedIds: string[]) => {
    const res = await fetch(`${API_URL}/notebooks/${notebookId}/sections/reorder`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify({ orderedIds }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reorder sections');
    return data;
  },
};
