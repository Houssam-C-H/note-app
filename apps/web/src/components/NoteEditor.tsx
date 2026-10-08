import { useEffect, useState, useCallback } from 'react';
import { useNoteStore } from '../store/noteStore';
import { useNotebookStore } from '../store/notebookStore';
import { RichTextEditor } from './RichTextEditor';
import { NoteMetadataBar } from './NoteMetadataBar';
import { useAutosave } from '../hooks/useAutosave';
import styles from './NoteEditor.module.css';

export const NoteEditor = () => {
  const { activeNotebookId, activeSectionId } = useNotebookStore();
  const { notes, activeNoteId, updateNote } = useNoteStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>(null);
  const [plaintext, setPlaintext] = useState('');
  
  const activeNote = notes.find(n => n.id === activeNoteId);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || '');
      setContent(activeNote.content || null);
      setPlaintext(activeNote.plaintext || '');
    }
  }, [activeNoteId]); // Only update when active note changes

  const handleSave = useCallback(async (value: { title: string; content: any; plaintext: string }) => {
    if (activeNotebookId && activeSectionId && activeNoteId) {
      await updateNote(activeNotebookId, activeSectionId, activeNoteId, { 
        title: value.title, 
        content: value.content,
        plaintext: value.plaintext
      });
    }
  }, [activeNotebookId, activeSectionId, activeNoteId, updateNote]);

  const { status, error, flush } = useAutosave({
    value: { title, content, plaintext },
    onSave: handleSave,
    delay: 1500,
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleContentChange = (newContent: any, newPlaintext: string) => {
    setContent(newContent);
    setPlaintext(newPlaintext);
  };

  if (!activeNote) {
    return <div className={styles.emptyState}>Select a note to edit</div>;
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.headerArea}>
        <div className={styles.saveStatus}>
          {status === 'saving' && <span className={styles.savingIndicator}>Saving...</span>}
          {status === 'saved' && <span className={styles.savedIndicator}>All changes saved</span>}
          {status === 'error' && <span className={styles.errorIndicator} title={error || ''}>Save failed</span>}
          {status === 'offline' && <span className={styles.offlineIndicator}>Offline mode</span>}
        </div>
        <input
          type="text"
          className={styles.titleInput}
          value={title}
          onChange={handleTitleChange}
          placeholder="Note Title"
        />
        <NoteMetadataBar />
      </div>
      <div className={styles.richTextContainer}>
        <RichTextEditor content={content} onChange={handleContentChange} />
      </div>
    </div>
  );
};
