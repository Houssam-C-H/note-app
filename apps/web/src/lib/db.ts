import Dexie, { Table } from 'dexie';

export interface OfflineNotebook {
  id: string;
  title: string;
  color: string;
  order: number;
  userId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSection {
  id: string;
  title: string;
  order: number;
  notebookId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineNote {
  id: string;
  title: string;
  content: any; // JSON
  plaintext: string;
  sectionId: string;
  userId: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncOperation {
  id?: number;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'NOTEBOOK' | 'SECTION' | 'NOTE';
  entityId: string;
  data?: any; // The payload
  timestamp: number;
}

export class NoteSpaceDatabase extends Dexie {
  notebooks!: Table<OfflineNotebook, string>;
  sections!: Table<OfflineSection, string>;
  notes!: Table<OfflineNote, string>;
  syncQueue!: Table<SyncOperation, number>;

  constructor() {
    super('NoteSpaceDB');
    this.version(1).stores({
      notebooks: 'id, userId, isArchived',
      sections: 'id, notebookId',
      notes: 'id, sectionId, userId, isArchived, deletedAt, isPinned, isFavorite',
      syncQueue: '++id, type, entity, entityId, timestamp'
    });
  }
}

export const db = new NoteSpaceDatabase();
