import React, { useState, useEffect } from 'react';
import { shareApi, ShareResponse } from '../api/share';
import { X, UserPlus, Shield, Trash2, Loader2 } from 'lucide-react';
import styles from '../styles/ShareDialog.module.css';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'notebook' | 'note';
  entityId: string;
  entityTitle: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, entityType, entityId, entityTitle }) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'READ' | 'EDIT'>('READ');
  const [shares, setShares] = useState<ShareResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadShares();
      setEmail('');
      setError('');
    }
  }, [isOpen, entityId]);

  const loadShares = async () => {
    try {
      setIsLoading(true);
      const data = entityType === 'notebook' 
        ? await shareApi.listNotebookShares(entityId)
        : await shareApi.listNoteShares(entityId);
      setShares(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load shares');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    try {
      setIsLoading(true);
      setError('');
      if (entityType === 'notebook') {
        await shareApi.shareNotebook(entityId, email, permission);
      } else {
        await shareApi.shareNote(entityId, email, permission);
      }
      setEmail('');
      await loadShares();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to share');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (sharedWithId: string) => {
    try {
      setIsLoading(true);
      if (entityType === 'notebook') {
        await shareApi.revokeNotebookShare(entityId, sharedWithId);
      } else {
        await shareApi.revokeNoteShare(entityId, sharedWithId);
      }
      await loadShares();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to revoke share');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>Share {entityType === 'notebook' ? 'Notebook' : 'Note'}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.subtitle}>Sharing "{entityTitle}"</p>
          
          <form onSubmit={handleShare} className={styles.shareForm}>
            <div className={styles.inputGroup}>
              <input
                type="email"
                placeholder="User email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.emailInput}
                disabled={isLoading}
              />
              <select 
                value={permission} 
                onChange={(e) => setPermission(e.target.value as 'READ' | 'EDIT')}
                className={styles.permissionSelect}
                disabled={isLoading}
              >
                <option value="READ">Can view</option>
                <option value="EDIT">Can edit</option>
              </select>
              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={isLoading || !email}
              >
                {isLoading ? <Loader2 size={16} className={styles.spin} /> : 'Invite'}
              </button>
            </div>
          </form>
          
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.sharesList}>
            <h3 className={styles.listTitle}>People with access</h3>
            
            {shares.length === 0 ? (
              <p className={styles.emptyShares}>Only you have access right now.</p>
            ) : (
              <ul className={styles.list}>
                {shares.map((share) => (
                  <li key={share.id} className={styles.listItem}>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>
                        {share.sharedWith.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.userDetails}>
                        <span className={styles.userName}>{share.sharedWith.displayName}</span>
                        <span className={styles.userEmail}>{share.sharedWith.email}</span>
                      </div>
                    </div>
                    <div className={styles.userActions}>
                      <span className={styles.permissionBadge}>
                        <Shield size={12} className={styles.badgeIcon} />
                        {share.permission === 'EDIT' ? 'Editor' : 'Viewer'}
                      </span>
                      <button 
                        onClick={() => handleRevoke(share.sharedWithId)}
                        className={styles.revokeBtn}
                        title="Remove access"
                        disabled={isLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
