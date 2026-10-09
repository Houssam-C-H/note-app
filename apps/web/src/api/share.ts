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
  owner?: ShareUser;
}

export interface ShareListResponse {
  owner: ShareUser | null;
  shares: ShareResponse[];
}

export const shareApi = {
  // Notebook Shares
  shareNotebook: async (notebookId: string, email: string, permission: 'READ' | 'EDIT') => {
    const res = await fetch(`${API_URL}/shares/notebooks/${notebookId}`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify({ email, permission }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to share notebook');
    return data as ShareResponse;
  },
  
  listNotebookShares: async (notebookId: string): Promise<ShareListResponse> => {
    const res = await fetch(`${API_URL}/shares/notebooks/${notebookId}`, {
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list notebook shares');
    if (Array.isArray(data)) {
      return { owner: null, shares: data };
    }
    return data as ShareListResponse;
  },
  
  revokeNotebookShare: async (notebookId: string, sharedWithId: string) => {
    const res = await fetch(`${API_URL}/shares/notebooks/${notebookId}/${sharedWithId}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to revoke notebook share');
    return data;
  },

  // Note Shares
  shareNote: async (noteId: string, email: string, permission: 'READ' | 'EDIT') => {
    const res = await fetch(`${API_URL}/shares/notes/${noteId}`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify({ email, permission }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to share note');
    return data as ShareResponse;
  },
  
  listNoteShares: async (noteId: string): Promise<ShareListResponse> => {
    const res = await fetch(`${API_URL}/shares/notes/${noteId}`, {
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list note shares');
    if (Array.isArray(data)) {
      return { owner: null, shares: data };
    }
    return data as ShareListResponse;
  },
  
  revokeNoteShare: async (noteId: string, sharedWithId: string) => {
    const res = await fetch(`${API_URL}/shares/notes/${noteId}/${sharedWithId}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to revoke note share');
    return data;
  },

  // Shared With Me
  getSharedWithMe: async () => {
    const res = await fetch(`${API_URL}/shares/me`, {
      headers: defaultHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch shared items');
    return data;
  }
};
