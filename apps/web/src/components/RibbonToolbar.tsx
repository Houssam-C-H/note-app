import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  List, ListOrdered, CheckSquare, Link as LinkIcon, Terminal,
  AlignLeft, AlignCenter, AlignRight, Table as TableIcon, Paperclip, Highlighter,
  Undo, Redo, Copy, Scissors, ClipboardPaste, Star, ChevronDown,
  Brush, Calendar, Clock, Minus, Printer, Download, Eye, FileSpreadsheet, 
  Eraser, Plus, HelpCircle, BookOpen, PanelLeft, Type, Trash2, Lightbulb,
  Pen, MousePointer
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { useUiStore } from '../store/uiStore';
import { useNoteStore } from '../store/noteStore';
import { useNotebookStore } from '../store/notebookStore';
import { useAttachmentStore } from '../store/attachmentStore';
import { LinkModal } from './LinkModal';
import { tipTapToMarkdown, downloadFile, printNote } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import styles from './RibbonToolbar.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const RibbonToolbar: React.FC = () => {
  const { editor } = useEditorStore();
  const { 
    activeRibbonTab, ruledLines, gridLines, 
    toggleRuledLines, toggleGridLines, togglePrintLayout, toggleSidebar,
    isSidebarOpen,
    drawTool, drawColor, drawWidth, setDrawTool, setDrawColor, setDrawWidth, clearInk
  } = useUiStore();
  const { activeNotebookId, ensureDefaultSection, setActiveNotebook, setActiveSection } = useNotebookStore();
  const { activeNoteId, notes, createNote, setActiveNote } = useNoteStore();
  const { uploadAttachment } = useAttachmentStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedMarks, setCopiedMarks] = useState<readonly any[] | null>(null);

  // Dropdown states
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isTagsMenuOpen, setIsTagsMenuOpen] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const tagsMenuRef = useRef<HTMLDivElement>(null);

  // Link Modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState('');
  const [linkInitialText, setLinkInitialText] = useState('');
  const [isEditingExistingLink, setIsEditingExistingLink] = useState(false);

  const activeNote = notes.find(n => n.id === activeNoteId);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
        setIsTableMenuOpen(false);
      }
      if (tagsMenuRef.current && !tagsMenuRef.current.contains(e.target as Node)) {
        setIsTagsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format Painter listener
  useEffect(() => {
    if (!editor || !copiedMarks) return;
    const applyMarks = () => {
      if (copiedMarks && !editor.state.selection.empty) {
        editor.chain().focus();
        for (const m of copiedMarks) {
          editor.chain().setMark(m.type.name, m.attrs);
        }
        editor.chain().run();
        setCopiedMarks(null);
        toast.success('Format applied');
      }
    };
    editor.on('selectionUpdate', applyMarks);
    return () => {
      editor.off('selectionUpdate', applyMarks);
    };
  }, [editor, copiedMarks]);

  const requireEditor = (action: () => void) => {
    if (!editor) {
      toast('Open or create a page first', { icon: '📝' });
      return;
    }
    action();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNoteId) return;

    try {
      const att = await uploadAttachment(activeNoteId, file);
      if (att.mimeType.startsWith('image/') && editor) {
        editor.chain().focus().setImage({ src: `${API_URL}/attachments/${att.id}/download` }).run();
      }
      toast.success('Attachment uploaded');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    const { from, to, empty } = editor.state.selection;
    const selectedText = !empty ? editor.state.doc.textBetween(from, to, ' ') : '';

    setLinkInitialUrl(previousUrl || 'https://');
    setLinkInitialText(selectedText);
    setIsEditingExistingLink(Boolean(previousUrl));
    setIsLinkModalOpen(true);
  };

  const handleApplyLink = (url: string, text: string) => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const selectedText = !empty ? editor.state.doc.textBetween(from, to, ' ') : '';

    if (empty) {
      const displayText = text || url;
      editor.chain().focus().insertContent({
        type: 'text',
        text: displayText,
        marks: [{ type: 'link', attrs: { href: url } }],
      }).run();
    } else if (text && text !== selectedText) {
      editor.chain().focus().insertContent({
        type: 'text',
        text: text,
        marks: [{ type: 'link', attrs: { href: url } }],
      }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    toast.success('Link applied');
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    toast.success('Link removed');
  };

  const handlePaste = async () => {
    requireEditor(async () => {
      try {
        const text = await navigator.clipboard?.readText();
        if (text && editor) {
          editor.chain().focus().insertContent(text).run();
        }
      } catch {
        toast('Press Ctrl+V to paste into the page', { icon: '📋' });
      }
    });
  };

  const handleCopy = () => {
    requireEditor(() => {
      if (!editor) return;
      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        navigator.clipboard?.writeText(text);
        toast.success('Copied selection');
      } else {
        toast('Select text to copy');
      }
    });
  };

  const handleCut = () => {
    requireEditor(() => {
      if (!editor) return;
      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        navigator.clipboard?.writeText(text).then(() => {
          editor?.chain().focus().deleteSelection().run();
          toast.success('Cut to clipboard');
        });
      } else {
        toast('Select text to cut');
      }
    });
  };

  const handleFormatPainter = () => {
    requireEditor(() => {
      if (!editor) return;
      const marks = editor.state.selection.$from.marks();
      if (marks.length > 0) {
        setCopiedMarks(marks);
        toast.success('Format copied! Select text to apply.');
      } else {
        toast('No formatting found at cursor');
      }
    });
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const font = e.target.value;
    requireEditor(() => editor?.chain().focus().setMark('textStyle', { fontFamily: font }).run());
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value;
    requireEditor(() => editor?.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run());
  };

  const getCurrentStyle = () => {
    if (!editor) return 'paragraph';
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    if (editor.isActive('codeBlock')) return 'code';
    if (editor.isActive('blockquote')) return 'quote';
    return 'paragraph';
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    requireEditor(() => {
      if (!editor) return;
      if (val === 'paragraph') editor.chain().focus().setParagraph().run();
      else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
      else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
      else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
      else if (val === 'code') editor.chain().focus().toggleCodeBlock().run();
      else if (val === 'quote') editor.chain().focus().toggleBlockquote().run();
    });
  };

  const handleInsertDate = () => {
    requireEditor(() => {
      const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      editor?.chain().focus().insertContent(` ${dateStr} `).run();
    });
  };

  const handleInsertTime = () => {
    requireEditor(() => {
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      editor?.chain().focus().insertContent(` ${timeStr} `).run();
    });
  };

  const handleExportMarkdown = () => {
    if (!editor) {
      toast('Open a page first');
      return;
    }
    const md = tipTapToMarkdown(editor.getJSON(), activeNote?.title || 'Note');
    const safeTitle = (activeNote?.title || 'Note').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Note';
    downloadFile(`${safeTitle}.md`, md, 'text/markdown');
    toast.success('Downloaded Markdown (.md)');
  };

  const handleCreateNewPage = async () => {
    if (!activeNotebookId) {
      toast('Select or create a folder in the sidebar first');
      return;
    }
    try {
      const secId = await ensureDefaultSection(activeNotebookId);
      const newId = await createNote(activeNotebookId, secId, 'Untitled Page');
      if (newId) {
        setActiveNotebook(activeNotebookId);
        setActiveSection(secId);
        setActiveNote(newId);
        toast.success('New page created');
      }
    } catch {
      toast.error('Could not create page');
    }
  };

  const showWordCount = () => {
    if (!editor) {
      toast('Word count: 0 words');
      return;
    }
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readingTime = Math.ceil(words / 200);
    toast(`Words: ${words} | Characters: ${chars} | Est. Read Time: ~${readingTime} min`, {
      icon: '📊',
      duration: 4000,
    });
  };

  const showShortcutsModal = () => {
    toast((t) => (
      <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
        <strong>Keyboard Shortcuts</strong>
        <div><kbd>Ctrl+B</kbd> : Bold</div>
        <div><kbd>Ctrl+I</kbd> : Italic</div>
        <div><kbd>Ctrl+U</kbd> : Underline</div>
        <div><kbd>Ctrl+1</kbd> : To-Do Checkbox</div>
        <div><kbd>Ctrl+2</kbd> : Star Tag</div>
        <div><kbd>Ctrl+Z / Y</kbd> : Undo / Redo</div>
        <div><kbd>Ctrl+Shift+8</kbd> : Bullet List</div>
        <div><kbd>Ctrl+Shift+7</kbd> : Numbered List</div>
        <button 
          onClick={() => toast.dismiss(t.id)} 
          style={{ marginTop: '8px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    ), { duration: 6000 });
  };

  // Render toolbar based on the active ribbon tab
  const renderTabContent = () => {
    switch (activeRibbonTab) {
      case 'File':
        return (
          <>
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={handleCreateNewPage}
                  className={styles.ribbonBtn}
                  title="Create New Page in active notebook"
                >
                  <Plus size={14} />
                  <span>New Page</span>
                </button>
                <button 
                  onClick={() => printNote(activeNote?.title || 'Note')}
                  className={styles.ribbonBtn}
                  title="Print / Export to PDF"
                >
                  <Printer size={14} />
                  <span>Print / PDF</span>
                </button>
                <button 
                  onClick={handleExportMarkdown}
                  className={styles.ribbonBtn}
                  title="Export Note as Markdown"
                >
                  <Download size={14} />
                  <span>Export MD</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Document</span>
            </div>
            <div className={styles.divider} />
          </>
        );

      case 'Insert':
        return (
          <>
            {/* Table Group with interactive dropdown */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <div className={styles.dropdownContainer} ref={tableMenuRef}>
                  <button 
                    onClick={() => setIsTableMenuOpen(!isTableMenuOpen)}
                    className={`${styles.ribbonBtn} ${isTableMenuOpen ? styles.isActive : ''}`}
                    title="Table tools and options"
                  >
                    <TableIcon size={14} />
                    <span>Table</span>
                    <ChevronDown size={11} />
                  </button>

                  {isTableMenuOpen && (
                    <div className={styles.dropdownMenu}>
                      <button 
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsTableMenuOpen(false);
                          requireEditor(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run());
                        }}
                      >
                        <TableIcon size={14} /> <span>Insert 3x3 Table</span>
                      </button>
                      <button 
                        className={styles.dropdownItem}
                        disabled={!editor || !editor.can().addRowAfter()}
                        onClick={() => {
                          setIsTableMenuOpen(false);
                          requireEditor(() => editor?.chain().focus().addRowAfter().run());
                        }}
                      >
                        <Plus size={14} /> <span>Insert Row Below</span>
                      </button>
                      <button 
                        className={styles.dropdownItem}
                        disabled={!editor || !editor.can().addColumnAfter()}
                        onClick={() => {
                          setIsTableMenuOpen(false);
                          requireEditor(() => editor?.chain().focus().addColumnAfter().run());
                        }}
                      >
                        <Plus size={14} /> <span>Insert Column Right</span>
                      </button>
                      <div className={styles.dropdownDivider} />
                      <button 
                        className={styles.dropdownItemDanger}
                        disabled={!editor || !editor.can().deleteTable()}
                        onClick={() => {
                          setIsTableMenuOpen(false);
                          requireEditor(() => editor?.chain().focus().deleteTable().run());
                        }}
                      >
                        <Trash2 size={14} /> <span>Delete Table</span>
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().addRowAfter().run())}
                  className={styles.ribbonBtn} 
                  title="Add Row Below"
                  disabled={!editor || !editor.can().addRowAfter()}
                >
                  +Row
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().addColumnAfter().run())}
                  className={styles.ribbonBtn} 
                  title="Add Column Right"
                  disabled={!editor || !editor.can().addColumnAfter()}
                >
                  +Col
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().deleteTable().run())}
                  className={styles.ribbonBtn} 
                  title="Delete Table"
                  disabled={!editor || !editor.can().deleteTable()}
                >
                  Del
                </button>
              </div>
              <span className={styles.groupLabel}>Table</span>
            </div>
            <div className={styles.divider} />

            {/* Files & Media Group */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={() => {
                    if (!activeNoteId) {
                      toast('Open a note to attach files');
                      return;
                    }
                    fileInputRef.current?.click();
                  }} 
                  className={styles.ribbonBtn}
                  title="Attach File or Image"
                >
                  <Paperclip size={14} />
                  <span>Attach File</span>
                </button>
                <button 
                  onClick={() => requireEditor(setLink)} 
                  className={`${styles.ribbonBtn} ${editor?.isActive('link') ? styles.isActive : ''}`} 
                  title="Insert Hyperlink"
                >
                  <LinkIcon size={14} />
                  <span>Link</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Files &amp; Links</span>
            </div>
            <div className={styles.divider} />

            {/* Code & Symbols Group */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleCodeBlock().run())} 
                  className={`${styles.ribbonBtn} ${editor?.isActive('codeBlock') ? styles.isActive : ''}`} 
                  title="Bash / Terminal Code Block"
                >
                  <Terminal size={14} />
                  <span>Code Block</span>
                </button>
                <button 
                  onClick={handleInsertDate} 
                  className={styles.ribbonBtn}
                  title="Insert Date Stamp"
                >
                  <Calendar size={14} />
                  <span>Date</span>
                </button>
                <button 
                  onClick={handleInsertTime} 
                  className={styles.ribbonBtn}
                  title="Insert Time Stamp"
                >
                  <Clock size={14} />
                  <span>Time</span>
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().setHorizontalRule().run())} 
                  className={styles.ribbonBtn}
                  title="Horizontal Divider Line"
                >
                  <Minus size={14} />
                  <span>Divider</span>
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleTaskList().run())} 
                  className={`${styles.ribbonBtn} ${editor?.isActive('taskList') ? styles.isActive : ''}`}
                  title="Insert To-Do Checkbox"
                >
                  <CheckSquare size={14} />
                  <span>To-Do</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Code &amp; Symbols</span>
            </div>
          </>
        );

      case 'Draw':
        return (
          <>
            {/* Group 1: Draw Mode / Tools */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button
                  type="button"
                  className={`${styles.ribbonBtn} ${drawTool === 'type' ? styles.isActive : ''}`}
                  onClick={() => setDrawTool('type')}
                  title="Type Mode - Click anywhere to edit notes"
                >
                  <MousePointer size={14} />
                  <span>Type</span>
                </button>

                <button
                  type="button"
                  className={`${styles.ribbonBtn} ${drawTool === 'pen' ? styles.isActive : ''}`}
                  onClick={() => setDrawTool('pen')}
                  title="Draw Pen - Freehand ink on notes"
                >
                  <Pen size={14} color="#7719aa" />
                  <span>Pen</span>
                </button>

                <button
                  type="button"
                  className={`${styles.ribbonBtn} ${drawTool === 'highlighter' ? styles.isActive : ''}`}
                  onClick={() => setDrawTool('highlighter')}
                  title="Highlighter - Draw translucent highlights"
                >
                  <Highlighter size={14} color="#eab308" />
                  <span>Highlighter</span>
                </button>

                <button
                  type="button"
                  className={`${styles.ribbonBtn} ${drawTool === 'eraser' ? styles.isActive : ''}`}
                  onClick={() => setDrawTool('eraser')}
                  title="Eraser - Erase drawn ink"
                >
                  <Eraser size={14} />
                  <span>Eraser</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Tools</span>
            </div>

            <div className={styles.divider} />

            {/* Group 2: Color Palette */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow} style={{ gap: '6px' }}>
                {drawTool === 'highlighter' ? (
                  // Highlighter Colors
                  [
                    { color: '#fef08a', name: 'Yellow' },
                    { color: '#bbf7d0', name: 'Green' },
                    { color: '#fbcfe8', name: 'Pink' },
                    { color: '#bae6fd', name: 'Blue' },
                    { color: '#fed7aa', name: 'Orange' },
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      className={styles.iconBtn}
                      style={{ 
                        backgroundColor: c.color, 
                        border: drawColor === c.color ? '2px solid #333' : '1px solid rgba(0,0,0,0.18)', 
                        width: 22, 
                        height: 22, 
                        borderRadius: '50%',
                        transform: drawColor === c.color ? 'scale(1.15)' : 'none'
                      }}
                      title={`Highlight ${c.name}`}
                      onClick={() => setDrawColor(c.color)}
                    />
                  ))
                ) : (
                  // Pen Colors
                  [
                    { color: '#7719aa', name: 'OneNote Purple' },
                    { color: '#201f1e', name: 'Black' },
                    { color: '#0078d4', name: 'Blue' },
                    { color: '#d13438', name: 'Red' },
                    { color: '#107c41', name: 'Green' },
                    { color: '#f59e0b', name: 'Amber' },
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      className={styles.iconBtn}
                      style={{ 
                        backgroundColor: c.color, 
                        border: drawColor === c.color ? '2px solid #000' : '1px solid rgba(0,0,0,0.2)', 
                        width: 22, 
                        height: 22, 
                        borderRadius: '50%',
                        transform: drawColor === c.color ? 'scale(1.15)' : 'none'
                      }}
                      title={`Pen ${c.name}`}
                      onClick={() => setDrawColor(c.color)}
                    />
                  ))
                )}
              </div>
              <span className={styles.groupLabel}>Ink Colors</span>
            </div>

            <div className={styles.divider} />

            {/* Group 3: Stroke Thickness */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow} style={{ gap: '4px' }}>
                {[
                  { width: 1.5, label: 'Fine' },
                  { width: 3, label: 'Medium' },
                  { width: 5.5, label: 'Bold' },
                ].map(w => (
                  <button
                    key={w.width}
                    type="button"
                    className={`${styles.ribbonBtn} ${drawWidth === w.width ? styles.isActive : ''}`}
                    onClick={() => setDrawWidth(w.width)}
                    title={`${w.label} Stroke (${w.width}px)`}
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              <span className={styles.groupLabel}>Thickness</span>
            </div>

            <div className={styles.divider} />

            {/* Group 4: Ink Actions */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button
                  type="button"
                  className={styles.ribbonBtn}
                  onClick={() => {
                    clearInk();
                    toast.success('Cleared drawing ink');
                  }}
                  title="Clear all ink drawings on this page"
                >
                  <Trash2 size={14} color="#d13438" />
                  <span>Clear Ink</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Manage Ink</span>
            </div>
            <div className={styles.divider} />
          </>
        );

      case 'History':
        return (
          <>
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().undo().run())}
                  disabled={!editor || !editor.can().undo()}
                  className={styles.ribbonBtn}
                  title="Undo Last Edit"
                >
                  <Undo size={14} />
                  <span>Undo</span>
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().redo().run())}
                  disabled={!editor || !editor.can().redo()}
                  className={styles.ribbonBtn}
                  title="Redo Edit"
                >
                  <Redo size={14} />
                  <span>Redo</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Revisions</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow} style={{ fontSize: '11px', color: '#605e5c', gap: '8px' }}>
                <div><strong>Modified:</strong> {activeNote ? new Date(activeNote.updatedAt || activeNote.createdAt).toLocaleTimeString() : 'N/A'}</div>
                <div><strong>Cloud:</strong> Synced</div>
              </div>
              <span className={styles.groupLabel}>Page Info</span>
            </div>
          </>
        );

      case 'Review':
        return (
          <>
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={showWordCount}
                  className={styles.ribbonBtn}
                  title="Display Word Count & Stats"
                >
                  <Type size={14} />
                  <span>Word Count</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Proofing</span>
            </div>
            <div className={styles.divider} />
          </>
        );

      case 'View':
        return (
          <>
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={toggleRuledLines}
                  className={`${styles.ribbonBtn} ${ruledLines ? styles.isActive : ''}`}
                  title="Toggle OneNote Ruled Paper Lines"
                >
                  <FileSpreadsheet size={14} />
                  <span>Ruled Lines</span>
                </button>
                <button 
                  onClick={toggleGridLines}
                  className={`${styles.ribbonBtn} ${gridLines ? styles.isActive : ''}`}
                  title="Toggle Graph Grid Lines"
                >
                  <TableIcon size={14} />
                  <span>Grid Lines</span>
                </button>
                <button 
                  onClick={togglePrintLayout}
                  className={styles.ribbonBtn}
                  title="Toggle Print Layout"
                >
                  <Eye size={14} />
                  <span>Print View</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Page Setup</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={toggleSidebar}
                  className={`${styles.ribbonBtn} ${isSidebarOpen ? styles.isActive : ''}`}
                  title="Show / Hide Notebook Navigation Sidebar"
                >
                  <PanelLeft size={14} />
                  <span>Sidebar</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Window</span>
            </div>
          </>
        );

      case 'Help':
        return (
          <>
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={showShortcutsModal}
                  className={styles.ribbonBtn}
                  title="View OneNote Keyboard Shortcuts"
                >
                  <HelpCircle size={14} />
                  <span>Shortcuts</span>
                </button>
                <button 
                  onClick={() => toast('Tip: Press Enter in tables to navigate cells, or Tab to indent!', { icon: '💡' })}
                  className={styles.ribbonBtn}
                  title="OneNote Tips & Tricks"
                >
                  <BookOpen size={14} />
                  <span>Tips</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Help &amp; Support</span>
            </div>
            <div className={styles.divider} />
          </>
        );

      case 'Home':
      default:
        return (
          <>
            {/* Group 1: Clipboard */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  className={styles.ribbonBtn}
                  onClick={handlePaste}
                  title="Paste (Ctrl+V)"
                >
                  <ClipboardPaste size={14} color="#7719aa" />
                  <span>Paste</span>
                </button>

                <button onClick={handleCut} className={styles.iconBtn} title="Cut (Ctrl+X)">
                  <Scissors size={13} />
                </button>
                <button onClick={handleCopy} className={styles.iconBtn} title="Copy (Ctrl+C)">
                  <Copy size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().undo().run())} 
                  disabled={!editor || !editor.can().undo()} 
                  className={styles.iconBtn}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().redo().run())} 
                  disabled={!editor || !editor.can().redo()} 
                  className={styles.iconBtn}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo size={13} />
                </button>
                <button 
                  onClick={handleFormatPainter}
                  className={`${styles.iconBtn} ${copiedMarks ? styles.isActive : ''}`}
                  title="Format Painter"
                >
                  <Brush size={13} />
                </button>
              </div>
              <span className={styles.groupLabel}>Clipboard</span>
            </div>

            <div className={styles.divider} />

            {/* Group 2: Basic Text */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                {/* Font Family Dropdown */}
                <select 
                  className={styles.ribbonSelect} 
                  onChange={handleFontFamilyChange} 
                  defaultValue="Calibri"
                  style={{ width: '92px' }}
                  title="Font Family"
                >
                  <option value="Calibri">Calibri</option>
                  <option value="'Segoe UI', sans-serif">Segoe UI</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Consolas', monospace">Consolas</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                </select>

                {/* Font Size Dropdown */}
                <select 
                  className={styles.ribbonSelect} 
                  onChange={handleFontSizeChange} 
                  defaultValue="15"
                  style={{ width: '44px' }}
                  title="Font Size"
                >
                  <option value="11">11</option>
                  <option value="12">12</option>
                  <option value="14">14</option>
                  <option value="15">15</option>
                  <option value="16">16</option>
                  <option value="18">18</option>
                  <option value="20">20</option>
                  <option value="24">24</option>
                  <option value="32">32</option>
                </select>

                {/* Color Pickers */}
                <label title="Font Color" className={styles.colorPickerLabel}>
                  <span className={styles.fontColorA}>A</span>
                  <span className={styles.fontColorBar} style={{ backgroundColor: editor?.getAttributes('textStyle').color || '#7719aa' }} />
                  <input 
                    type="color" 
                    value={editor?.getAttributes('textStyle').color || '#201f1e'}
                    onChange={event => requireEditor(() => editor?.chain().focus().setColor(event.target.value).run())} 
                    className={styles.hiddenColorInput} 
                  />
                </label>

                <label title="Highlight Color" className={styles.colorPickerLabel}>
                  <Highlighter size={13} />
                  <span className={styles.fontColorBar} style={{ backgroundColor: '#fef08a' }} />
                  <input 
                    type="color" 
                    defaultValue="#fef08a"
                    onChange={event => requireEditor(() => editor?.chain().focus().toggleHighlight({ color: event.target.value }).run())} 
                    className={styles.hiddenColorInput} 
                  />
                </label>

                {/* Formatting Buttons */}
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleBold().run())} 
                  className={`${styles.iconBtn} ${editor?.isActive('bold') ? styles.isActive : ''}`} 
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleItalic().run())} 
                  className={`${styles.iconBtn} ${editor?.isActive('italic') ? styles.isActive : ''}`} 
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleUnderline().run())} 
                  className={`${styles.iconBtn} ${editor?.isActive('underline') ? styles.isActive : ''}`} 
                  title="Underline (Ctrl+U)"
                >
                  <UnderlineIcon size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleStrike().run())} 
                  className={`${styles.iconBtn} ${editor?.isActive('strike') ? styles.isActive : ''}`} 
                  title="Strikethrough"
                >
                  <Strikethrough size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleBulletList().run())} 
                  className={`${styles.iconBtn} ${editor?.isActive('bulletList') ? styles.isActive : ''}`} 
                  title="Bulleted List"
                >
                  <List size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleOrderedList().run())} 
                  className={`${styles.iconBtn} ${editor?.isActive('orderedList') ? styles.isActive : ''}`} 
                  title="Numbered List"
                >
                  <ListOrdered size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().setTextAlign('left').run())} 
                  className={`${styles.iconBtn} ${editor?.isActive({ textAlign: 'left' }) ? styles.isActive : ''}`} 
                  title="Align Left"
                >
                  <AlignLeft size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().setTextAlign('center').run())} 
                  className={`${styles.iconBtn} ${editor?.isActive({ textAlign: 'center' }) ? styles.isActive : ''}`} 
                  title="Align Center"
                >
                  <AlignCenter size={13} />
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().setTextAlign('right').run())} 
                  className={`${styles.iconBtn} ${editor?.isActive({ textAlign: 'right' }) ? styles.isActive : ''}`} 
                  title="Align Right"
                >
                  <AlignRight size={13} />
                </button>
              </div>
              <span className={styles.groupLabel}>Basic Text</span>
            </div>

            <div className={styles.divider} />

            {/* Group 3: Styles Dropdown (Compact OneNote Style Selector) */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <select 
                  className={styles.ribbonSelect} 
                  value={getCurrentStyle()} 
                  onChange={handleStyleChange}
                  style={{ width: '105px', fontWeight: 500 }}
                  title="Text Style"
                >
                  <option value="paragraph">Normal</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                  <option value="code">Code Block</option>
                  <option value="quote">Quote</option>
                </select>

                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())}
                  className={`${styles.ribbonBtn} ${editor?.isActive('heading', { level: 1 }) ? styles.isActive : ''}`}
                  title="Heading 1"
                  style={{ fontWeight: 600, padding: '2px 6px' }}
                >
                  H1
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
                  className={`${styles.ribbonBtn} ${editor?.isActive('heading', { level: 2 }) ? styles.isActive : ''}`}
                  title="Heading 2"
                  style={{ fontWeight: 600, padding: '2px 6px' }}
                >
                  H2
                </button>
              </div>
              <span className={styles.groupLabel}>Styles</span>
            </div>

            <div className={styles.divider} />

            {/* Group 4: Tags Dropdown & Quick Buttons */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleTaskList().run())}
                  className={`${styles.ribbonBtn} ${editor?.isActive('taskList') ? styles.isActive : ''}`}
                  title="To-Do Checkbox Tag (Ctrl+1)"
                >
                  <CheckSquare size={13} color="#0078d4" />
                  <span>To-Do</span>
                </button>

                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run())}
                  className={`${styles.ribbonBtn} ${editor?.isActive('highlight', { color: '#fef08a' }) ? styles.isActive : ''}`}
                  title="Important Star Tag (Ctrl+2)"
                >
                  <Star size={13} color="#f59e0b" />
                  <span>Important</span>
                </button>

                {/* More Tags Dropdown */}
                <div className={styles.dropdownContainer} ref={tagsMenuRef}>
                  <button 
                    onClick={() => setIsTagsMenuOpen(!isTagsMenuOpen)}
                    className={`${styles.iconBtn} ${isTagsMenuOpen ? styles.isActive : ''}`}
                    title="More OneNote Tags"
                  >
                    <ChevronDown size={12} />
                  </button>

                  {isTagsMenuOpen && (
                    <div className={styles.dropdownMenu}>
                      <button 
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsTagsMenuOpen(false);
                          requireEditor(() => editor?.chain().focus().toggleTaskList().run());
                        }}
                      >
                        <CheckSquare size={14} color="#0078d4" /> <span>To-Do Checkbox (Ctrl+1)</span>
                      </button>
                      <button 
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsTagsMenuOpen(false);
                          requireEditor(() => editor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run());
                        }}
                      >
                        <Star size={14} color="#f59e0b" /> <span>Important Star (Ctrl+2)</span>
                      </button>
                      <button 
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsTagsMenuOpen(false);
                          requireEditor(() => editor?.chain().focus().insertContent(' ❓ Question: ').run());
                        }}
                      >
                        <HelpCircle size={14} color="#7719aa" /> <span>Question (?)</span>
                      </button>
                      <button 
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsTagsMenuOpen(false);
                          requireEditor(() => editor?.chain().focus().insertContent(' 💡 Idea: ').run());
                        }}
                      >
                        <Lightbulb size={14} color="#107c41" /> <span>Idea Tag</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <span className={styles.groupLabel}>Tags</span>
            </div>

            <div className={styles.divider} />

            {/* Group 5: Insert Quick */}
            <div className={styles.toolbarGroup}>
              <div className={styles.groupRow}>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().toggleCodeBlock().run())} 
                  className={`${styles.ribbonBtn} ${editor?.isActive('codeBlock') ? styles.isActive : ''}`} 
                  title="Code / Terminal Block"
                >
                  <Terminal size={14} />
                  <span>Code</span>
                </button>
                <button 
                  onClick={() => requireEditor(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())} 
                  className={styles.ribbonBtn}
                  title="Insert 3x3 Table"
                >
                  <TableIcon size={14} />
                  <span>Table</span>
                </button>
                <button 
                  onClick={() => requireEditor(setLink)} 
                  className={`${styles.ribbonBtn} ${editor?.isActive('link') ? styles.isActive : ''}`} 
                  title="Insert Link"
                >
                  <LinkIcon size={14} />
                  <span>Link</span>
                </button>
                <button 
                  onClick={() => {
                    if (!activeNoteId) {
                      toast('Open a note to attach files');
                      return;
                    }
                    fileInputRef.current?.click();
                  }} 
                  className={styles.ribbonBtn}
                  title="Insert File or Image"
                >
                  <Paperclip size={14} />
                  <span>Attach</span>
                </button>
              </div>
              <span className={styles.groupLabel}>Insert</span>
            </div>
          </>
        );
    }
  };

  return (
    <div className={styles.toolbar}>
      {renderTabContent()}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        initialUrl={linkInitialUrl}
        initialText={linkInitialText}
        isEditingExistingLink={isEditingExistingLink}
        onApply={handleApplyLink}
        onRemove={handleRemoveLink}
      />
    </div>
  );
};
