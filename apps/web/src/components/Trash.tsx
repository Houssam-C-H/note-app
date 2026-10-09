import React, { useEffect, useState } from 'react';
import { noteApi } from '../api/note';
import { Trash2, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import styles from '../styles/Trash.module.css';

export const Trash: React.FC = () => {
  const [trashedNotes, setTrashedNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrashedNotes();
  }, []);

  const loadTrashedNotes = async () => {
    try {
      setIsLoading(true);
      const data = await noteApi.getTrashedNotes();
      setTrashedNotes(data);
    } catch (e: any) {
      setError('Failed to load trashed notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (noteId: string) => {
    try {
      await noteApi.restoreNote(noteId);
      setTrashedNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (e: any) {
      alert('Failed to restore note');
    }
  };

  const handlePermanentDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) {
      return;
    }
    
    try {
      await noteApi.permanentDeleteNote(noteId);
      setTrashedNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (e: any) {
      alert('Failed to delete note');
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
      
      {trashedNotes.length === 0 ? (
        <div className={styles.emptyState}>
          <Trash2 size={48} className={styles.emptyIcon} />
          <h3>Trash is empty</h3>
          <p>Notes you delete will appear here.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Deleted On</th>
                <th>Original Location</th>
                <th className={styles.actionsHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trashedNotes.map((note) => (
                <tr key={note.id}>
                  <td className={styles.titleCell}>
                    <span className={styles.noteTitle}>{note.title || 'Untitled'}</span>
                  </td>
                  <td>{format(new Date(note.deletedAt), 'MMM d, yyyy')}</td>
                  <td>
                    {note.section?.notebook?.title} / {note.section?.title}
                  </td>
                  <td className={styles.actionsCell}>
                    <button 
                      onClick={() => handleRestore(note.id)} 
                      className={styles.restoreBtn}
                      title="Restore Note"
                    >
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button 
                      onClick={() => handlePermanentDelete(note.id)} 
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
