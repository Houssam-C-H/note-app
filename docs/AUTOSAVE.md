# Autosave System — NoteSpace

---

## 1. Design Goals

- **Seamless**: User never thinks about saving.
- **Efficient**: Minimize API calls without risking data loss.
- **Resilient**: Handle network failures, tab closure, and conflicts.
- **Transparent**: User always knows the save state.

---

## 2. Autosave Architecture

```
User types in editor
        │
        ▼
┌──────────────────┐
│  Editor onChange  │  ← Every keystroke
│  (TipTap event)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Debounce Timer  │  ← Reset on each change
│  (1500ms)        │  ← Save triggers after 1.5s of inactivity
└────────┬─────────┘
         │
         ├── Timer fires (user paused typing)
         │
         ▼
┌──────────────────┐
│  Diff Check      │  ← Compare current content with last saved content
│  (JSON deep eq)  │  ← Skip save if nothing changed
└────────┬─────────┘
         │
         ├── Content changed → proceed
         │
         ▼
┌──────────────────┐
│  API Call        │  ← PATCH /api/notes/:id
│  (Axios)         │  ← Send only changed fields
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
  Success   Failure
    │         │
    ▼         ▼
┌────────┐ ┌────────────────┐
│ Update │ │ Retry Queue    │
│ "Saved"│ │ (exponential   │
│ status │ │  backoff)      │
└────────┘ │ 3 attempts     │
           │ then show error│
           └────────────────┘
```

---

## 3. Implementation

### Frontend Hook: `useAutosave`

```typescript
// Simplified implementation
function useAutosave(noteId: string, editor: Editor) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const lastSavedContent = useRef<object | null>(null);
  const retryCount = useRef(0);
  
  const saveNote = useCallback(async () => {
    const currentContent = editor.getJSON();
    const currentTitle = /* get title */;
    
    // Skip if nothing changed
    if (deepEqual(currentContent, lastSavedContent.current)) {
      return;
    }
    
    setSaveStatus('saving');
    
    try {
      await noteService.updateNote(noteId, {
        title: currentTitle,
        content: currentContent,
      });
      
      lastSavedContent.current = currentContent;
      retryCount.current = 0;
      setSaveStatus('saved');
    } catch (error) {
      if (retryCount.current < 3) {
        retryCount.current++;
        setSaveStatus('retrying');
        // Exponential backoff: 2s, 4s, 8s
        setTimeout(saveNote, 2000 * Math.pow(2, retryCount.current - 1));
      } else {
        setSaveStatus('error');
        retryCount.current = 0;
      }
    }
  }, [noteId, editor]);
  
  // Debounced save on content change
  const debouncedSave = useMemo(
    () => debounce(saveNote, 1500),
    [saveNote]
  );
  
  useEffect(() => {
    const handleUpdate = () => {
      setSaveStatus('unsaved');
      debouncedSave();
    };
    
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      debouncedSave.flush(); // Save on unmount
    };
  }, [editor, debouncedSave]);
  
  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        debouncedSave.flush();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus, debouncedSave]);
  
  return { saveStatus, forceSave: saveNote };
}
```

### Save States

