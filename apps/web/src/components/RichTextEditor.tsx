import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { 
  Heading1, Heading2, Heading3, CheckSquare, Table as TableIcon, 
  Code, Quote, Minus, List, ListOrdered 
} from 'lucide-react';
import styles from './RichTextEditor.module.css';
import { AttachmentList } from './AttachmentList';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { SlashCommandMenu, SlashCommand } from './SlashCommandMenu';
import { useAttachmentStore } from '../store/attachmentStore';
import { useNoteStore } from '../store/noteStore';
import { useEditorStore } from '../store/editorStore';

const lowlight = createLowlight(common);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Extend TextStyle for native fontFamily and fontSize
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontFamily: {
        default: null,
        parseHTML: element => element.style.fontFamily || null,
        renderHTML: attributes => {
          if (!attributes.fontFamily) return {};
          return { style: `font-family: ${attributes.fontFamily}` };
        },
      },
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

interface RichTextEditorProps {
  content: any;
  onChange: (content: any, plaintext: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const { activeNoteId } = useNoteStore();
  const { uploadAttachment } = useAttachmentStore();
  const { setEditor } = useEditorStore();

  // Slash commands popover state
  const [slashState, setSlashState] = useState<{
    isOpen: boolean;
    query: string;
    position: { top: number; left: number };
    range: { from: number; to: number } | null;
  }>({
    isOpen: false,
    query: '',
    position: { top: 0, left: 0 },
    range: null,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'bash',
      }),
      Image.configure({
        HTMLAttributes: {
          class: styles.inlineImage,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CustomTextStyle,
      Color,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getText());
    },
  });

  // Sync editor instance with editor store
  useEffect(() => {
    setEditor(editor);
    return () => {
      setEditor(null);
    };
  }, [editor, setEditor]);

  // Sync external content changes into editor
  useEffect(() => {
    if (editor && content) {
      const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(content);
      if (!isSame) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    } else if (editor && !content) {
      editor.commands.setContent('', { emitUpdate: false });
    }
  }, [content, editor]);

  // Define commands
  const commands: SlashCommand[] = useMemo(() => [
    {
      id: 'h1',
      title: 'Heading 1',
      description: 'Large section heading',
      keywords: ['h1', 'heading', 'title', 'large'],
      icon: <Heading1 size={16} />,
      action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'h2',
      title: 'Heading 2',
      description: 'Medium subsection heading',
      keywords: ['h2', 'heading', 'subtitle', 'medium'],
      icon: <Heading2 size={16} />,
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'h3',
      title: 'Heading 3',
      description: 'Small topic heading',
      keywords: ['h3', 'heading', 'small'],
      icon: <Heading3 size={16} />,
      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'todo',
      title: 'To-do Checklist',
      description: 'Track tasks with checkboxes',
      keywords: ['todo', 'task', 'check', 'checklist'],
      icon: <CheckSquare size={16} />,
      action: () => editor?.chain().focus().toggleTaskList().run(),
    },
    {
      id: 'table',
      title: 'Table',
      description: 'Insert 3x3 interactive data table',
      keywords: ['table', 'grid', 'columns', 'rows'],
      icon: <TableIcon size={16} />,
      action: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: 'bullet',
      title: 'Bullet List',
      description: 'Create a simple bulleted list',
      keywords: ['bullet', 'list', 'unordered'],
      icon: <List size={16} />,
      action: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered',
      title: 'Numbered List',
      description: 'Create a sequential numbered list',
      keywords: ['number', 'ordered', 'list', '123'],
      icon: <ListOrdered size={16} />,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'code',
      title: 'Code Block',
      description: 'Code snippet with syntax highlighting',
      keywords: ['code', 'block', 'snippet', 'pre'],
      icon: <Code size={16} />,
      action: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'quote',
      title: 'Quote',
      description: 'Capture a quote or callout',
      keywords: ['quote', 'blockquote', 'callout'],
      icon: <Quote size={16} />,
      action: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Visual horizontal separator line',
      keywords: ['divider', 'hr', 'line', 'separator'],
      icon: <Minus size={16} />,
      action: () => editor?.chain().focus().setHorizontalRule().run(),
    },
  ], [editor]);

