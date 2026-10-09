import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotebookStore } from '../store/notebookStore';
import { useNoteStore } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import { useOfflineSyncStore } from '../store/offlineSyncStore';
import { authApi } from '../api/auth';
import { NotebookSidebar } from '../components/NotebookSidebar';
import { SectionList } from '../components/SectionList';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { SearchBar } from '../components/SearchBar';
import { SharedWithMe } from '../components/SharedWithMe';
import { Trash } from '../components/Trash';
import { PanelLeftClose, PanelLeftOpen, CloudOff, CloudSync, Cloud } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

export const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { fetchNotebooks, activeNotebookId, activeSectionId } = useNotebookStore();
  const { activeNoteId } = useNoteStore();
  const { isSidebarOpen, currentView, toggleSidebar } = useUiStore();
  const { isOnline, isSyncing, pendingSyncs, updatePendingCount } = useOfflineSyncStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotebooks();
    updatePendingCount();
  }, [fetchNotebooks, updatePendingCount]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const renderContentArea = () => {
    if (currentView === 'shared') {
      return <SharedWithMe />;
    }
    if (currentView === 'trash') {
      return <Trash />;
    }

    // Default 'notebooks' view
    if (!activeNotebookId) {
      return <div className={styles.emptyState}>Select a notebook to get started</div>;
    }
    if (!activeSectionId) {
      return <div className={styles.emptyState}>Select a section to view notes</div>;
    }
    return (
      <div className={styles.notesLayout}>
        <NoteList />
        <NoteEditor key={activeNoteId || 'empty'} />
      </div>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      {isSidebarOpen && (
        <>
          <NotebookSidebar />
          {currentView === 'notebooks' && <SectionList />}
        </>
      )}
      
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.userInfo}>
            <button 
              onClick={toggleSidebar} 
              className={styles.toggleSidebarBtn}
              title={isSidebarOpen ? "Close sidebars" : "Open sidebars"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <span className={styles.welcomeText}>Welcome, {user?.displayName}</span>
          </div>
          
          <SearchBar />
          
          <div className={styles.headerActions}>
            <div className={styles.syncStatus} title={!isOnline ? 'Offline' : pendingSyncs > 0 ? `${pendingSyncs} items to sync` : 'Synced'}>
              {!isOnline ? (
                <CloudOff size={20} className={styles.iconOffline} />
              ) : isSyncing ? (
                <CloudSync size={20} className={styles.iconSyncing} />
              ) : pendingSyncs > 0 ? (
                <Cloud size={20} className={styles.iconPending} />
              ) : (
                <Cloud size={20} className={styles.iconSynced} />
              )}
              {pendingSyncs > 0 && <span className={styles.syncBadge}>{pendingSyncs}</span>}
            </div>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        </header>

        <div className={styles.contentArea}>
          {renderContentArea()}
        </div>
      </div>
    </div>
  );
};

