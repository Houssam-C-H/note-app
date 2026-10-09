import { useEffect, useState, useCallback, useRef } from 'react';
import { useNoteStore } from '../store/noteStore';
import { useNotebookStore } from '../store/notebookStore';
import { RichTextEditor } from './RichTextEditor';
import { useAutosave } from '../hooks/useAutosave';
import { 
  Pin, Star, Share2, Copy, Trash2, Check, Cloud, FolderPlus, X, 
  Download, Printer, FileText, Globe, FileCode 
} from 'lucide-react';
import { ShareDialog } from './ShareDialog';
import { useUiStore } from '../store/uiStore';
import { DrawingCanvas } from './DrawingCanvas';
import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';
import { tipTapToMarkdown, downloadFile, exportToHtml, printNote } from '../utils/exportUtils';
import { noteApi } from '../api/note';
import { db } from '../lib/db';
import toast from 'react-hot-toast';
import styles from './NoteEditor.module.css';

export const NoteEditor = () => {
  const user = useAuthStore(s => s.user);
  const { 
    notebooks, 
    activeNotebookId, 
    activeSectionId, 
    setActiveNotebook, 
    setActiveSection, 
    fetchNotebooks,
    ensureDefaultSection 
  } = useNotebookStore();
  const { notes, activeNoteId, updateNote, duplicateNote, deleteNote, setActiveNote, createNote } = useNoteStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>(null);
  const [plaintext, setPlaintext] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Shared note banner & modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [selectedNotebookId, setSelectedNotebookId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  
  const activeNote = notes.find(n => n.id === activeNoteId);

  // Check if current note belongs to the user or is already placed in user's notebooks
  const isOwnedOrInMyFiles = Boolean(
    activeNote && (
      (user?.id && activeNote.userId === user.id) ||
      notebooks.some(nb => nb.sections?.some(sec => sec.id === activeNote.sectionId))
    )
  );

  // Reset banner dismissal on note change
  useEffect(() => {
    setIsBannerDismissed(false);
  }, [activeNoteId]);

  // Sync selected destination folder when notebooks change or modal opens
  useEffect(() => {
    if (notebooks.length > 0) {
      if (!selectedNotebookId || !notebooks.some(n => n.id === selectedNotebookId)) {
        const defaultNb = notebooks.find(n => n.id === activeNotebookId) || notebooks[0];
        setSelectedNotebookId(defaultNb.id);
        if (defaultNb.sections && defaultNb.sections.length > 0) {
          setSelectedSectionId(defaultNb.sections[0].id);
        } else {
          setSelectedSectionId('');
        }
      }
    }
  }, [notebooks, activeNotebookId, selectedNotebookId]);

  const handleNotebookSelect = (nbId: string) => {
    setSelectedNotebookId(nbId);
    const nb = notebooks.find(n => n.id === nbId);
    if (nb && nb.sections && nb.sections.length > 0) {
      setSelectedSectionId(nb.sections[0].id);
    } else {
      setSelectedSectionId('');
    }
  };

  const handleAddToFiles = async () => {
    if (!activeNote) return;
    setIsAdding(true);
    try {
      const savedNote = await noteApi.addNoteToMyFiles(activeNote.id, {
        targetNotebookId: selectedNotebookId || undefined,
        targetSectionId: selectedSectionId || undefined,
      });

      // Save to Dexie local DB
      await db.notes.put({
        id: savedNote.id,
        sectionId: savedNote.sectionId,
        userId: user?.id || savedNote.userId,
        title: savedNote.title,
        content: savedNote.content,
        plaintext: savedNote.plaintext,
        isPinned: savedNote.isPinned || false,
        isFavorite: savedNote.isFavorite || false,
        isArchived: false,
        createdAt: new Date(savedNote.createdAt).toISOString(),
        updatedAt: new Date(savedNote.updatedAt).toISOString(),
        deletedAt: null,
      });

      // Refresh notebooks in case a default notebook or section was created
      await fetchNotebooks();

      const destNbId = savedNote.section?.notebookId || selectedNotebookId;
      if (destNbId) setActiveNotebook(destNbId);
      if (savedNote.sectionId) setActiveSection(savedNote.sectionId);

      // Add to noteStore list and switch active note to the newly saved copy
      useNoteStore.setState((state) => ({
        notes: [savedNote, ...state.notes.filter(n => n.id !== savedNote.id)],
        activeNoteId: savedNote.id,
      }));

      // Ensure notes for this notebook/section are fetched and cached for the sidebar
      if (destNbId && savedNote.sectionId) {
        useNoteStore.getState().fetchNotesForNotebook(destNbId, [{ id: savedNote.sectionId }]);
      }

      setIsAddModalOpen(false);
      toast.success(`Added "${savedNote.title || 'Untitled'}" to your files!`);

      // Clean up URL if opened via shared query param ?shared=note&id=...
      if (window.location.search.includes('shared=')) {
        window.history.replaceState({}, '', '/dashboard');
      }
    } catch (err: any) {
      console.error('Failed to add note to files:', err);
      toast.error(err.message || 'Failed to add note to your files');
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || '');
      setContent(activeNote.content || null);
      setPlaintext(activeNote.plaintext || '');
    }
  }, [activeNote, activeNoteId]);

  const handleSave = useCallback(async (value: { title: string; content: any; plaintext: string }) => {
    const secId = activeNote?.sectionId || activeSectionId;
    const nbId = (activeNote as any)?.section?.notebookId || activeNotebookId || '';
    if (secId && activeNoteId) {
      await updateNote(nbId, secId, activeNoteId, { 
        title: value.title, 
        content: value.content,
        plaintext: value.plaintext
      });
    }
  }, [activeNotebookId, activeSectionId, activeNoteId, activeNote, updateNote]);

  const { status, error } = useAutosave({
    value: { title, content, plaintext },
    onSave: handleSave,
    delay: 1200,
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleContentChange = (newContent: any, newPlaintext: string) => {
    setContent(newContent);
    setPlaintext(newPlaintext);
  };

  if (!activeNote) {
    return (
      <div className={styles.emptyStateContainer}>
        <div className={styles.emptyPrompt}>Select or create a page to start typing</div>
        {activeNotebookId && (
          <button 
            className={styles.emptyCreateBtn}
            onClick={async () => {
              const secId = await ensureDefaultSection(activeNotebookId);
              const newId = await createNote(activeNotebookId, secId, 'Untitled Page');
              if (newId) setActiveNote(newId);
            }}
          >
            + Create New Page
          </button>
        )}
      </div>
    );
  }

  // Format date exactly like OneNote: "Friday, August 9, 2024      12:06 AM"
  const noteDate = new Date(activeNote.updatedAt || activeNote.createdAt);
  const dayString = noteDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeString = noteDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const togglePin = () => {
    if (activeNotebookId && activeSectionId) {
      updateNote(activeNotebookId, activeSectionId, activeNote.id, { isPinned: !activeNote.isPinned });
    }
  };

  const toggleFavorite = () => {
    if (activeNotebookId && activeSectionId) {
      updateNote(activeNotebookId, activeSectionId, activeNote.id, { isFavorite: !activeNote.isFavorite });
    }
  };

  const handleDuplicate = () => {
    if (activeNotebookId && activeSectionId) {
      duplicateNote(activeNotebookId, activeSectionId, activeNote.id);
    }
  };

  const handleDelete = () => {
    if (confirm('Delete this page?')) {
      const secId = activeSectionId || activeNote.sectionId;
      const nbId = activeNotebookId || (activeNote as any).section?.notebookId || '';
      deleteNote(nbId, secId, activeNote.id);
      toast.success('Note moved to Trash');
    }
  };

  const handlePrint = () => {
    printNote(title || 'Untitled Page');
    setIsExportMenuOpen(false);
  };

  const handleExportMarkdown = () => {
    const md = tipTapToMarkdown(content, title, `${dayString}    ${timeString}`);
    const safeTitle = (title || 'Untitled Page').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Note';
    downloadFile(`${safeTitle}.md`, md, 'text/markdown');
    toast.success('Downloaded Markdown (.md)');
    setIsExportMenuOpen(false);
  };

  const handleExportHtml = () => {
    const editorInstance = useEditorStore.getState().editor;
    const bodyHtml = editorInstance?.getHTML() || `<p>${plaintext || ''}</p>`;
    const htmlDoc = exportToHtml(title, `${dayString}    ${timeString}`, bodyHtml);
    const safeTitle = (title || 'Untitled Page').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Note';
    downloadFile(`${safeTitle}.html`, htmlDoc, 'text/html');
    toast.success('Downloaded HTML (.html)');
    setIsExportMenuOpen(false);
  };

  const handleExportTxt = () => {
    const textDoc = `${title || 'Untitled Page'}\n${dayString}    ${timeString}\n\n${plaintext || ''}`;
    const safeTitle = (title || 'Untitled Page').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Note';
    downloadFile(`${safeTitle}.txt`, textDoc, 'text/plain');
    toast.success('Downloaded Text (.txt)');
    setIsExportMenuOpen(false);
  };

  const { ruledLines, gridLines } = useUiStore();
  const targetNotebook = notebooks.find(n => n.id === selectedNotebookId);

  return (
    <div className={styles.canvasContainer}>
      <div className={`${styles.canvasSheet} ${ruledLines ? styles.ruledPaper : ''} ${gridLines ? styles.gridPaper : ''}`}>
        
        {/* Shared Note Notification Banner */}
        {!isOwnedOrInMyFiles && !isBannerDismissed && (
          <div className={styles.sharedBanner}>
            <div className={styles.sharedBannerLeft}>
              <FolderPlus size={20} className={styles.sharedBannerIcon} />
              <div className={styles.sharedBannerText}>
                <span className={styles.sharedBannerTitle}>Shared Note</span>
                <span className={styles.sharedBannerSubtitle}>
                  This note was shared with you. Would you like to add it to your files?
                </span>
              </div>
            </div>
            <div className={styles.sharedBannerActions}>
              <button 
                type="button"
                className={styles.addFilesBtn}
                onClick={() => setIsAddModalOpen(true)}
              >
                <FolderPlus size={14} />
                Add to My Files
              </button>
              <button 
                type="button"
                className={styles.dismissBtn}
                onClick={() => setIsBannerDismissed(true)}
                title="Dismiss banner"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Top subtle controls bar */}
        <div className={styles.topActionsBar}>
          <div className={styles.saveStatus}>
            {status === 'saving' && <span className={styles.savingText}>Saving...</span>}
            {status === 'saved' && <span className={styles.savedText}><Check size={12} /> Saved</span>}
            {status === 'error' && <span className={styles.errorText} title={error || ''}>Save failed</span>}
            {status === 'offline' && <span className={styles.offlineText}><Cloud size={12} /> Offline</span>}
          </div>

          <div className={styles.actionButtons}>
            {!isOwnedOrInMyFiles && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className={styles.addFilesBtn}
                style={{ padding: '3px 8px', fontSize: '11px', height: '26px' }}
                title="Add this shared page to your files"
              >
                <FolderPlus size={13} />
                Add to Files
              </button>
            )}
            <button 
              onClick={togglePin} 
              className={`${styles.iconBtn} ${activeNote.isPinned ? styles.activePin : ''}`}
              title={activeNote.isPinned ? "Unpin Page" : "Pin Page"}
            >
              <Pin size={14} />
            </button>
            <button 
              onClick={toggleFavorite} 
              className={`${styles.iconBtn} ${activeNote.isFavorite ? styles.activeStar : ''}`}
              title={activeNote.isFavorite ? "Unfavorite" : "Favorite"}
            >
              <Star size={14} />
            </button>
            <button 
              onClick={handleDuplicate} 
              className={styles.iconBtn}
              title="Duplicate Page"
            >
              <Copy size={14} />
            </button>
            <button 
              onClick={() => setIsSharing(true)} 
              className={styles.iconBtn}
              title="Share Page"
            >
              <Share2 size={14} />
            </button>
            
            {/* Export & Print Menu */}
            <div className={styles.dropdownWrap} ref={exportMenuRef}>
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                className={styles.iconBtn}
                title="Print or Export Note"
              >
                <Download size={14} />
              </button>

              {isExportMenuOpen && (
                <div className={styles.exportMenu}>
                  <button className={styles.exportMenuItem} onClick={handlePrint}>
                    <Printer size={14} color="#7719aa" />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button className={styles.exportMenuItem} onClick={handleExportMarkdown}>
                    <FileText size={14} color="#0078d4" />
                    <span>Export as Markdown (.md)</span>
                  </button>
                  <button className={styles.exportMenuItem} onClick={handleExportHtml}>
                    <Globe size={14} color="#107c41" />
                    <span>Export as HTML (.html)</span>
                  </button>
                  <button className={styles.exportMenuItem} onClick={handleExportTxt}>
                    <FileCode size={14} color="#605e5c" />
                    <span>Export as Plain Text (.txt)</span>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleDelete} 
              className={styles.iconBtn}
              title="Delete Page"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Page Title */}
        <div className={styles.titleSection}>
          <input
            type="text"
            className={styles.pageTitleInput}
            value={title}
            onChange={handleTitleChange}
            placeholder="Title"
          />

          {/* Date & Time line */}
          <div className={styles.dateTimeHeader}>
            <span className={styles.datePart}>{dayString}</span>
            <span className={styles.dateSpacer}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span className={styles.timePart}>{timeString}</span>
          </div>

          {/* Clean OneNote header rule */}
          <div className={styles.titleDivider} />
        </div>

        {/* Note Body */}
        <div className={styles.editorArea}>
          <RichTextEditor content={content} onChange={handleContentChange} />
        </div>

        {/* Freehand Inking & Drawing Layer */}
        <DrawingCanvas noteId={activeNote.id} />
      </div>

      {isSharing && (
        <ShareDialog 
          isOpen={isSharing} 
          onClose={() => setIsSharing(false)} 
          entityType="note" 
          entityId={activeNote.id} 
          entityTitle={activeNote.title || 'Untitled Page'} 
        />
      )}

      {/* Add to Files Modal Dialog */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isAdding && setIsAddModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <FolderPlus size={18} color="#7719aa" />
                Add Note to My Files
              </div>
              <button 
                type="button"
                className={styles.dismissBtn} 
                onClick={() => !isAdding && setIsAddModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary, #6b7280)', margin: '0 0 12px 0' }}>
                Save <strong>"{activeNote.title || 'Untitled Page'}"</strong> to your notebooks so you can organize, find, and edit it from your folders.
              </p>

              {notebooks.length > 0 ? (
                <>
                  <div>
                    <label className={styles.modalLabel}>Select Folder / Notebook</label>
                    <select 
                      className={styles.modalSelect}
                      value={selectedNotebookId}
                      onChange={(e) => handleNotebookSelect(e.target.value)}
                    >
                      {notebooks.map(nb => (
                        <option key={nb.id} value={nb.id}>{nb.title}</option>
                      ))}
                    </select>
                  </div>

                  {targetNotebook && targetNotebook.sections && targetNotebook.sections.length > 0 && (
                    <div>
                      <label className={styles.modalLabel}>Select Section</label>
                      <select 
                        className={styles.modalSelect}
                        value={selectedSectionId}
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                      >
                        {targetNotebook.sections.map(sec => (
                          <option key={sec.id} value={sec.id}>{sec.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary, #6b7280)', margin: '0' }}>
                  A folder named <strong>"My Notebook"</strong> will be automatically created in your files for this note.
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button 
                type="button" 
                className={styles.modalCancelBtn}
                onClick={() => setIsAddModalOpen(false)}
                disabled={isAdding}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={styles.modalSaveBtn}
                onClick={handleAddToFiles}
                disabled={isAdding}
              >
                <FolderPlus size={14} />
                {isAdding ? 'Adding...' : 'Add to My Files'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

