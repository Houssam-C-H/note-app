import { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, Clock, FileText, X } from 'lucide-react';
import { useSearchStore } from '../store/searchStore';
import { useNotebookStore } from '../store/notebookStore';
import { useNoteStore } from '../store/noteStore';
import styles from './SearchBar.module.css';

export const SearchBar = () => {
  const { 
    query, setQuery, isOpen, setIsOpen, executeSearch, 
    results, isLoading, recentSearches, addRecentSearch 
  } = useSearchStore();
  
  const { setActiveNotebook, setActiveSection } = useNotebookStore();
  const { setActiveNote } = useNoteStore();

  const [localQuery, setLocalQuery] = useState(query);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    if (localQuery.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        setQuery(localQuery);
        executeSearch(localQuery);
      }, 300);
    } else {
      setQuery('');
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [localQuery, setQuery, executeSearch]);

  const handleResultClick = (result: any) => {
    addRecentSearch(localQuery);
    setIsOpen(false);
    
    // Navigate to the note
    setActiveNotebook(result.notebookId);
    setActiveSection(result.sectionId);
    setActiveNote(result.id);
  };

  const handleRecentClick = (recentQuery: string) => {
    setLocalQuery(recentQuery);
    setIsOpen(true);
  };

  const handleClear = () => {
    setLocalQuery('');
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && localQuery.trim()) {
      addRecentSearch(localQuery);
      const trimmed = localQuery.trim();
      let targetId = '';
      if (trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('/dashboard')) {
        try {
          const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `http://dummy.com${trimmed}`);
          targetId = urlObj.searchParams.get('id') || urlObj.searchParams.get('noteId') || '';
        } catch {}
      }
      if (!targetId) {
        const uuidMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
        if (uuidMatch) targetId = uuidMatch[0];
      }
      if (targetId) {
        setIsOpen(false);
        window.location.href = `/dashboard?shared=note&id=${targetId}`;
        return;
      }
    }
  };

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <div className={styles.searchInputWrapper}>
        <SearchIcon size={15} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search Notes (Ctrl+E)"
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {localQuery && (
          <button 
            type="button" 
            className={styles.clearBtn} 
            onClick={handleClear}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {!localQuery.trim() ? (
            // Show recent searches
            recentSearches.length > 0 ? (
              <>
                <div className={styles.sectionHeader}>Recent Searches</div>
                {recentSearches.map((sq, i) => (
                  <div key={i} className={styles.recentItem} onClick={() => handleRecentClick(sq)}>
                    <Clock size={14} className={styles.recentIcon} />
                    <span>{sq}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.emptyState}>Type to search notes...</div>
            )
          ) : isLoading ? (
            <div className={styles.loadingState}>Searching...</div>
          ) : results.length > 0 ? (
            <>
              <div className={styles.sectionHeader}>Matching Notes</div>
              {results.map((result) => (
                <div key={result.id} className={styles.resultItem} onClick={() => handleResultClick(result)}>
                  <div className={styles.resultIconWrapper}>
                    <FileText size={16} />
                  </div>
                  <div className={styles.resultContent}>
                    <div className={styles.resultTitle}>
                      {result.title || 'Untitled'}
                    </div>
                    {result.preview && (
                      <div 
                        className={styles.resultPreview} 
                        dangerouslySetInnerHTML={{ __html: result.preview }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className={styles.emptyState}>No notes found for "{localQuery}"</div>
          )}
        </div>
      )}
    </div>
  );
};
