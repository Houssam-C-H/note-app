import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotebookStore } from '../store/notebookStore';
import { useNoteStore } from '../store/noteStore';
import { useUiStore, RibbonTab } from '../store/uiStore';
import { useOfflineSyncStore } from '../store/offlineSyncStore';
import { authApi } from '../api/auth';
import { noteApi } from '../api/note';
import { db } from '../lib/db';
import toast from 'react-hot-toast';
import { NotebookSidebar } from '../components/NotebookSidebar';
import { NoteEditor } from '../components/NoteEditor';
import { RibbonToolbar } from '../components/RibbonToolbar';
import { SearchBar } from '../components/SearchBar';
import { SharedWithMe } from '../components/SharedWithMe';
import { Trash } from '../components/Trash';
import { ThemeToggle } from '../components/ThemeToggle';
import { StickyNotes } from '../components/StickyNotes';
import { ShareDialog } from '../components/ShareDialog';
import { 
  PanelLeftClose, PanelLeftOpen, CloudOff, CloudSync, Cloud, 
  Share2, StickyNote
} from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

const RIBBON_TABS: RibbonTab[] = ['File', 'Home', 'Insert', 'Draw', 'History', 'Review', 'View', 'Help'];

export const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { 
    notebooks, fetchNotebooks, activeNotebookId, 
    setActiveNotebook, setActiveSection 
  } = useNotebookStore();
  const { activeNoteId, notes, setActiveNote } = useNoteStore();
  const { 
    isSidebarOpen, currentView, activeRibbonTab, 
    toggleSidebar, setRibbonTab, isStickyNotesOpen, toggleStickyNotes,
    setView 
  } = useUiStore();
  const { isOnline, isSyncing, pendingSyncs, updatePendingCount } = useOfflineSyncStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isShareOpen, setIsShareOpen] = useState(false);

  // Handle URL parameters (e.g. ?shared=note&id=UUID or ?view=trash)
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'trash' || viewParam === 'shared') {
      setView(viewParam);
      return;
    }

    const noteIdParam = searchParams.get('id') || searchParams.get('noteId');
    if (noteIdParam) {
      setView('notebooks');
      
      const activate = (n: any) => {
        useNoteStore.setState(state => ({
          notes: [n, ...state.notes.filter(item => item.id !== n.id)],
          activeNoteId: n.id
        }));
        if (n.section?.notebookId) {
          useNotebookStore.getState().setActiveNotebook(n.section.notebookId);
        }
        if (n.sectionId) {
          useNotebookStore.getState().setActiveSection(n.sectionId);
        }
      };

      (async () => {
        let found = false;

        // 1. Check in-memory store
        const inMemory = useNoteStore.getState().notes.find(n => n.id === noteIdParam);
        if (inMemory) {
          activate(inMemory);
          found = true;
        }

        // 2. Check local Dexie DB
        try {
          const cached = await db.notes.get(noteIdParam);
          if (cached) {
            activate(cached);
            found = true;
          }
        } catch (e) {
          console.warn('Error reading local note', e);
        }

        // 3. Fetch from Remote API
        try {
          const remote = await noteApi.getNoteById(noteIdParam);
          if (remote) {
            activate(remote);
            try {
              await db.notes.put({ ...remote });
            } catch {
              // Ignore cache write error
            }
            if (!found) {
              toast.success(`Opened "${remote.title || 'Shared Page'}"`);
            }
            found = true;
          }
        } catch (e) {
          if (!found) {
            console.error('Failed to load shared note from URL', e);
            toast.error('Unable to open shared note');
          }
        }
      })();
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNotebooks();
    updatePendingCount();
  }, [fetchNotebooks, updatePendingCount]);

  // Auto-select first notebook and section if none are selected and no shared note is open
  useEffect(() => {
    const noteIdParam = searchParams.get('id') || searchParams.get('noteId');
    if (notebooks.length > 0 && !activeNotebookId && !noteIdParam) {
      const firstNb = notebooks[0];
      setActiveNotebook(firstNb.id);
      if (firstNb.sections && firstNb.sections.length > 0) {
        setActiveSection(firstNb.sections[0].id);
      }
    }
  }, [notebooks, activeNotebookId, setActiveNotebook, setActiveSection, searchParams]);

  // Auto-select first note if notes exist, none is active, and no note param in URL
  useEffect(() => {
    const noteIdParam = searchParams.get('id') || searchParams.get('noteId');
    if (notes.length > 0 && !activeNoteId && !noteIdParam) {
      const availableNotes = notes.filter(n => !n.isArchived);
      if (availableNotes.length > 0) {
        setActiveNote(availableNotes[0].id);
      }
    }
  }, [notes, activeNoteId, setActiveNote, searchParams]);

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

  const activeNote = notes.find(n => n.id === activeNoteId);

  const renderContentArea = () => {
    if (currentView === 'shared') return <SharedWithMe />;
    if (currentView === 'trash') return <Trash />;

    return <NoteEditor key={activeNoteId || 'empty'} />;
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Zone 1: Microsoft OneNote App Ribbon Header */}
      <header className={styles.appRibbon}>
        <div className={styles.ribbonTabsRow}>
          {/* Left: Sidebar toggle + App Icon + Menus */}
          <div className={styles.ribbonLeft}>
            <button 
              onClick={toggleSidebar} 
              className={styles.toggleSidebarBtn}
              title={isSidebarOpen ? "Collapse Sidebars" : "Show Sidebars"}
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <div className={styles.logoBadge}>
              <span className={styles.logoN}>N</span>
              <span className={styles.logoText}>OneNote</span>
            </div>
            
            <nav className={styles.menus}>
              {RIBBON_TABS.map((tab) => (
                <span 
                  key={tab}
                  className={activeRibbonTab === tab ? styles.menuItemActive : styles.menuItem}
                  onClick={() => setRibbonTab(tab)}
                >
                  {tab}
                </span>
              ))}
            </nav>
          </div>

          {/* Right: Search + Sticky Notes + Share + User */}
          <div className={styles.ribbonRight}>
            <div className={styles.searchContainer}>
              <SearchBar />
            </div>

            <button 
              className={`${styles.stickyNotesBtn} ${isStickyNotesOpen ? styles.activeStickyBtn : ''}`} 
              onClick={toggleStickyNotes}
              title="Open Sticky Notes"
            >
              <StickyNote size={15} />
              <span>Sticky Notes</span>
            </button>

            <button 
              className={styles.purpleShareBtn} 
              onClick={() => setIsShareOpen(true)}
              title="Share Notebook or Page"
            >
              <Share2 size={15} />
              <span>Share</span>
            </button>

            <div className={styles.syncStatus} title={!isOnline ? 'Offline' : pendingSyncs > 0 ? `${pendingSyncs} items to sync` : 'Synced'}>
              {!isOnline ? (
                <CloudOff size={16} className={styles.iconOffline} />
              ) : isSyncing ? (
                <CloudSync size={16} className={styles.iconSyncing} />
              ) : pendingSyncs > 0 ? (
                <Cloud size={16} className={styles.iconPending} />
              ) : (
                <Cloud size={16} className={styles.iconSynced} />
              )}
            </div>
            
            <ThemeToggle />
            
            <div className={styles.userInfo}>
              <span className={styles.userAvatar} title={user?.displayName || 'User'}>
                {(user?.displayName || 'A')[0].toUpperCase()}
              </span>
              <button onClick={handleLogout} className={styles.logoutButton} title="Logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tier 2 OneNote Ribbon Toolbar: Always visible in notebooks view */}
      {currentView === 'notebooks' && (
        <div className={styles.tier2Toolbar}>
          <RibbonToolbar />
        </div>
      )}

      {/* Workspace */}
      <div className={styles.workspace}>
        {isSidebarOpen && (
          <NotebookSidebar />
        )}
        
        <div className={styles.contentArea}>
          {renderContentArea()}
        </div>
      </div>

      {/* Floating OneNote Sticky Notes modal */}
      {isStickyNotesOpen && (
        <StickyNotes onClose={toggleStickyNotes} />
      )}

      {/* Share Dialog */}
      {isShareOpen && (
        <ShareDialog
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          entityType={activeNote ? 'note' : 'notebook'}
          entityId={activeNote?.id || activeNotebookId || ''}
          entityTitle={activeNote?.title || 'Notebook'}
        />
      )}
    </div>
  );
};
