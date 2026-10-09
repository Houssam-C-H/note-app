import React, { useEffect, useState } from 'react';
import { shareApi } from '../api/share';
import { useUiStore } from '../store/uiStore';
import { useNotebookStore } from '../store/notebookStore';
import { useNavigate } from 'react-router-dom';
import { Book, FileText, Loader2, Link2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../styles/SharedWithMe.module.css';

export const SharedWithMe: React.FC = () => {
  const [sharedNotebooks, setSharedNotebooks] = useState<any[]>([]);
  const [sharedNotes, setSharedNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkInput, setLinkInput] = useState('');

  const { setView } = useUiStore();
  const { setActiveNotebook } = useNotebookStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadSharedItems();
  }, []);

  const loadSharedItems = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await shareApi.getSharedWithMe();
      setSharedNotebooks(data.notebooks || []);
      setSharedNotes(data.notes || []);
    } catch {
      setError('Failed to load shared items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLink = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkInput.trim();
    if (!trimmed) return;

    let targetId = '';
    // 1. Try URL parameter extraction ?id=... or ?noteId=...
    try {
      if (trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('/dashboard')) {
        const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `http://dummy.com${trimmed}`);
        targetId = urlObj.searchParams.get('id') || urlObj.searchParams.get('noteId') || '';
      }
    } catch {
      // not a full url
    }

    // 2. If no param extracted, check if it's a UUID directly
    if (!targetId) {
      const uuidMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (uuidMatch) {
        targetId = uuidMatch[0];
      }
    }

    if (!targetId) {
      toast.error('Invalid shared link or ID');
      return;
    }

    setLinkInput('');
    navigate(`/dashboard?shared=note&id=${targetId}`);
  };

  const handleOpenNote = (noteId: string) => {
    navigate(`/dashboard?shared=note&id=${noteId}`);
  };

  const handleOpenNotebook = (notebookId: string) => {
    setActiveNotebook(notebookId);
    setView('notebooks');
  };

  if (isLoading) {
    return <div className={styles.loading}><Loader2 size={24} className={styles.spin} /> Loading shared items...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Shared with me</h2>

      {/* Open link input card */}
      <div className={styles.openLinkCard}>
        <div className={styles.openLinkTitle}>
          <Link2 size={16} />
          <span>Open a Shared Link</span>
        </div>
        <form onSubmit={handleOpenLink} className={styles.openLinkForm}>
          <input
            type="text"
            className={styles.openLinkInput}
            placeholder="Paste share link (e.g. http://localhost:5173/dashboard?shared=note&id=...) or Note ID"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
          />
          <button type="submit" className={styles.openLinkBtn}>
            <span>Open</span>
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Shared Folders &amp; Notebooks</h3>
        {sharedNotebooks.length === 0 ? (
          <p className={styles.empty}>No notebooks shared with you.</p>
        ) : (
          <div className={styles.grid}>
            {sharedNotebooks.map((share) => (
              <div 
                key={share.id} 
                className={styles.card}
                onClick={() => handleOpenNotebook(share.notebook.id)}
                title="Click to open notebook"
              >
                <div className={styles.cardHeader}>
                  <Book size={20} className={styles.icon} style={{color: share.notebook.color}} />
                  <span className={styles.cardTitle}>{share.notebook.title}</span>
                </div>
                <div className={styles.cardBody}>
                  <p>Shared by: {share.owner?.displayName || 'User'}</p>
                  <p>Permission: <strong>{share.permission}</strong></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Shared Pages &amp; Notes</h3>
        {sharedNotes.length === 0 ? (
          <p className={styles.empty}>No individual notes shared with you.</p>
        ) : (
          <div className={styles.grid}>
            {sharedNotes.map((share) => (
              <div 
                key={share.id} 
                className={styles.card}
                onClick={() => handleOpenNote(share.note.id)}
                title="Click to open note"
              >
                <div className={styles.cardHeader}>
                  <FileText size={20} className={styles.icon} />
                  <span className={styles.cardTitle}>{share.note.title || 'Untitled'}</span>
                </div>
                <div className={styles.cardBody}>
                  <p>Shared by: {share.owner?.displayName || 'User'}</p>
                  <p>Permission: <strong>{share.permission}</strong></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
