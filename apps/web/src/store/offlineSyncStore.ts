import { create } from 'zustand';
import { db, SyncOperation } from '../lib/db';
import { useAuthStore } from './authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getHeaders = () => {
  const token = useAuthStore.getState().accessToken;
  const csrf = document.cookie.split('; ').find(row => row.startsWith('csrf_token='))?.split('=')[1];
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrf || '',
  };
};

interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  pendingSyncs: number;
  setOnlineStatus: (status: boolean) => void;
  syncNow: () => Promise<void>;
  enqueueMutation: (operation: Omit<SyncOperation, 'timestamp'>) => Promise<void>;
  updatePendingCount: () => Promise<void>;
}

export const useOfflineSyncStore = create<OfflineSyncState>((set, get) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  syncError: null,
  pendingSyncs: 0,
  
  setOnlineStatus: (status: boolean) => {
    set({ isOnline: status });
    if (status) {
      get().syncNow();
    }
  },

  updatePendingCount: async () => {
    const count = await db.syncQueue.count();
    set({ pendingSyncs: count });
  },

  enqueueMutation: async (operation) => {
    await db.syncQueue.add({
      ...operation,
      timestamp: Date.now()
    });
    
    get().updatePendingCount();

    if (get().isOnline) {
      get().syncNow();
    }
  },

  syncNow: async () => {
    const { isOnline, isSyncing } = get();
    if (!isOnline || isSyncing) return;

    set({ isSyncing: true, syncError: null });

    try {
      const operations = await db.syncQueue.orderBy('timestamp').toArray();
      
      for (const op of operations) {
        try {
          await processOperation(op);
          // Delete after successful process
          if (op.id) await db.syncQueue.delete(op.id);
        } catch (error: any) {
          console.error(`Failed to sync operation ${op.id}:`, error);
          // 401 Unauth or 403 Forbidden shouldn't retry indefinitely
          if (error.status === 401 || error.status === 403) {
            if (op.id) await db.syncQueue.delete(op.id);
          } else {
            throw error; // stop syncing on other errors to maintain order
          }
        }
      }
      set({ syncError: null });
    } catch (e: any) {
      set({ syncError: 'Failed to synchronize some changes' });
    } finally {
      set({ isSyncing: false });
      get().updatePendingCount();
    }
  }
}));

async function processOperation(op: SyncOperation) {
  let url = '';
  let method = '';
  
  if (op.entity === 'NOTEBOOK') {
    url = op.type === 'CREATE' ? `${API_URL}/notebooks` : `${API_URL}/notebooks/${op.entityId}`;
  } else if (op.entity === 'SECTION') {
    url = op.type === 'CREATE' ? `${API_URL}/notebooks/${op.data.notebookId}/sections` : `${API_URL}/notebooks/${op.data.notebookId}/sections/${op.entityId}`;
  } else if (op.entity === 'NOTE') {
    url = op.type === 'CREATE' 
      ? (op.data?.notebookId && op.data?.sectionId 
          ? `${API_URL}/notebooks/${op.data.notebookId}/sections/${op.data.sectionId}/notes` 
          : `${API_URL}/notes`)
      : (op.data?.notebookId && op.data?.sectionId 
          ? `${API_URL}/notebooks/${op.data.notebookId}/sections/${op.data.sectionId}/notes/${op.entityId}` 
          : `${API_URL}/notes/${op.entityId}`);
  }

  if (op.type === 'CREATE') method = 'POST';
  if (op.type === 'UPDATE') method = 'PATCH'; // Note: API uses PATCH for notes, PUT for sections/notebooks
  if (op.type === 'DELETE') method = 'DELETE';
  
  // Quick fix for PUT vs PATCH
  if (op.type === 'UPDATE' && op.entity !== 'NOTE') {
    method = 'PUT';
  }
  
  const headers = getHeaders();

  const res = await fetch(url, {
    method,
    headers,
    body: (method !== 'DELETE' && op.data) ? JSON.stringify({ ...op.data, id: op.entityId }) : undefined,
  });

  if (!res.ok) {
    const error: any = new Error('Sync request failed');
    error.status = res.status;
    throw error;
  }
}

// Global listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useOfflineSyncStore.getState().setOnlineStatus(true));
  window.addEventListener('offline', () => useOfflineSyncStore.getState().setOnlineStatus(false));
}
