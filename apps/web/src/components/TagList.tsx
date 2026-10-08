import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useTagStore } from '../store/tagStore';
import { useNoteStore } from '../store/noteStore';
import { useNotebookStore } from '../store/notebookStore';
import styles from './TagList.module.css';

export const TagList = () => {
  const { tags, fetchTags, createTag, addTagToNote, removeTagFromNote } = useTagStore();
  const { notes, activeNoteId, updateNote } = useNoteStore();
  const { activeNotebookId, activeSectionId } = useNotebookStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeNote = notes.find(n => n.id === activeNoteId);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeNote || !activeNotebookId || !activeSectionId) return null;

  const noteTags = activeNote.tags || [];

  const handleAddTag = async (tagId: string) => {
    if (noteTags.find((t: any) => t.id === tagId)) return;
    try {
      await addTagToNote(activeNote.id, tagId);
      const addedTag = tags.find(t => t.id === tagId);
      if (addedTag) {
        updateNote(activeNotebookId, activeSectionId, activeNote.id, {
          tags: [...noteTags, addedTag]
        } as any);
      }
    } catch (e) {
      console.error(e);
    }
    setIsOpen(false);
    setInputValue('');
  };

  const handleCreateAndAddTag = async () => {
    if (!inputValue.trim()) return;
    try {
      const newTag = await createTag(inputValue.trim());
      await addTagToNote(activeNote.id, newTag.id);
      updateNote(activeNotebookId, activeSectionId, activeNote.id, {
        tags: [...noteTags, newTag]
      } as any);
    } catch (e) {
      console.error(e);
    }
    setIsOpen(false);
    setInputValue('');
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromNote(activeNote.id, tagId);
      updateNote(activeNotebookId, activeSectionId, activeNote.id, {
        tags: noteTags.filter((t: any) => t.id !== tagId)
      } as any);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTags = tags.filter(t => 
    t.name.toLowerCase().includes(inputValue.toLowerCase()) &&
    !noteTags.find((nt: any) => nt.id === t.id)
  );

  return (
    <div className={styles.tagListContainer}>
      {noteTags.map((tag: any) => (
        <span key={tag.id} className={styles.tag} style={{ backgroundColor: tag.color }}>
          {tag.name}
          <button className={styles.removeTagBtn} onClick={() => handleRemoveTag(tag.id)}>
            <X size={12} />
          </button>
        </span>
      ))}

      <div className={styles.addTagContainer} ref={dropdownRef}>
        <button className={styles.addTagBtn} onClick={() => setIsOpen(!isOpen)}>
          <Plus size={14} /> Add tag
        </button>

        {isOpen && (
          <div className={styles.tagDropdown}>
            <input
              type="text"
              className={styles.tagInput}
              placeholder="Search or create tag"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (filteredTags.length > 0) {
                    handleAddTag(filteredTags[0].id);
                  } else {
                    handleCreateAndAddTag();
                  }
                }
              }}
            />
            <div className={styles.tagDropdownList}>
              {filteredTags.map(tag => (
                <div key={tag.id} className={styles.tagDropdownItem} onClick={() => handleAddTag(tag.id)}>
                  <div className={styles.colorDot} style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </div>
              ))}
              {inputValue.trim() && !tags.find(t => t.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                <div className={`${styles.tagDropdownItem} ${styles.createTagItem}`} onClick={handleCreateAndAddTag}>
                  Create "{inputValue}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