```
┌────────────────────────────────────────────────────────────┐
│ State     │ Icon    │ Text           │ Color              │
├───────────┼─────────┼────────────────┼────────────────────┤
│ saved     │ ✓       │ Saved          │ text-secondary     │
│ unsaved   │ ●       │ Unsaved        │ warning (amber)    │
│ saving    │ ⟳       │ Saving...      │ text-secondary     │
│ retrying  │ ⟳       │ Retrying...    │ warning (amber)    │
│ error     │ ✕       │ Save failed    │ error (red)        │
│ offline   │ ◎       │ Offline        │ text-tertiary      │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Debounce Configuration

| Parameter        | Value  | Rationale                                                |
|------------------|--------|----------------------------------------------------------|
| Debounce delay   | 1500ms | Balance between responsiveness and API call reduction    |
| Max wait         | 10s    | Force save after 10s of continuous typing                |
| Flush on unmount | Yes    | Save when user navigates away                            |
| Flush on blur    | Yes    | Save when user switches to another tab/window            |

**Why 1500ms?** Research shows users pause between thoughts for 1–3 seconds. 1500ms captures natural pauses without saving mid-word.

**Max wait**: Even during continuous typing, a save is forced every 10 seconds to limit potential data loss.

---

## 5. Optimistic UI

The autosave system uses optimistic updates:

1. Editor content is the source of truth locally.
2. Save status reflects the API state.
3. If save fails, the editor content is NOT rolled back — user keeps typing.
4. Failed saves are retried automatically.
5. Only if all retries fail does the user see a persistent error.

This means the user never loses typed content due to a transient network issue.

---

## 6. Conflict Handling

### Simple Conflict Detection

Each note has an `updatedAt` timestamp. The autosave PATCH request includes the last known `updatedAt`:

```json
// PATCH /api/notes/:id
{
  "content": { ... },
  "lastKnownUpdatedAt": "2026-03-20T14:00:00Z"
}
```

Server checks:

```typescript
if (note.updatedAt > dto.lastKnownUpdatedAt) {
  // Another client (or the same user in another tab) modified the note
  throw new ConflictError('Note was modified by another session');
}
```

### Conflict Resolution Strategy (MVP)

- **Last-write-wins**: If no conflict detection is implemented initially.
- **Phase 2**: Conflict detection with a dialog: "This note was modified elsewhere. Keep your version / Keep server version / Merge (manual)."
- **Phase 3 (future)**: Real-time collaboration via CRDT/OT (ProseMirror supports this).

---

## 7. Network Failure Handling

```
Network fails during save
        │
        ▼
┌──────────────────┐
│  Retry Attempt 1 │  ← After 2 seconds
└────────┬─────────┘
         │ Fails
         ▼
┌──────────────────┐
│  Retry Attempt 2 │  ← After 4 seconds
└────────┬─────────┘
         │ Fails
         ▼
┌──────────────────┐
│  Retry Attempt 3 │  ← After 8 seconds
└────────┬─────────┘
         │ Fails
         ▼
┌──────────────────┐
│  Show Error      │  ← "Save failed. Click to retry."
│  Keep content    │  ← Editor content preserved
│  in editor       │  ← No data loss
└──────────────────┘
```

### Online/Offline Detection

```typescript
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  
  return isOnline;
}
```

When offline:
- Save status shows "Offline".
- Changes accumulate in the editor (in-memory).
- When connection is restored, a save is triggered immediately.

---

## 8. Performance Optimization

| Optimization             | Description                                         |
|--------------------------|-----------------------------------------------------|
| Diff check               | Skip API call if content hasn't actually changed    |
| Partial updates           | Send only `title` or `content`, not both, if only one changed |
| Debounce (not throttle)   | Coalesce rapid changes into single save             |
| AbortController           | Cancel in-flight save if a newer save is triggered  |
| Compressed payload        | JSONB content is compact; gzip in transit           |

### Request Deduplication

```typescript
let abortController: AbortController | null = null;

async function saveNote(noteId: string, data: Partial<NoteUpdate>) {
  // Cancel previous in-flight request
  if (abortController) {
    abortController.abort();
  }
  
  abortController = new AbortController();
  
  await axios.patch(`/api/notes/${noteId}`, data, {
    signal: abortController.signal,
  });
  
  abortController = null;
}
```

---

## 9. Manual Save

Despite autosave, users can still force-save:

- `Ctrl+S` / `Cmd+S` → Immediately flushes the debounce timer and saves.
- A keyboard shortcut handler prevents the browser's default save dialog.

```typescript
useKeyboardShortcut('ctrl+s', (e) => {
  e.preventDefault();
  forceSave();
});
```

---

## 10. Server-Side Processing on Save

When a note is saved (autosave or manual):

1. **Validate content**: Ensure ProseMirror JSON is well-formed.
2. **Extract plaintext**: Walk JSON tree → concatenate text nodes.
3. **Update `plaintext` column**: Triggers `searchVector` update (via PostgreSQL trigger).
4. **Update `lastEditedAt`**: Track last content edit separately from metadata updates.
5. **Update `updatedAt`**: Standard timestamp.
6. **Return updated note**: Client uses returned `updatedAt` for conflict detection.

This ensures the search index stays in sync with note content without separate indexing jobs.
