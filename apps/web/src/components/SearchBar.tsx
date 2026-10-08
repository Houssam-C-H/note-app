import { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, Clock, FileText } from 'lucide-react';
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
    addRecentSearch(query);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && localQuery.trim()) {
      addRecentSearch(localQuery);
    }
  };

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <div className={styles.searchInputWrapper}>
        <SearchIcon size={18} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search notes..."
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {!localQuery.trim() ? (
            // Show recent searches
            recentSearches.length > 0 ? (
              <>
                <div className={styles.sectionTitle}>Recent Searches</div>
                {recentSearches.map((sq, i) => (
                  <div key={i} className={styles.recentSearchItem} onClick={() => handleRecentClick(sq)}>
                    <Clock size={14} />
                    <span>{sq}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.emptyState}>Type to start searching</div>
            )
          ) : isLoading ? (
            <div className={styles.loadingState}>Searching...</div>
          ) : results.length > 0 ? (
            <>
              <div className={styles.sectionTitle}>Notes</div>
              {results.map((result) => (
                <div key={result.id} className={styles.resultItem} onClick={() => handleResultClick(result)}>
                  <div className={styles.resultTitle}>
                    <FileText size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    {result.title || 'Untitled'}
                  </div>
                  {result.preview && (
                    <div 
                      className={styles.resultPreview} 
                      dangerouslySetInnerHTML={{ __html: result.preview }}
                    />
                  )}
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
