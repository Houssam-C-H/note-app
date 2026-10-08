import React, { useState } from 'react';
import { useNotebookStore, Notebook } from '../store/notebookStore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ColorPicker } from './ColorPicker';
import styles from '../styles/NotebookSidebar.module.css';

export const NotebookSidebar: React.FC = () => {
  const { notebooks, activeNotebookId, setActiveNotebook, createNotebook, deleteNotebook, reorderNotebooks, updateNotebook } = useNotebookStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createNotebook(newTitle.trim(), newColor);
    setNewTitle('');
    setNewColor('#6366f1');
    setIsCreating(false);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(notebooks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    reorderNotebooks(items.map(nb => nb.id));
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Notebooks</h2>
        <button className={styles.addButton} onClick={() => setIsCreating(true)}>+</button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Notebook title..."
            className={styles.input}
          />
          <ColorPicker color={newColor} onChange={setNewColor} />
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn}>Save</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="notebooks">
          {(provided) => (
            <ul 
              className={styles.list}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {notebooks.map((nb: Notebook, index: number) => (
                <Draggable key={nb.id} draggableId={nb.id} index={index}>
                  {(provided, snapshot) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${styles.item} ${activeNotebookId === nb.id ? styles.active : ''} ${snapshot.isDragging ? styles.dragging : ''}`}
                      onClick={() => setActiveNotebook(nb.id)}
                    >
                      <div className={styles.colorIndicator} style={{ backgroundColor: nb.color }} />
                      <span className={styles.itemTitle}>{nb.title}</span>
                      <button 
                        className={styles.archiveButton}
                        title="Archive Notebook"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Archive this notebook?')) updateNotebook(nb.id, { isArchived: true });
                        }}
                      >
                        📥
                      </button>
                      <button 
                        className={styles.deleteButton}
                        title="Delete Notebook"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this notebook?')) deleteNotebook(nb.id);
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
