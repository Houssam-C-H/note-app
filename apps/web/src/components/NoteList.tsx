import { useEffect, useState } from 'react';
import { useNotebookStore } from '../store/notebookStore';
import { useNoteStore } from '../store/noteStore';
import styles from './NoteList.module.css';

export const NoteList = () => {
  const { activeNotebookId, activeSectionId } = useNotebookStore();
  const { notes, activeNoteId, fetchNotes, setActiveNote, createNote, deleteNote } = useNoteStore();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeNotebookId && activeSectionId) {
      fetchNotes(activeNotebookId, activeSectionId);
      setActiveNote(null);
    }
  }, [activeNotebookId, activeSectionId, fetchNotes, setActiveNote]);

  if (!activeNotebookId || !activeSectionId) {
    return null;
  }

  const handleCreateNote = async () => {
    setIsCreating(true);
    await createNote(activeNotebookId, activeSectionId, 'Untitled Note');
    setIsCreating(false);
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(activeNotebookId, activeSectionId, noteId);
    }
  };

  return (
    <div className={styles.noteListContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Notes</h2>
        <button 
          className={styles.addButton} 
          onClick={handleCreateNote}
          disabled={isCreating}
        >
          + New Note
        </button>
      </div>
      
      <div className={styles.list}>
        {notes.length === 0 ? (
          <div className={styles.emptyState}>No notes here yet.</div>
        ) : (
          notes.map((note) => (
            <div 
              key={note.id}
              className={`${styles.noteItem} ${activeNoteId === note.id ? styles.active : ''}`}
              onClick={() => setActiveNote(note.id)}
            >
              <div className={styles.noteTitle}>{note.title || 'Untitled Note'}</div>
              <div className={styles.notePreview}>
                {note.plaintext ? note.plaintext.substring(0, 50) + '...' : 'No additional text'}
              </div>
              <button 
                className={styles.deleteButton}
                onClick={(e) => handleDeleteNote(e, note.id)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
