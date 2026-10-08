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

export interface SearchFilters {
  notebookId?: string;
  sectionId?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  sectionId: string;
  notebookId: string;
  isPinned: boolean;
  isFavorite: boolean;
  updatedAt: string;
  preview: string;
  rank: number;
}

export interface SearchResponse {
  data: SearchResult[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const searchApi = {
  searchNotes: async (q: string, filters: SearchFilters = {}, limit = 20, offset = 0) => {
    const params = new URLSearchParams({
      q,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (filters.notebookId) params.append('notebookId', filters.notebookId);
    if (filters.sectionId) params.append('sectionId', filters.sectionId);
    if (filters.isPinned !== undefined) params.append('isPinned', String(filters.isPinned));
    if (filters.isFavorite !== undefined) params.append('isFavorite', String(filters.isFavorite));

    const res = await fetch(`${API_URL}/search/notes?${params.toString()}`, {
      headers: defaultHeaders(),
      credentials: 'include'
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to search');
    return data as SearchResponse;
  },
};
