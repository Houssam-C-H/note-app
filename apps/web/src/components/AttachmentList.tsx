import { useEffect } from 'react';
import { File, Download, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAttachmentStore } from '../store/attachmentStore';
import { useNoteStore } from '../store/noteStore';
import styles from './AttachmentList.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const formatBytes = (bytes: string) => {
  const b = parseInt(bytes, 10);
  if (b === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const AttachmentList = () => {
  const { attachments, fetchAttachments, deleteAttachment } = useAttachmentStore();
  const { activeNoteId } = useNoteStore();

  useEffect(() => {
    if (activeNoteId) {
      fetchAttachments(activeNoteId);
    }
  }, [activeNoteId, fetchAttachments]);

  if (!activeNoteId) return null;

  const noteAttachments = attachments[activeNoteId] || [];

  if (noteAttachments.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>Attachments</div>
      <div className={styles.list}>
        {noteAttachments.map(att => (
          <div key={att.id} className={styles.attachmentItem}>
            <div className={styles.fileInfo}>
              {att.mimeType.startsWith('image/') ? (
                <ImageIcon size={16} className={styles.icon} />
              ) : (
                <File size={16} className={styles.icon} />
              )}
              <span className={styles.filename} title={att.originalName}>
                {att.originalName}
              </span>
              <span className={styles.size}>
                ({formatBytes(att.fileSize)})
              </span>
            </div>
            
            <div className={styles.actions}>
              <a 
                href={`${API_URL}/attachments/${att.id}/download`} 
                target="_blank" 
                rel="noreferrer"
                className={styles.actionBtn}
                title="Download"
              >
                <Download size={14} />
              </a>
              <button 
                className={styles.actionBtn} 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this attachment?')) {
                    deleteAttachment(activeNoteId, att.id);
                  }
                }}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
