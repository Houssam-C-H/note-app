import React, { useState, useEffect, useRef } from 'react';
import { Link as LinkIcon, X, Trash2 } from 'lucide-react';
import styles from './LinkModal.module.css';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  initialText?: string;
  isEditingExistingLink?: boolean;
  onApply: (url: string, text: string) => void;
  onRemove?: () => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  onClose,
  initialUrl = '',
  initialText = '',
  isEditingExistingLink = false,
  onApply,
  onRemove,
}) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || 'https://');
      setText(initialText || '');
      setTimeout(() => {
        if (urlInputRef.current) {
          urlInputRef.current.focus();
          urlInputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialUrl, initialText]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl || cleanUrl === 'https://' || cleanUrl === 'http://') {
      if (onRemove && isEditingExistingLink) {
        onRemove();
      }
      onClose();
      return;
    }
    onApply(cleanUrl, text.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} onKeyDown={handleKeyDown}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <LinkIcon size={16} className={styles.titleIcon} />
            <h3 className={styles.title}>
              {isEditingExistingLink ? 'Edit Link' : 'Insert Link'}
            </h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn} title="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Text to display</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Documentation, Project Website"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Address (URL)</label>
            <input
              ref={urlInputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.actions}>
            {isEditingExistingLink && onRemove && (
              <div className={styles.leftAction}>
                <button
                  type="button"
                  onClick={() => {
                    onRemove();
                    onClose();
                  }}
                  className={styles.removeBtn}
                  title="Remove link formatting"
                >
                  <Trash2 size={13} />
                  <span>Remove Link</span>
                </button>
              </div>
            )}
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              {isEditingExistingLink ? 'Save' : 'Insert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
