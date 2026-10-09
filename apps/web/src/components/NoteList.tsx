import { useEffect, useState } from 'react';
import { useNotebookStore } from '../store/notebookStore';
import { useNoteStore } from '../store/noteStore';
import { Skeleton } from './Skeleton';
import { Plus, ArrowUpDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './NoteList.module.css';

export const NoteList = () => {
  const { activeNotebookId, activeSectionId } = useNotebookStore();
  const { notes, activeNoteId, isLoading, fetchNotes, setActiveNote, createNote, deleteNote } = useNoteStore();
  const [isCreating, setIsCreating] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (activeNotebookId && activeSectionId) {
      fetchNotes(activeNotebookId, activeSectionId);
      const active = notes.find(n => n.id === activeNoteId);
      if (active && active.sectionId && active.sectionId !== activeSectionId) {
        setActiveNote(null);
      }
    }
  }, [activeNotebookId, activeSectionId, fetchNotes]);

  if (!activeNotebookId || !activeSectionId) {
    return null;
  }

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      await createNote(activeNotebookId, activeSectionId, 'Untitled Page');
      toast.success('Page created');
    } catch (err) {
      toast.error('Failed to create page');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (confirm('Delete this page?')) {
      try {
        await deleteNote(activeNotebookId, activeSectionId, noteId);
        toast.success('Page deleted');
      } catch (err) {
        toast.error('Failed to delete page');
      }
    }
  };

  const sortedNotes = [...notes].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return sortAsc ? timeA - timeB : timeB - timeA;
  });

  const renderContent = () => {
    if (isLoading && notes.length === 0) {
      return (
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <Skeleton height="18px" width="80%" style={{ marginBottom: '6px' }} />
              <Skeleton height="12px" width="50%" />
            </div>
          ))}
        </div>
      );
    }

    if (sortedNotes.length === 0) {
      return (
        <div className={styles.emptyPages}>
          <span>No pages in this section</span>
        </div>
      );
    }

    return sortedNotes.map((note) => {
      const dateStr = new Date(note.updatedAt || note.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      return (
        <div 
          key={note.id}
          className={`${styles.pageItem} ${activeNoteId === note.id ? styles.activePage : ''}`}
          onClick={() => setActiveNote(note.id)}
        >
          <div className={styles.pageTitle}>{note.title || 'Untitled Page'}</div>
          <div className={styles.pageSubtitle}>
            <span className={styles.pageDate}>{dateStr}</span>
            <span className={styles.pagePreviewText}>
              {note.plaintext ? note.plaintext.substring(0, 40) : 'No extra text'}
            </span>
          </div>

          <button 
            className={styles.deleteHoverBtn}
            onClick={(e) => handleDeleteNote(e, note.id)}
            title="Delete page"
          >
            <Trash2 size={12} />
          </button>
        </div>
      );
    });
  };

  return (
    <div className={styles.pagesColumn}>
      {/* Top action row with OneNote Add Page button */}
      <div className={styles.pagesHeader}>
        <button 
          className={styles.addPageButton} 
          onClick={handleCreateNote}
          disabled={isCreating}
          title="Add a new page"
        >
          <Plus size={15} />
          <span>Add Page</span>
        </button>

        <button 
          className={styles.sortButton} 
          onClick={() => setSortAsc(!sortAsc)}
          title="Sort pages"
        >
          <ArrowUpDown size={14} />
        </button>
      </div>
      
      {/* Flat pages list */}
      <div className={styles.pagesList}>
        {renderContent()}
      </div>
    </div>
  );
};
