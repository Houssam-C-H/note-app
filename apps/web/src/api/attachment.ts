import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getCsrfHeader = () => {
  const token = document.cookie.split('; ').find(row => row.startsWith('csrf_token='))?.split('=')[1];
  return { 'X-CSRF-Token': token || '' };
};

const defaultHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    ...getCsrfHeader(),
  };
  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export interface Attachment {
  id: string;
  noteId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: string;
  url: string;
  createdAt: string;
}

export const attachmentApi = {
  getAttachments: async (noteId: string) => {
    const res = await fetch(`${API_URL}/attachments/notes/${noteId}`, {
      headers: { ...defaultHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch attachments');
    return data as Attachment[];
  },

  uploadAttachment: async (noteId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/attachments/notes/${noteId}`, {
      method: 'POST',
      headers: defaultHeaders(), // do NOT set Content-Type to application/json, browser will set multipart boundary
      body: formData,
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload attachment');
    return data as Attachment;
  },

  deleteAttachment: async (id: string) => {
    const res = await fetch(`${API_URL}/attachments/${id}`, {
      method: 'DELETE',
      headers: { ...defaultHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete attachment');
    return data;
  }
};
