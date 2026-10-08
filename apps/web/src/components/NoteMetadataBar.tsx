import { useState } from 'react';
import { useNoteStore } from '../store/noteStore';
import { useNotebookStore } from '../store/notebookStore';
import { Pin, Star, Archive, Clock, Copy, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { TagList } from './TagList';
import { ShareDialog } from './ShareDialog';
import styles from './NoteMetadataBar.module.css';

export const NoteMetadataBar = () => {
  const { notebooks, activeNotebookId, activeSectionId } = useNotebookStore();
  const { notes, activeNoteId, updateNote, duplicateNote } = useNoteStore();
  const [isSharing, setIsSharing] = useState(false);
  
  const activeNote = notes.find(n => n.id === activeNoteId);

  if (!activeNote || !activeNotebookId || !activeSectionId) {
    return null;
  }

  const togglePin = () => {
    updateNote(activeNotebookId, activeSectionId, activeNote.id, { isPinned: !activeNote.isPinned });
  };

  const toggleFavorite = () => {
    updateNote(activeNotebookId, activeSectionId, activeNote.id, { isFavorite: !activeNote.isFavorite });
  };

  const toggleArchive = () => {
    updateNote(activeNotebookId, activeSectionId, activeNote.id, { isArchived: !activeNote.isArchived });
  };

  const handleDuplicate = () => {
    duplicateNote(activeNotebookId, activeSectionId, activeNote.id);
  };

  const handleMove = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSectionId = e.target.value;
    if (newSectionId !== activeSectionId) {
      updateNote(activeNotebookId, activeSectionId, activeNote.id, { sectionId: newSectionId });
    }
  };

  const formattedDate = activeNote.lastEditedAt 
    ? format(new Date(activeNote.lastEditedAt), "MMM d, yyyy 'at' h:mm a")
    : 'Unknown';

  const activeNotebook = notebooks.find(nb => nb.id === activeNotebookId);

  return (
    <div className={styles.metadataBar}>
      <div className={styles.timestamp}>
        <Clock size={14} className={styles.icon} />
        <span>Last edited {formattedDate}</span>
      </div>
      
      <div className={styles.actions}>
        <select 
          className={styles.sectionSelect}
          value={activeSectionId}
          onChange={handleMove}
          title="Move note to different section"
        >
          {activeNotebook?.sections.map(sec => (
            <option key={sec.id} value={sec.id}>{sec.title}</option>
          ))}
        </select>
        
        <button 
          onClick={handleDuplicate} 
          className={styles.actionButton}
          title="Duplicate Note"
        >
          <Copy size={16} />
        </button>

        <button 
          onClick={togglePin} 
          className={`${styles.actionButton} ${activeNote.isPinned ? styles.active : ''}`}
          title={activeNote.isPinned ? "Unpin" : "Pin Note"}
        >
          <Pin size={16} />
        </button>
        <button 
          onClick={toggleFavorite} 
          className={`${styles.actionButton} ${activeNote.isFavorite ? styles.activeFavorite : ''}`}
          title={activeNote.isFavorite ? "Unfavorite" : "Favorite"}
        >
          <Star size={16} />
        </button>
        <button 
          onClick={() => setIsSharing(true)} 
          className={styles.actionButton}
          title="Share Note"
        >
          <Share2 size={16} />
        </button>
        <button 
          onClick={toggleArchive} 
          className={`${styles.actionButton} ${activeNote.isArchived ? styles.activeArchive : ''}`}
          title={activeNote.isArchived ? "Unarchive" : "Archive Note"}
        >
          <Archive size={16} />
        </button>
      </div>

      <div style={{ width: '100%', marginTop: '8px' }}>
        <TagList />
      </div>

      <ShareDialog 
        isOpen={isSharing} 
        onClose={() => setIsSharing(false)} 
        entityType="note" 
        entityId={activeNote.id} 
        entityTitle={activeNote.title || 'Untitled'} 
      />
    </div>
  );
};
