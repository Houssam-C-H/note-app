import { create } from 'zustand';
import { searchApi, SearchFilters, SearchResult } from '../api/search';

interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  totalResults: number;
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;
  recentSearches: string[];
  
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  setIsOpen: (isOpen: boolean) => void;
  executeSearch: (query?: string, filters?: SearchFilters) => Promise<void>;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => {
  // Load recent searches from localStorage
  const savedRecent = localStorage.getItem('notespace_recent_searches');
  const initialRecent = savedRecent ? JSON.parse(savedRecent) : [];

  return {
    query: '',
    filters: {},
    results: [],
    totalResults: 0,
    isLoading: false,
    isOpen: false,
    error: null,
    recentSearches: initialRecent,

    setQuery: (query) => set({ query }),
    
    setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
    
    setIsOpen: (isOpen) => set({ isOpen, error: null }),
    
    executeSearch: async (q?: string, f?: SearchFilters) => {
      const query = q ?? get().query;
      const filters = f ?? get().filters;

      if (!query.trim()) {
        set({ results: [], totalResults: 0 });
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const response = await searchApi.searchNotes(query, filters);
        set({ results: response.data, totalResults: response.pagination.total, isLoading: false });
      } catch (error: any) {
        set({ error: error.message || 'Failed to search', isLoading: false });
      }
    },

    addRecentSearch: (query) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      
      set((state) => {
        const recent = [trimmed, ...state.recentSearches.filter(q => q !== trimmed)].slice(0, 5);
        localStorage.setItem('notespace_recent_searches', JSON.stringify(recent));
        return { recentSearches: recent };
      });
    },

    clearRecentSearches: () => {
      localStorage.removeItem('notespace_recent_searches');
      set({ recentSearches: [] });
    }
  };
});
