import { useState, useEffect, useRef, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface UseAutosaveOptions<T> {
  value: T;
  onSave: (value: T) => Promise<void>;
  delay?: number;
  maxRetries?: number;
  baseBackoff?: number;
}

export function useAutosave<T>({
  value,
  onSave,
  delay = 1500,
  maxRetries = 3,
  baseBackoff = 1000,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const valueRef = useRef(value);
  const lastSavedValueRef = useRef(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isOnlineRef = useRef(navigator.onLine);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const save = useCallback(async (isManual = false) => {
    // Diff check
    if (!isManual && JSON.stringify(valueRef.current) === JSON.stringify(lastSavedValueRef.current)) {
      return;
    }

    if (!isOnlineRef.current) {
      setStatus('offline');
      return;
    }

    // Cancel in-flight save
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const valueToSave = valueRef.current;
    setStatus('saving');
    setError(null);

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        await onSave(valueToSave);
        lastSavedValueRef.current = valueToSave;
        setStatus('saved');
        setTimeout(() => {
          if (valueRef.current === valueToSave) {
            setStatus('idle');
          }
        }, 2000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Cancelled
        
        attempt++;
        if (attempt > maxRetries) {
          setStatus('error');
          setError(err.message || 'Failed to save');
          return;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, baseBackoff * Math.pow(2, attempt - 1)));
      }
    }
  }, [onSave, maxRetries, baseBackoff]);

  // Debounce logic
  useEffect(() => {
    if (JSON.stringify(valueRef.current) === JSON.stringify(lastSavedValueRef.current)) {
      return;
    }

    setStatus('saving'); // Indicate that a change is pending

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay, save]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      if (JSON.stringify(valueRef.current) !== JSON.stringify(lastSavedValueRef.current)) {
        save();
      } else {
        setStatus('idle');
      }
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [save]);

  // Flush on unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(valueRef.current) !== JSON.stringify(lastSavedValueRef.current)) {
        save(true);
        // Show unsaved changes warning
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [save]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (JSON.stringify(valueRef.current) !== JSON.stringify(lastSavedValueRef.current)) {
        save(true);
      }
    };
  }, [save]);

  // Keyboard shortcut (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  return { status, error, flush: () => save(true) };
}
