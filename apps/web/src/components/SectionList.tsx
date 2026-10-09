import React, { useState } from 'react';
import { useNotebookStore, Section } from '../store/notebookStore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ShareDialog } from './ShareDialog';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../styles/SectionList.module.css';

export const SectionList: React.FC = () => {
  const { notebooks, activeNotebookId, activeSectionId, setActiveSection, createSection, deleteSection, reorderSections } = useNotebookStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const activeNotebook = notebooks.find(nb => nb.id === activeNotebookId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeNotebookId) return;
    try {
      await createSection(activeNotebookId, newTitle.trim());
      toast.success('Section created');
      setNewTitle('');
      setIsCreating(false);
    } catch (err) {
      toast.error('Failed to create section');
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !activeNotebookId || !activeNotebook) return;
    
    const items = Array.from(activeNotebook.sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    reorderSections(activeNotebookId, items.map(sec => sec.id));
  };

  const handleDelete = async (sectionId: string) => {
    if (confirm('Delete this section?')) {
      try {
        await deleteSection(activeNotebookId!, sectionId);
        toast.success('Section deleted');
      } catch (err) {
        toast.error('Failed to delete section');
      }
    }
  };

  if (!activeNotebook) {
    return <div className={styles.emptyContainer}>Select a notebook</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{activeNotebook.title}</h2>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            className={styles.actionButton} 
            onClick={() => setIsSharing(true)}
            title="Share Notebook"
          >
            <Share2 size={16} />
          </button>
          <button className={styles.addButton} onClick={() => setIsCreating(true)} title="Add Section">+</button>
        </div>
      </div>

      <ShareDialog 
        isOpen={isSharing} 
        onClose={() => setIsSharing(false)} 
        entityType="notebook" 
        entityId={activeNotebook.id} 
        entityTitle={activeNotebook.title} 
      />

      {isCreating && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Section title..."
            className={styles.input}
            onBlur={() => setIsCreating(false)}
          />
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`sections-${activeNotebookId}`}>
          {(provided) => (
            <ul 
              className={styles.list}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {activeNotebook.sections.map((sec: Section, index: number) => (
                <Draggable key={sec.id} draggableId={sec.id} index={index}>
                  {(provided, snapshot) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${styles.item} ${activeSectionId === sec.id ? styles.active : ''} ${snapshot.isDragging ? styles.dragging : ''}`}
                      onClick={() => setActiveSection(sec.id)}
                    >
                      <div className={styles.colorIndicator} style={{ backgroundColor: sec.color }} />
                      <span className={styles.itemTitle}>{sec.title}</span>
                      <button 
                        className={styles.deleteButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(sec.id);
                        }}
                      >
                        ×
                      </button>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
