import { useEditor, EditorContent, Editor } from '@tiptap/react';
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
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, CheckSquare, Link as LinkIcon, Code, Terminal,
  AlignLeft, AlignCenter, AlignRight, Table as TableIcon, Palette, Paperclip
} from 'lucide-react';
import styles from './RichTextEditor.module.css';
import { useEffect, useRef } from 'react';
import { AttachmentList } from './AttachmentList';
import { useAttachmentStore } from '../store/attachmentStore';
import { useNoteStore } from '../store/noteStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface MenuBarProps {
  editor: Editor | null;
}

const MenuBar = ({ editor }: MenuBarProps) => {
  const { activeNoteId } = useNoteStore();
  const { uploadAttachment } = useAttachmentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) {
    return null;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNoteId) return;

    try {
      const att = await uploadAttachment(activeNoteId, file);
      
      // If it's an image, insert it into the editor
      if (att.mimeType.startsWith('image/')) {
        editor.chain().focus().setImage({ src: `${API_URL}/attachments/${att.id}/download` }).run();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={styles.toolbar}>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? styles.isActive : ''}
        title="Bold"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? styles.isActive : ''}
        title="Italic"
      >
        <Italic size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? styles.isActive : ''}
        title="Strikethrough"
      >
        <Strikethrough size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={editor.isActive('code') ? styles.isActive : ''}
        title="Inline Code"
      >
        <Code size={18} />
      </button>
      <button
        onClick={setLink}
        className={editor.isActive('link') ? styles.isActive : ''}
        title="Link"
      >
        <LinkIcon size={18} />
      </button>

      <div className={styles.divider} />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? styles.isActive : ''}
        title="Heading 1"
      >
        <Heading1 size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? styles.isActive : ''}
        title="Heading 2"
      >
        <Heading2 size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? styles.isActive : ''}
        title="Heading 3"
      >
        <Heading3 size={18} />
      </button>

      <div className={styles.divider} />

      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? styles.isActive : ''}
        title="Align Left"
      >
        <AlignLeft size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? styles.isActive : ''}
        title="Align Center"
      >
        <AlignCenter size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? styles.isActive : ''}
        title="Align Right"
      >
        <AlignRight size={18} />
      </button>

      <div className={styles.divider} />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? styles.isActive : ''}
        title="Bullet List"
      >
        <List size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? styles.isActive : ''}
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={editor.isActive('taskList') ? styles.isActive : ''}
        title="Task List"
      >
        <CheckSquare size={18} />
      </button>
      
      <div className={styles.divider} />
      
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? styles.isActive : ''}
        title="Blockquote"
      >
        <Quote size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? styles.isActive : ''}
        title="Code Block"
      >
        <Terminal size={18} />
      </button>

      <div className={styles.divider} />

      <button
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert Table"
      >
        <TableIcon size={18} />
      </button>
      <input
        type="color"
        onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
        value={editor.getAttributes('textStyle').color || '#000000'}
        data-testid="setColor"
        title="Text Color"
        style={{ width: '28px', height: '28px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
      />
      <div className={styles.divider} />
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Upload File or Image"
      >
        <Paperclip size={18} />
      </button>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        style={{ display: 'none' }} 
      />
    </div>
  );
};

interface RichTextEditorProps {
  content: any;
  onChange: (content: any, plaintext: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getText());
    },
  });

  // Effect to update editor content when selecting a different note
  useEffect(() => {
    if (editor && content) {
      // we only want to set content if the editor's current content is different to prevent cursor jumps
      const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(content);
      if (!isSame) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    } else if (editor && !content) {
      editor.commands.setContent('', { emitUpdate: false });
    }
  }, [content, editor]);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!activeNoteId) return;

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    for (const file of files) {
      try {
        const att = await uploadAttachment(activeNoteId, file);
        if (att.mimeType.startsWith('image/')) {
          editor.chain().focus().setImage({ src: `${API_URL}/attachments/${att.id}/download` }).run();
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
      <MenuBar editor={editor} />
      <div className={styles.editorContent}>
        <EditorContent editor={editor} />
      </div>
      <AttachmentList />
    </div>
  );
};
