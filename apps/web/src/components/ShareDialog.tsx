import React, { useState, useEffect, useRef } from 'react';
import { shareApi, ShareResponse, ShareUser } from '../api/share';
import { X, Shield, Trash2, Loader2, Mail, ChevronDown, Check, Eye, Edit3, Link as LinkIcon, Copy, Crown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import styles from '../styles/ShareDialog.module.css';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'notebook' | 'note';
  entityId: string;
  entityTitle: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, entityType, entityId, entityTitle }) => {
  const currentUser = useAuthStore(s => s.user);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'READ' | 'EDIT'>('READ');
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [owner, setOwner] = useState<ShareUser | null>(null);
  const [shares, setShares] = useState<ShareResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const permRef = useRef<HTMLDivElement>(null);
  const shareUrl = `${window.location.origin}/dashboard?shared=${entityType}&id=${entityId}`;

  useEffect(() => {
    if (isOpen) {
      loadShares();
      setEmail('');
      setError('');
      setIsPermOpen(false);
      setCopiedLink(false);
    }
  }, [isOpen, entityId]);

  // Click outside to close permission menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (permRef.current && !permRef.current.contains(e.target as Node)) {
        setIsPermOpen(false);
      }
    };
    if (isPermOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPermOpen]);

  const loadShares = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = entityType === 'notebook' 
        ? await shareApi.listNotebookShares(entityId)
        : await shareApi.listNoteShares(entityId);
      
      if (data && 'shares' in data) {
        setOwner(data.owner || null);
        setShares(Array.isArray(data.shares) ? data.shares : []);
      } else if (Array.isArray(data)) {
        setOwner(null);
        setShares(data);
      } else {
        setOwner(null);
        setShares([]);
      }
    } catch {
      setOwner(null);
      setShares([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Share link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Could not copy link to clipboard');
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
      toast.success(`Shared ${entityType} successfully`);
      await loadShares();
    } catch (e: any) {
      const errMessage = e.message || 'Failed to share';
      setError(errMessage);
      toast.error(errMessage);
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
      toast.success('Access revoked');
      await loadShares();
    } catch (e: any) {
      const errMessage = e.message || 'Failed to revoke share';
      setError(errMessage);
      toast.error(errMessage);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Resolve effective owner
  const effectiveOwner: ShareUser | null = owner || (
    currentUser ? {
      id: currentUser.id,
      displayName: currentUser.displayName,
      email: currentUser.email,
    } : null
  );

  // Filter collaborator list to ensure owner isn't duplicated
  const collaboratorShares = shares.filter(s => s.sharedWith.id !== effectiveOwner?.id);
  const totalMembers = (effectiveOwner ? 1 : 0) + collaboratorShares.length;
  const isCurrentUserOwner = effectiveOwner ? effectiveOwner.id === currentUser?.id : true;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitleWrap}>
            <h2 className={styles.title}>Share {entityType === 'notebook' ? 'Notebook' : 'Note'}</h2>
            <span className={styles.subtitle}>"{entityTitle}"</span>
          </div>
          <button onClick={onClose} className={styles.closeButton} title="Close">
            <X size={18} />
          </button>
        </div>
        
        <div className={styles.content}>
          {/* 1. Share via Link Card (Primary OneNote sharing action) */}
          <div className={styles.linkShareCard}>
            <div className={styles.linkHeader}>
              <div className={styles.linkHeaderLeft}>
                <div className={styles.linkIconWrap}>
                  <LinkIcon size={16} />
                </div>
                <div>
                  <div className={styles.linkLabel}>Share via link</div>
                  <div className={styles.linkSub}>Anyone with this link can view this {entityType}</div>
                </div>
              </div>
            </div>

            <div className={styles.linkInputRow}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                className={styles.linkInput}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`${styles.copyBtn} ${copiedLink ? styles.copyBtnSuccess : ''}`}
              >
                {copiedLink ? (
                  <>
                    <Check size={14} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className={styles.orDivider}>
            <span>or invite by email</span>
          </div>

          {/* 2. Direct Email Invite Form */}
          <form onSubmit={handleShare} className={styles.shareForm}>
            <div className={styles.inputGroup}>
              <div className={styles.emailInputWrapper}>
                <Mail size={16} className={styles.mailIcon} />
                <input
                  type="email"
                  placeholder="Enter user email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.emailInput}
                  disabled={isLoading}
                />
              </div>

              {/* Custom Permission Dropdown */}
              <div className={styles.permDropdownWrapper} ref={permRef}>
                <button
                  type="button"
                  className={styles.permTriggerBtn}
                  onClick={() => setIsPermOpen(!isPermOpen)}
                  disabled={isLoading}
                >
                  <span className={styles.permTriggerLabel}>
                    {permission === 'READ' ? 'Can view' : 'Can edit'}
                  </span>
                  <ChevronDown size={14} className={`${styles.permChevron} ${isPermOpen ? styles.chevronRotated : ''}`} />
                </button>

                {isPermOpen && (
                  <div className={styles.permMenu}>
                    <button
                      type="button"
                      className={`${styles.permMenuItem} ${permission === 'READ' ? styles.permMenuItemActive : ''}`}
                      onClick={() => {
                        setPermission('READ');
                        setIsPermOpen(false);
                      }}
                    >
                      <div className={styles.permMenuIconWrap}>
                        <Eye size={15} />
                      </div>
                      <div className={styles.permMenuDetails}>
                        <div className={styles.permMenuText}>Can view</div>
                        <div className={styles.permMenuSub}>Can view without editing</div>
                      </div>
                      {permission === 'READ' && <Check size={15} className={styles.permCheck} />}
                    </button>

                    <button
                      type="button"
                      className={`${styles.permMenuItem} ${permission === 'EDIT' ? styles.permMenuItemActive : ''}`}
                      onClick={() => {
                        setPermission('EDIT');
                        setIsPermOpen(false);
                      }}
                    >
                      <div className={styles.permMenuIconWrap}>
                        <Edit3 size={15} />
                      </div>
                      <div className={styles.permMenuDetails}>
                        <div className={styles.permMenuText}>Can edit</div>
                        <div className={styles.permMenuSub}>Can view and make changes</div>
                      </div>
                      {permission === 'EDIT' && <Check size={15} className={styles.permCheck} />}
                    </button>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? <Loader2 size={16} className={styles.spin} /> : 'Invite'}
              </button>
            </div>
          </form>
          
          {error && <div className={styles.error}>{error}</div>}
          
          {/* 3. People with Access list */}
          <div className={styles.sharesList}>
            <div className={styles.listHeader}>
              <h3 className={styles.listTitle}>People with access</h3>
              <span className={styles.shareCount}>{totalMembers} {totalMembers === 1 ? 'member' : 'members'}</span>
            </div>
            
            <ul className={styles.list}>
              {/* Owner */}
              {effectiveOwner && (
                <li className={styles.listItem}>
                  <div className={styles.userInfo}>
                    <div className={`${styles.avatar} ${styles.ownerAvatar}`}>
                      {effectiveOwner.displayName ? effectiveOwner.displayName.charAt(0).toUpperCase() : 'O'}
                    </div>
                    <div className={styles.userDetails}>
                      <span className={styles.userName}>
                        {effectiveOwner.displayName || effectiveOwner.email} {effectiveOwner.id === currentUser?.id ? '(You)' : ''}
                      </span>
                      <span className={styles.userEmail}>{effectiveOwner.email}</span>
                    </div>
                  </div>
                  <div className={styles.userActions}>
                    <span className={styles.ownerBadge}>
                      <Crown size={12} className={styles.badgeIcon} />
                      Owner
                    </span>
                  </div>
                </li>
              )}

              {/* Collaborators / Shared Users */}
              {collaboratorShares.map((share) => {
                const isCurrent = share.sharedWith.id === currentUser?.id;
                return (
                  <li key={share.id} className={styles.listItem}>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>
                        {share.sharedWith.displayName ? share.sharedWith.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className={styles.userDetails}>
                        <span className={styles.userName}>
                          {share.sharedWith.displayName || share.sharedWith.email} {isCurrent ? '(You)' : ''}
                        </span>
                        <span className={styles.userEmail}>{share.sharedWith.email}</span>
                      </div>
                    </div>
                    <div className={styles.userActions}>
                      <span className={styles.permissionBadge}>
                        <Shield size={12} className={styles.badgeIcon} />
                        {share.permission === 'EDIT' ? 'Can edit' : 'Can view'}
                      </span>
                      {(isCurrentUserOwner || isCurrent) && (
                        <button 
                          onClick={() => handleRevoke(share.sharedWithId)}
                          className={styles.revokeBtn}
                          title={isCurrent ? "Leave share" : "Remove access"}
                          disabled={isLoading}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {collaboratorShares.length === 0 && (
              <p className={styles.emptySharesHint}>
                Only you have access right now. Anyone with the link above or invited by email will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
