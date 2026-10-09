import React, { useEffect, useState } from 'react';
import { noteApi } from '../api/note';
import { notebookApi } from '../api/notebook';
import { db } from '../lib/db';
import { useNotebookStore } from '../store/notebookStore';
import { Trash2, RotateCcw, AlertCircle, Loader2, FileText, Folder } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import styles from '../styles/Trash.module.css';

interface TrashedItem {
  id: string;
  type: 'page' | 'folder';
  title: string;
  deletedAt: string;
  location?: string;
  original: any;
}

export const Trash: React.FC = () => {
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { fetchNotebooks } = useNotebookStore();

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    try {
      setIsLoading(true);
      setError('');
      const itemsMap = new Map<string, TrashedItem>();

      // 1. Load trashed notes from Dexie
      try {
        const localNotes = await db.notes
          .filter(n => Boolean(n.deletedAt) || n.isArchived === true)
          .toArray();

        for (const n of localNotes) {
          itemsMap.set(n.id, {
            id: n.id,
            type: 'page',
            title: n.title || 'Untitled Page',
            deletedAt: n.deletedAt || n.updatedAt || new Date().toISOString(),
            location: 'Local Notebook',
            original: n,
          });
        }
      } catch (err) {
        console.warn('Could not read local trashed notes', err);
      }

      // 2. Load trashed notebooks from Dexie
      try {
        const localNotebooks = await db.notebooks
          .filter(nb => Boolean((nb as any).deletedAt) || nb.isArchived === true)
          .toArray();

        for (const nb of localNotebooks) {
          itemsMap.set(nb.id, {
            id: nb.id,
            type: 'folder',
            title: nb.title || 'Untitled Folder',
            deletedAt: (nb as any).deletedAt || nb.updatedAt || new Date().toISOString(),
            location: 'Root',
            original: nb,
          });
        }
      } catch (err) {
        console.warn('Could not read local trashed notebooks', err);
      }

      // 3. Load trashed notes from remote API
      try {
        const remoteNotes = await noteApi.getTrashedNotes();
        if (Array.isArray(remoteNotes)) {
          for (const n of remoteNotes) {
            const loc = n.section?.notebook?.title 
              ? `${n.section.notebook.title} / ${n.section?.title || 'Section'}`
              : 'Notebook';
            itemsMap.set(n.id, {
              id: n.id,
              type: 'page',
              title: n.title || 'Untitled Page',
              deletedAt: n.deletedAt || n.updatedAt || new Date().toISOString(),
              location: loc,
              original: n,
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch remote trashed notes', err);
      }

      // 4. Load trashed notebooks from remote API
      try {
        const remoteNotebooks = await notebookApi.getTrashedNotebooks();
        if (Array.isArray(remoteNotebooks)) {
          for (const nb of remoteNotebooks) {
            itemsMap.set(nb.id, {
              id: nb.id,
              type: 'folder',
              title: nb.title || 'Untitled Folder',
              deletedAt: nb.deletedAt || nb.updatedAt || new Date().toISOString(),
              location: 'Root',
              original: nb,
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch remote trashed notebooks', err);
      }

      const sorted = Array.from(itemsMap.values()).sort((a, b) => {
        return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
      });

      setTrashedItems(sorted);
    } catch (e: any) {
      setError('Failed to load trash items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (item: TrashedItem) => {
    try {
      if (item.type === 'page') {
        // Restore locally in Dexie
        const existing = await db.notes.get(item.id);
        if (existing) {
          await db.notes.put({ ...existing, deletedAt: null, isArchived: false });
        }
        // Restore on server
        try {
          await noteApi.restoreNote(item.id);
        } catch (e) {
          console.warn('Remote restore note notice:', e);
        }
        toast.success(`Page "${item.title}" restored`);
      } else {
        // Restore notebook locally
        const existing = await db.notebooks.get(item.id);
        if (existing) {
          await db.notebooks.put({ ...existing, isArchived: false, deletedAt: null } as any);
        }
        // Restore on server
        try {
          await notebookApi.restoreNotebook(item.id);
        } catch (e) {
          console.warn('Remote restore notebook notice:', e);
        }
        await fetchNotebooks();
        toast.success(`Folder "${item.title}" restored`);
      }

      setTrashedItems(prev => prev.filter(i => i.id !== item.id));
    } catch (e: any) {
      toast.error('Failed to restore item');
    }
  };

  const handlePermanentDelete = async (item: TrashedItem) => {
    const noun = item.type === 'page' ? 'page' : 'folder';
    if (!confirm(`Are you sure you want to permanently delete this ${noun}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      if (item.type === 'page') {
        try {
          await db.notes.delete(item.id);
        } catch {}
        try {
          await noteApi.permanentDeleteNote(item.id);
        } catch (e) {
          console.warn('Remote permanent delete notice:', e);
        }
      } else {
        try {
          await db.notebooks.delete(item.id);
        } catch {}
        try {
          await notebookApi.permanentDeleteNotebook(item.id);
        } catch (e) {
          console.warn('Remote permanent delete notice:', e);
        }
      }

      setTrashedItems(prev => prev.filter(i => i.id !== item.id));
      toast.success(`${item.title} permanently deleted`);
    } catch (e: any) {
      toast.error('Failed to delete item');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      return format(d, 'MMM d, yyyy');
    } catch {
      return 'Recently';
    }
  };

  if (isLoading) {
    return <div className={styles.loading}><Loader2 size={24} className={styles.spin} /> Loading trash...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.pageTitle}>Trash</h2>
        <div className={styles.warningBox}>
          <AlertCircle size={16} />
          <span>Items in trash will be kept until you permanently delete them.</span>
        </div>
      </div>
      
      {trashedItems.length === 0 ? (
        <div className={styles.emptyState}>
          <Trash2 size={48} className={styles.emptyIcon} />
          <h3>Trash is empty</h3>
          <p>Pages and folders you delete will appear here.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Deleted On</th>
                <th>Original Location</th>
                <th className={styles.actionsHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trashedItems.map((item) => (
                <tr key={item.id}>
                  <td className={styles.titleCell}>
                    <div className={styles.itemTitleWrapper}>
                      {item.type === 'page' ? (
                        <FileText size={16} color="var(--primary)" />
                      ) : (
                        <Folder size={16} color="#0078d4" />
                      )}
                      <span className={styles.noteTitle}>{item.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.typeBadge} ${item.type === 'page' ? styles.pageBadge : styles.folderBadge}`}>
                      {item.type === 'page' ? 'Page' : 'Folder'}
                    </span>
                  </td>
                  <td>{formatDate(item.deletedAt)}</td>
                  <td>{item.location || 'Notebook'}</td>
                  <td className={styles.actionsCell}>
                    <button 
                      onClick={() => handleRestore(item)} 
                      className={styles.restoreBtn}
                      title="Restore Item"
                    >
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button 
                      onClick={() => handlePermanentDelete(item)} 
                      className={styles.deleteBtn}
                      title="Delete Permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
