import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotebookStore } from '../store/notebookStore';
import { useNoteStore } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import { authApi } from '../api/auth';
import { NotebookSidebar } from '../components/NotebookSidebar';
import { SectionList } from '../components/SectionList';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { SearchBar } from '../components/SearchBar';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

export const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { fetchNotebooks, activeNotebookId, activeSectionId } = useNotebookStore();
  const { activeNoteId } = useNoteStore();
  const { isSidebarOpen, toggleSidebar } = useUiStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

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

  return (
    <div className={styles.dashboardContainer}>
      {isSidebarOpen && (
        <>
          <NotebookSidebar />
          <SectionList />
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
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </header>

        <div className={styles.contentArea}>
          {!activeNotebookId ? (
            <div className={styles.emptyState}>Select a notebook to get started</div>
          ) : !activeSectionId ? (
            <div className={styles.emptyState}>Select a section to view notes</div>
          ) : (
            <div className={styles.notesLayout}>
              <NoteList />
              <NoteEditor key={activeNoteId || 'empty'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

