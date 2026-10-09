import React, { useEffect, useState } from 'react';
import { shareApi, ShareResponse } from '../api/share';
import { Book, FileText, Loader2 } from 'lucide-react';
import styles from '../styles/SharedWithMe.module.css';

export const SharedWithMe: React.FC = () => {
  const [sharedNotebooks, setSharedNotebooks] = useState<any[]>([]);
  const [sharedNotes, setSharedNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSharedItems();
  }, []);

  const loadSharedItems = async () => {
    try {
      setIsLoading(true);
      const data = await shareApi.getSharedWithMe();
      setSharedNotebooks(data.notebooks);
      setSharedNotes(data.notes);
    } catch (e: any) {
      setError('Failed to load shared items');
    } finally {
      setIsLoading(false);
    }
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
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Shared Notebooks</h3>
        {sharedNotebooks.length === 0 ? (
          <p className={styles.empty}>No notebooks shared with you.</p>
        ) : (
          <div className={styles.grid}>
            {sharedNotebooks.map((share) => (
              <div key={share.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <Book size={20} className={styles.icon} style={{color: share.notebook.color}} />
                  <span className={styles.cardTitle}>{share.notebook.title}</span>
                </div>
                <div className={styles.cardBody}>
                  <p>Shared by: {share.owner.displayName}</p>
                  <p>Permission: <strong>{share.permission}</strong></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Shared Notes</h3>
        {sharedNotes.length === 0 ? (
          <p className={styles.empty}>No individual notes shared with you.</p>
        ) : (
          <div className={styles.grid}>
            {sharedNotes.map((share) => (
              <div key={share.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <FileText size={20} className={styles.icon} />
                  <span className={styles.cardTitle}>{share.note.title || 'Untitled'}</span>
                </div>
                <div className={styles.cardBody}>
                  <p>Shared by: {share.owner.displayName}</p>
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
