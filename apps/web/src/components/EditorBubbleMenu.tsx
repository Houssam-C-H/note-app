import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Highlighter, CheckSquare, Star, HelpCircle, Lightbulb, 
  Code, Link as LinkIcon 
} from 'lucide-react';
import styles from './EditorBubbleMenu.module.css';

interface EditorBubbleMenuProps {
  editor: Editor | null;
  onOpenLinkModal?: () => void;
}

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor, onOpenLinkModal }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { selection } = editor.state;
      if (!selection || selection.empty) {
        setIsVisible(false);
        return;
      }

      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
        setIsVisible(false);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        setIsVisible(false);
        return;
      }

      // Calculate position above selection
      const menuWidth = menuRef.current?.offsetWidth || 340;
      const top = Math.max(10, rect.top - 46 + window.scrollY);
      const left = Math.max(10, Math.min(
        window.innerWidth - menuWidth - 10,
        rect.left + rect.width / 2 - menuWidth / 2 + window.scrollX
      ));

      setPosition({ top, left });
      setIsVisible(true);
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', () => {
      // Delay hide to allow clicks on toolbar buttons
      setTimeout(() => {
        if (!menuRef.current?.matches(':hover')) {
          setIsVisible(false);
        }
      }, 150);
    });

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      editor.off('selectionUpdate', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [editor]);

  if (!editor || !isVisible || !position) return null;

  return (
    <div 
      ref={menuRef}
      className={styles.bubbleMenu}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseDown={(e) => e.preventDefault()} // Prevent editor blur on click
    >
      {/* Quick Headings */}
      <button 
        type="button"
        className={`${styles.menuBtn} ${styles.textBtn} ${editor.isActive('heading', { level: 1 }) ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        H1
      </button>
      <button 
        type="button"
        className={`${styles.menuBtn} ${styles.textBtn} ${editor.isActive('heading', { level: 2 }) ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        H2
      </button>

      <div className={styles.divider} />

      {/* Formatting */}
      <button 
        type="button"
        className={`${styles.menuBtn} ${editor.isActive('bold') ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold size={13} />
      </button>
      <button 
        type="button"
        className={`${styles.menuBtn} ${editor.isActive('italic') ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic size={13} />
      </button>
      <button 
        type="button"
        className={`${styles.menuBtn} ${editor.isActive('underline') ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon size={13} />
      </button>
      <button 
        type="button"
        className={`${styles.menuBtn} ${editor.isActive('strike') ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough size={13} />
      </button>

      {/* Highlight Swatch */}
      <button 
        type="button"
        className={`${styles.menuBtn} ${editor.isActive('highlight') ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
        title="Highlight Yellow"
      >
        <Highlighter size={13} color="#eab308" />
      </button>

      <div className={styles.divider} />

      {/* OneNote Quick Tags */}
      <button 
        type="button"
        className={`${styles.menuBtn} ${editor.isActive('taskList') ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="To-Do Tag (Ctrl+1)"
      >
        <CheckSquare size={13} color="#0078d4" />
      </button>
      <button 
        type="button"
        className={styles.menuBtn}
        onClick={() => editor.chain().focus().insertContent(' ⭐ ').run()}
        title="Important Star Tag (Ctrl+2)"
      >
        <Star size={13} color="#f59e0b" />
      </button>
      <button 
        type="button"
        className={styles.menuBtn}
        onClick={() => editor.chain().focus().insertContent(' ❓ ').run()}
        title="Question Tag (Ctrl+3)"
      >
        <HelpCircle size={13} color="#7719aa" />
      </button>
      <button 
        type="button"
        className={styles.menuBtn}
        onClick={() => editor.chain().focus().insertContent(' 💡 ').run()}
        title="Idea Tag (Ctrl+4)"
      >
        <Lightbulb size={13} color="#107c41" />
      </button>

      <div className={styles.divider} />

      {/* Link & Code */}
      <button 
        type="button"
        className={`${styles.menuBtn} ${editor.isActive('code') ? styles.isActive : ''}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline Code"
      >
        <Code size={13} />
      </button>
      {onOpenLinkModal && (
        <button 
          type="button"
          className={`${styles.menuBtn} ${editor.isActive('link') ? styles.isActive : ''}`}
          onClick={onOpenLinkModal}
          title="Insert Link"
        >
          <LinkIcon size={13} />
        </button>
      )}
    </div>
  );
};