  const filteredCommands = useMemo(() => {
    if (!slashState.query) return commands;
    const q = slashState.query.toLowerCase();
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [commands, slashState.query]);

  const executeSlashCommand = useCallback((cmd: SlashCommand) => {
    if (!editor || !slashState.range) return;
    const { from, to } = slashState.range;
    editor.chain().focus().deleteRange({ from, to }).run();
    cmd.action();
    setSlashState(prev => ({ ...prev, isOpen: false }));
  }, [editor, slashState.range]);

  // Slash commands trigger detector
  useEffect(() => {
    if (!editor) return;

    const handleCursorUpdate = () => {
      const { selection } = editor.state;
      if (!selection.empty) {
        setSlashState(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        return;
      }

      const { $from } = selection;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
      const match = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);

      if (match) {
        const query = match[1];
        const matchLength = match[0].length;
        const startOffset = match[0].startsWith(' ') ? 1 : 0;
        const from = $from.pos - matchLength + startOffset;
        const to = $from.pos;

        const domSel = window.getSelection();
        if (domSel && domSel.rangeCount > 0) {
          const rect = domSel.getRangeAt(0).getBoundingClientRect();
          setSlashState({
            isOpen: true,
            query,
            position: {
              top: rect.bottom + 6 + window.scrollY,
              left: Math.min(window.innerWidth - 300, Math.max(10, rect.left + window.scrollX)),
            },
            range: { from, to },
          });
          setSelectedIndex(0);
          return;
        }
      }

      setSlashState(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };

    editor.on('selectionUpdate', handleCursorUpdate);
    return () => {
      editor.off('selectionUpdate', handleCursorUpdate);
    };
  }, [editor]);

  // Global keyboard shortcuts for OneNote tags and Tab table creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor || !editor.isFocused) return;

      // Handle Slash Command Navigation
      if (slashState.isOpen && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeSlashCommand(filteredCommands[selectedIndex]);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setSlashState(prev => ({ ...prev, isOpen: false }));
          return;
        }
      }

      // Ctrl/Cmd + 1-5 OneNote Tags
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          editor.chain().focus().toggleTaskList().run();
          return;
        } else if (e.key === '2') {
          e.preventDefault();
          editor.chain().focus().insertContent(' ⭐ ').run();
          return;
        } else if (e.key === '3') {
          e.preventDefault();
          editor.chain().focus().insertContent(' ❓ ').run();
          return;
        } else if (e.key === '4') {
          e.preventDefault();
          editor.chain().focus().insertContent(' 💡 ').run();
          return;
        } else if (e.key === '5') {
          e.preventDefault();
          editor.chain().focus().insertContent(' 📌 ').run();
          return;
        }
      }

      // OneNote Smart Tab for Tables
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Case 1: Inside a table
        if (editor.isActive('table')) {
          e.preventDefault();
          if (e.shiftKey) {
            editor.commands.goToPreviousCell();
          } else {
            const canGoNext = editor.can().goToNextCell();
            if (canGoNext) {
              editor.commands.goToNextCell();
            } else {
              // Reached end of table -> auto insert new row!
              editor.chain().focus().addRowAfter().goToNextCell().run();
            }
          }
          return;
        }

        // Case 2: On a paragraph, convert text to a 2x2 table (OneNote signature table shortcut)
        if (editor.isActive('paragraph') && !editor.isActive('listItem') && !editor.isActive('taskList') && !e.shiftKey) {
          const { from, empty } = editor.state.selection;
          if (empty) {
            const currentLine = editor.state.doc.resolve(from).parent.textContent;
            if (currentLine.length < 60) {
              e.preventDefault();
              editor.chain().focus().deleteCurrentNode().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
              if (currentLine.trim()) {
                editor.commands.insertContent(currentLine.trim());
                editor.commands.goToNextCell();
              }
              return;
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, slashState.isOpen, filteredCommands, selectedIndex, executeSlashCommand]);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!activeNoteId) return;

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    for (const file of files) {
      try {
        const att = await uploadAttachment(activeNoteId, file);
        if (att.mimeType.startsWith('image/')) {
          editor?.chain().focus().setImage({ src: `${API_URL}/attachments/${att.id}/download` }).run();
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  return (
    <div 
      className={styles.editorWrapper}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <EditorBubbleMenu editor={editor} />
      {slashState.isOpen && (
        <SlashCommandMenu
          query={slashState.query}
          position={slashState.position}
          selectedIndex={selectedIndex}
          onSelect={executeSlashCommand}
          onClose={() => setSlashState(prev => ({ ...prev, isOpen: false }))}
          commands={commands}
        />
      )}
      <div className={styles.editorContent}>
        <EditorContent editor={editor} />
      </div>
      <AttachmentList />
    </div>
  );
};

