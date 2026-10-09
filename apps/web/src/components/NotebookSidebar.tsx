import React, { useState, useEffect } from 'react';
import { useNotebookStore, Notebook } from '../store/notebookStore';
import { useNoteStore, Note } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import { 
  Users, Trash2, ChevronRight, ChevronDown, Plus, 
  Folder, FolderOpen, FileText, Trash, CornerDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../styles/NotebookSidebar.module.css';

const NOTEBOOK_COLORS = [
  '#7719aa', // OneNote Purple
  '#0078d4', // Blue
  '#107c41', // Green
  '#d13438', // Red
  '#ea580c', // Orange
  '#f59e0b', // Amber
  '#e3008c', // Pink
  '#008272', // Teal
];

export const NotebookSidebar: React.FC = () => {
  const { 
    notebooks, activeNotebookId,
    setActiveNotebook, setActiveSection,
    createNotebook, deleteNotebook, ensureDefaultSection
  } = useNotebookStore();
  
  const { 
    notes, activeNoteId, setActiveNote, 
    fetchNotesForNotebook, createNote, deleteNote 
  } = useNoteStore();

  const { currentView, setView } = useUiStore();
  
  // Track expanded state for folders and parent pages
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    ...(activeNotebookId ? { [activeNotebookId]: true } : {})
  });
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});

  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState(NOTEBOOK_COLORS[0]);

  // Load notes for all notebooks when notebooks change
  useEffect(() => {
    for (const nb of notebooks) {
      if (nb.sections && nb.sections.length > 0) {
        fetchNotesForNotebook(nb.id, nb.sections);
      }
    }
  }, [notebooks, fetchNotesForNotebook]);

  // Toggle notebook folder open/close
  const toggleFolder = (e: React.MouseEvent, nbId: string) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [nbId]: !prev[nbId] }));
  };

  // Toggle parent page subcategories
  const togglePageExpand = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    setExpandedPages(prev => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookTitle.trim()) return;
    try {
      await createNotebook(newNotebookTitle.trim(), newNotebookColor);
      toast.success('Folder created');
      setNewNotebookTitle('');
      setIsCreatingNotebook(false);
    } catch (err) {
      toast.error('Failed to create folder');
    }
  };

  const handleCreatePageInFolder = async (e: React.MouseEvent, nb: Notebook) => {
    e.stopPropagation();
    try {
      const sectionId = await ensureDefaultSection(nb.id);
      const newId = await createNote(nb.id, sectionId, 'Untitled Page');
      setActiveNotebook(nb.id);
      setActiveSection(sectionId);
      if (newId) setActiveNote(newId);
      setView('notebooks');
      setExpandedFolders(prev => ({ ...prev, [nb.id]: true }));
      toast.success('Page created');
    } catch (err) {
      toast.error('Failed to create page');
    }
  };

  const handleCreateSubPage = async (e: React.MouseEvent, nb: Notebook, parentNote: Note) => {
    e.stopPropagation();
    try {
      const newId = await createNote(nb.id, parentNote.sectionId, 'Untitled Sub-page', parentNote.id);
      setActiveNotebook(nb.id);
      setActiveSection(parentNote.sectionId);
      if (newId) setActiveNote(newId);
      setView('notebooks');
      setExpandedPages(prev => ({ ...prev, [parentNote.id]: true }));
      toast.success('Sub-page created');
    } catch (err) {
      toast.error('Failed to create sub-page');
    }
  };

  const handleDeletePage = async (e: React.MouseEvent, nb: Notebook, note: Note) => {
    e.stopPropagation();
    if (confirm(`Delete "${note.title || 'Untitled Page'}"?`)) {
      try {
        await deleteNote(nb.id, note.sectionId, note.id);
        toast.success('Page deleted');
      } catch (err) {
        toast.error('Failed to delete page');
      }
    }
  };

  const handleDeleteNotebook = async (e: React.MouseEvent, nbId: string) => {
    e.stopPropagation();
    if (confirm('Delete this folder and all its contents?')) {
      try {
        await deleteNotebook(nbId);
        toast.success('Folder deleted');
      } catch (err) {
        toast.error('Failed to delete folder');
      }
    }
  };

  // Helper: Get notes for a notebook
  const getNotebookNotes = (nb: Notebook) => {
    const secIds = new Set((nb.sections || []).map(s => s.id));
    return notes.filter(n => secIds.has(n.sectionId) && !n.isArchived);
  };

  return (
    <div className={styles.sidebar}>
      {/* Top shortcuts */}
      <div className={styles.topMenu}>
        <button 
          className={`${styles.menuItem} ${currentView === 'shared' ? styles.menuItemActive : ''}`}
          onClick={() => setView('shared')}
        >
          <Users size={14} /> 
          <span>Shared with me</span>
        </button>
        <button 
          className={`${styles.menuItem} ${currentView === 'trash' ? styles.menuItemActive : ''}`}
          onClick={() => setView('trash')}
        >
          <Trash2 size={14} /> 
          <span>Trash</span>
        </button>
      </div>

      {/* Folders Header */}
      <div className={styles.header}>
        <span className={styles.title} onClick={() => setView('notebooks')}>
          FOLDERS &amp; PAGES
        </span>
        <button 
          className={styles.addFolderBtn} 
          onClick={() => setIsCreatingNotebook(true)}
          title="Create New Folder"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Form: New Folder */}
      {isCreatingNotebook && (
        <form onSubmit={handleCreateNotebook} className={styles.createForm}>
          <input
            autoFocus
            type="text"
            value={newNotebookTitle}
            onChange={(e) => setNewNotebookTitle(e.target.value)}
            placeholder="Folder name..."
            className={styles.input}
          />
          <div className={styles.colorPalette}>
            {NOTEBOOK_COLORS.map(c => (
              <span 
                key={c} 
                className={`${styles.colorDot} ${newNotebookColor === c ? styles.selectedDot : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setNewNotebookColor(c)}
              />
            ))}
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn}>Save</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setIsCreatingNotebook(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Folders & Pages Tree */}
      <div className={styles.list}>
        {notebooks.map((nb: Notebook, index: number) => {
          const color = nb.color || NOTEBOOK_COLORS[index % NOTEBOOK_COLORS.length];
          const isExpanded = !!expandedFolders[nb.id];
          const isFolderActive = activeNotebookId === nb.id && currentView === 'notebooks';
          
          const folderNotes = getNotebookNotes(nb);
          const rootNotes = folderNotes.filter(n => !n.parentId);
          const childNotesMap = new Map<string, Note[]>();
          for (const n of folderNotes) {
            if (n.parentId) {
              const list = childNotesMap.get(n.parentId) || [];
              list.push(n);
              childNotesMap.set(n.parentId, list);
            }
          }

          return (
            <div key={nb.id} className={styles.folderWrapper}>
              {/* Folder Row */}
              <div 
                className={`${styles.folderRow} ${isFolderActive ? styles.activeFolderRow : ''}`}
                onClick={() => {
                  setActiveNotebook(nb.id);
                  setView('notebooks');
                  setExpandedFolders(prev => ({ ...prev, [nb.id]: true }));
                  // If folder has notes and no active note, open the first note
                  if (rootNotes.length > 0 && !activeNoteId) {
                    setActiveSection(rootNotes[0].sectionId);
                    setActiveNote(rootNotes[0].id);
                  }
                }}
              >
                <button 
                  className={styles.chevronBtn} 
                  onClick={(e) => toggleFolder(e, nb.id)}
                  title={isExpanded ? "Collapse Folder" : "Expand Folder"}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {isExpanded ? (
                  <FolderOpen size={16} color={color} className={styles.folderIcon} />
                ) : (
                  <Folder size={16} color={color} className={styles.folderIcon} />
                )}
                
                <span className={styles.folderTitle}>{nb.title}</span>
                
                {/* Actions on hover */}
                <div className={styles.folderActions}>
                  <button 
                    className={styles.actionBtn}
                    title="Add Page to this Folder"
                    onClick={(e) => handleCreatePageInFolder(e, nb)}
                  >
                    <Plus size={13} />
                  </button>
                  <button 
                    className={styles.actionBtn}
                    title="Delete Folder"
                    onClick={(e) => handleDeleteNotebook(e, nb.id)}
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>

              {/* Pages dropdown directly inside the folder */}
              {isExpanded && (
                <div className={styles.pagesList}>
                  {rootNotes.map((note) => {
                    const isNoteActive = activeNoteId === note.id;
                    const children = childNotesMap.get(note.id) || [];
                    const hasChildren = children.length > 0;
                    const isPageExpanded = !!expandedPages[note.id];

                    return (
                      <div key={note.id} className={styles.pageGroup}>
                        {/* Root Page Row */}
                        <div 
                          className={`${styles.pageRow} ${isNoteActive ? styles.activePageRow : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveNotebook(nb.id);
                            setActiveSection(note.sectionId);
                            setActiveNote(note.id);
                            setView('notebooks');
                          }}
                        >
                          {hasChildren ? (
                            <button 
                              className={styles.subChevronBtn}
                              onClick={(e) => togglePageExpand(e, note.id)}
                            >
                              {isPageExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          ) : (
                            <span className={styles.chevronPlaceholder} />
                          )}

                          <FileText size={14} className={styles.pageIcon} />
                          <span className={styles.pageTitle}>{note.title || 'Untitled Page'}</span>

                          {/* Page Hover Actions */}
                          <div className={styles.pageActions}>
                            <button 
                              className={styles.actionBtn}
                              title="Add Sub-page (Subcategory)"
                              onClick={(e) => handleCreateSubPage(e, nb, note)}
                            >
                              <Plus size={11} />
                            </button>
                            <button 
                              className={styles.actionBtn}
                              title="Delete Page"
                              onClick={(e) => handleDeletePage(e, nb, note)}
                            >
                              <Trash size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Indented Sub-pages (Subcategories) */}
                        {hasChildren && isPageExpanded && (
                          <div className={styles.subPagesList}>
                            {children.map((childNote) => {
                              const isChildActive = activeNoteId === childNote.id;
                              return (
                                <div 
                                  key={childNote.id}
                                  className={`${styles.subPageRow} ${isChildActive ? styles.activePageRow : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveNotebook(nb.id);
                                    setActiveSection(childNote.sectionId);
                                    setActiveNote(childNote.id);
                                    setView('notebooks');
                                  }}
                                >
                                  <CornerDownRight size={12} className={styles.subPageCornerIcon} />
                                  <FileText size={13} className={styles.pageIcon} />
                                  <span className={styles.pageTitle}>{childNote.title || 'Untitled Sub-page'}</span>

                                  <div className={styles.pageActions}>
                                    <button 
                                      className={styles.actionBtn}
                                      title="Delete Sub-page"
                                      onClick={(e) => handleDeletePage(e, nb, childNote)}
                                    >
                                      <Trash size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Page button at bottom of folder */}
                  <button 
                    className={styles.addPageRowBtn}
                    onClick={(e) => handleCreatePageInFolder(e, nb)}
                    title="Add a page inside this folder"
                  >
                    <Plus size={12} />
                    <span>New Page</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
