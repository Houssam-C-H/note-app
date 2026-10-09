import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import styles from './StickyNotes.module.css';

interface StickyNoteItem {
  id: string;
  text: string;
  colorId: string;
  updatedAt: number;
}

interface StickyColorTheme {
  id: string;
  bg: string;
  header: string;
  border: string;
  dot: string;
  textColor?: string;
}

const STICKY_THEMES: StickyColorTheme[] = [
  { id: 'yellow', bg: '#fff8be', header: '#feeea0', border: '#f4df7d', dot: '#fcd34d' },
  { id: 'green',  bg: '#e2f8df', header: '#cff2cb', border: '#b0e7a8', dot: '#86efac' },
  { id: 'pink',   bg: '#ffe3ec', header: '#ffcfdc', border: '#fbb4c6', dot: '#f472b6' },
  { id: 'blue',   bg: '#def3ff', header: '#c6ebff', border: '#a5ddfc', dot: '#7dd3fc' },
  { id: 'purple', bg: '#f2e7fe', header: '#e5d3fd', border: '#d5bbfb', dot: '#c084fc' },
  { id: 'dark',   bg: '#2b2b2b', header: '#222222', border: '#3d3d3d', dot: '#525252', textColor: '#f3f2f1' },
];

interface StickyNotesProps {
  onClose: () => void;
}

export const StickyNotes: React.FC<StickyNotesProps> = ({ onClose }) => {
  const [notes, setNotes] = useState<StickyNoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('onenote_stickies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize legacy data with color hex to colorId
          return parsed.map((n: any) => ({
            id: n.id || crypto.randomUUID(),
            text: n.text || '',
            colorId: STICKY_THEMES.some(t => t.id === n.colorId) 
              ? n.colorId 
              : STICKY_THEMES.find(t => t.bg === n.color)?.id || 'yellow',
            updatedAt: n.updatedAt || Date.now()
          }));
        }
      }
    } catch {}
    return [
      { id: '1', text: 'Quick thought or todo list...', colorId: 'yellow', updatedAt: Date.now() }
    ];
  });

  const [activeStickyId, setActiveStickyId] = useState<string>(notes[0]?.id || '1');

  useEffect(() => {
    localStorage.setItem('onenote_stickies', JSON.stringify(notes));
  }, [notes]);

  const activeIndex = Math.max(0, notes.findIndex(n => n.id === activeStickyId));
  const activeSticky = notes[activeIndex] || notes[0];
  const activeTheme = STICKY_THEMES.find(t => t.id === activeSticky.colorId) || STICKY_THEMES[0];

  const handleTextChange = (text: string) => {
    setNotes(prev => prev.map(n => n.id === activeSticky.id ? { ...n, text, updatedAt: Date.now() } : n));
  };

  const handleThemeChange = (colorId: string) => {
    setNotes(prev => prev.map(n => n.id === activeSticky.id ? { ...n, colorId } : n));
  };

  const handleAddSticky = () => {
    const randomTheme = STICKY_THEMES[Math.floor(Math.random() * (STICKY_THEMES.length - 1))];
    const newNote: StickyNoteItem = {
      id: crypto.randomUUID(),
      text: '',
      colorId: randomTheme.id,
      updatedAt: Date.now()
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveStickyId(newNote.id);
  };

  const handleDeleteSticky = (id: string) => {
    if (notes.length <= 1) {
      setNotes([{ id: crypto.randomUUID(), text: '', colorId: 'yellow', updatedAt: Date.now() }]);
      return;
    }
    const remaining = notes.filter(n => n.id !== id);
    setNotes(remaining);
    setActiveStickyId(remaining[0].id);
  };

  const handlePrev = () => {
    if (notes.length <= 1) return;
    const nextIdx = (activeIndex - 1 + notes.length) % notes.length;
    setActiveStickyId(notes[nextIdx].id);
  };

  const handleNext = () => {
    if (notes.length <= 1) return;
    const nextIdx = (activeIndex + 1) % notes.length;
    setActiveStickyId(notes[nextIdx].id);
  };

  if (!activeSticky) return null;

  const isDarkTheme = activeTheme.id === 'dark';

  return (
    <div className={styles.stickyModalBackdrop} onClick={onClose}>
      <div 
        className={`${styles.stickyCard} ${isDarkTheme ? styles.stickyCardDark : ''}`} 
        style={{ 
          backgroundColor: activeTheme.bg,
          borderColor: activeTheme.border,
          color: activeTheme.textColor || '#201f1e'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Windows 11 Sticky Header Strip */}
        <div 
          className={styles.stickyHeader}
          style={{ 
            backgroundColor: activeTheme.header,
            borderBottomColor: activeTheme.border
          }}
        >
          <div className={styles.leftActions}>
            <button 
              className={styles.headerBtn} 
              onClick={handleAddSticky} 
              title="New note (Ctrl+N)"
            >
              <Plus size={16} />
            </button>
            
            {/* Color swatches with clean modern circles */}
            <div className={styles.colorPills}>
              {STICKY_THEMES.map(theme => {
                const isSelected = activeTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`${styles.colorDot} ${isSelected ? styles.activeColorDot : ''}`}
                    style={{ backgroundColor: theme.dot }}
                    onClick={() => handleThemeChange(theme.id)}
                    title={`${theme.id} note`}
                  >
                    {isSelected && (
                      <Check size={10} className={styles.colorCheck} color={theme.textColor ? '#ffffff' : '#333333'} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.rightActions}>
            <button 
              className={`${styles.headerBtn} ${styles.deleteBtn}`} 
              onClick={() => handleDeleteSticky(activeSticky.id)}
              title="Delete this note"
            >
              <Trash2 size={15} />
            </button>
            <button 
              className={styles.headerBtn} 
              onClick={onClose} 
              title="Close sticky notes"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          autoFocus
          className={styles.stickyTextarea}
          value={activeSticky.text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Take a note..."
          style={{ color: activeTheme.textColor || '#201f1e' }}
        />

        {/* Modern Sticky Notes Footer */}
        <div 
          className={styles.stickyFooter}
          style={{ 
            borderTopColor: activeTheme.border,
            backgroundColor: activeTheme.header
          }}
        >
          {notes.length > 1 ? (
            <div className={styles.pagerContainer}>
              <div className={styles.pagerControls}>
                <button 
                  type="button" 
                  className={styles.pagerArrowBtn} 
                  onClick={handlePrev}
                  title="Previous note"
                >
                  <ChevronLeft size={14} />
                </button>
                
                <span className={styles.pagerText}>
                  {activeIndex + 1} of {notes.length}
                </span>

                <button 
                  type="button" 
                  className={styles.pagerArrowBtn} 
                  onClick={handleNext}
                  title="Next note"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Dot indicators */}
              <div className={styles.noteIndicatorDots}>
                {notes.map((n, i) => {
                  const itemTheme = STICKY_THEMES.find(t => t.id === n.colorId) || STICKY_THEMES[0];
                  const isActive = n.id === activeSticky.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`${styles.indicatorDot} ${isActive ? styles.activeIndicatorDot : ''}`}
                      style={{ backgroundColor: itemTheme.dot }}
                      onClick={() => setActiveStickyId(n.id)}
                      title={`Jump to note ${i + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.singleNoteStatus}>
              <span>Sticky Note</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
