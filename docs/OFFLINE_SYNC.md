# Offline Synchronization — NoteSpace

---

## 1. Offline Strategy: Progressive Enhancement

Offline support is designed as a **later-phase enhancement**, not an MVP requirement. The architecture is designed to accommodate offline support without rewriting core logic.

**MVP (Phase 1–8)**: Online-only with graceful degradation (offline detection, queued saves on reconnect).

**Phase 9**: Full offline support with IndexedDB, service worker, and sync queue.

---

## 2. MVP: Graceful Degradation

### What works without network (MVP):

- ✅ Continue typing in the current note (editor state is in-memory).
- ✅ Offline status indicator shown in UI.
- ✅ Changes saved to memory; synced when network returns.
- ✅ beforeunload warning if unsaved changes exist.

### What does NOT work without network (MVP):

- ❌ Navigating to a different note (requires API fetch).
- ❌ Creating new notebooks/sections/notes.
- ❌ Searching notes.
- ❌ Uploading files.
- ❌ Viewing notes not already loaded.

---

## 3. Phase 9: Full Offline Architecture

### Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                      Service Worker                    │
│  - Cache static assets (HTML, CSS, JS, fonts)          │
│  - Intercept API requests when offline                 │
│  - Serve cached responses                              │
└────────────────────┬───────────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────────┐
│                    IndexedDB                           │
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ notes_cache     │  │ sync_queue      │             │
│  │ - id            │  │ - id            │             │
│  │ - title         │  │ - type (CREATE/ │             │
│  │ - content       │  │   UPDATE/DELETE)│             │
│  │ - metadata      │  │ - entityType    │             │
│  │ - lastSynced    │  │ - entityId      │             │
│  │ - isDirty       │  │ - payload       │             │
│  └─────────────────┘  │ - timestamp     │             │
│                        │ - retries       │             │
│  ┌─────────────────┐  │ - status        │             │
│  │ notebooks_cache │  └─────────────────┘             │
│  │ sections_cache  │                                   │
│  └─────────────────┘                                   │
└────────────────────────────────────────────────────────┘
```

### Service Worker Caching Strategy

```
Static Assets: Cache-First
  → Serve from cache immediately
  → Update cache in background (stale-while-revalidate)

API Responses: Network-First
  → Try network first
  → If offline, serve from IndexedDB cache
  → If API fails, serve stale data with "offline" indicator

API Mutations: Queue-First
  → If online, send immediately
  → If offline, queue in IndexedDB sync_queue
  → Process queue when connection is restored
```

### Offline Data Storage (IndexedDB via Dexie.js)

```typescript
// Simplified IndexedDB schema
const db = new Dexie('NoteSpaceOffline');

db.version(1).stores({
  notebooks: 'id, userId, updatedAt',
  sections: 'id, notebookId, updatedAt',
  notes: 'id, sectionId, userId, updatedAt, isDirty',
  tags: 'id, userId',
  syncQueue: '++id, entityType, entityId, status, timestamp',
});
```

---

## 4. Synchronization Protocol

### Online → Offline Transition

```
1. Detect navigator.onLine = false (or fetch failure)
2. Show offline indicator in UI
3. Switch to IndexedDB for reads
4. Queue mutations in sync_queue
5. Continue allowing note editing (save to IndexedDB)
```

### Offline → Online Transition

```
1. Detect navigator.onLine = true
2. Process sync_queue in order (FIFO)
3. For each queued mutation:
   a. Send API request
   b. If success: remove from queue, update local cache
   c. If conflict: flag for manual resolution
   d. If server error: retry with backoff (max 5 retries)
4. After queue is processed: full sync to refresh stale data
5. Remove offline indicator
```

### Sync Queue Processing

```typescript
async function processSyncQueue() {
  const pendingItems = await db.syncQueue
    .where('status')
    .equals('pending')
    .sortBy('timestamp');
  
  for (const item of pendingItems) {
    try {
      await processQueueItem(item);
      await db.syncQueue.delete(item.id);
    } catch (error) {
      if (isConflict(error)) {
        await db.syncQueue.update(item.id, { status: 'conflict' });
      } else {
        await db.syncQueue.update(item.id, {
          retries: item.retries + 1,
          status: item.retries >= 5 ? 'failed' : 'pending',
        });
      }
    }
  }
}
```

---

## 5. Conflict Resolution

### Detection

Conflicts occur when:
- User A edits a note offline.
- User B (or User A in another session) edits the same note online.
- User A comes back online and tries to sync.

Detection: Compare `updatedAt` timestamp of local version with server version.

### Resolution Strategy

```
┌────────────────────────────────────────────────────────┐
│        ⚠️ Sync Conflict Detected                       │
│                                                        │
│  "Sprint Planning" was modified while you were offline │
│                                                        │
│  Your version:     Modified 10 minutes ago             │
│  Server version:   Modified 5 minutes ago              │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ Keep Mine    │  │ Keep Server  │  │ Keep Both    ││
│  │              │  │              │  │ (duplicate)  ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
└────────────────────────────────────────────────────────┘
```

- **Keep Mine**: Overwrite server version with local version.
- **Keep Server**: Discard local changes.
- **Keep Both**: Create a duplicate note with local changes; keep server version as-is.

For MVP (Phase 9): Simple conflict dialog. No automatic merging.

For future phases: ProseMirror-based operational transform or CRDT for automatic merging.

---

## 6. Data Freshness

### Cache Invalidation

| Data Type    | Cache TTL   | Refresh Strategy                     |
|--------------|-------------|--------------------------------------|
| Notebooks    | 5 minutes   | Refresh on app focus + every 5 min   |
| Sections     | 5 minutes   | Refresh when notebook is selected    |
| Notes (list) | 2 minutes   | Refresh when section is selected     |
| Note content | 30 seconds  | Refresh when note is opened          |
| Tags         | 10 minutes  | Refresh on app startup               |
| User profile | 30 minutes  | Refresh on settings page visit       |

### Background Sync

When online, a background sync runs every 5 minutes:
1. Check for updated notebooks/sections/notes (using `updatedAt` comparison).
2. Pull any changes from the server.
3. Update IndexedDB cache.
4. Notify React Query to refetch active queries.

---

## 7. Storage Limits

| Store            | Estimated Size   | Limit          |
|------------------|------------------|----------------|
| IndexedDB        | 50–100 MB        | ~50% of disk   |
| Service Worker   | 5–10 MB          | Varies by browser |

### Eviction Strategy

If IndexedDB approaches storage limits:
1. Evict notes not accessed in the last 30 days (keep metadata, remove content).
2. Evict attachments (download on demand when online).
3. Keep the most recently accessed 500 notes fully cached.
4. Show a warning if storage is critically low.

---

## 8. Implementation Dependencies

| Dependency        | Purpose                            |
|-------------------|------------------------------------|
| Workbox           | Service worker tooling             |
| Dexie.js          | IndexedDB wrapper (simpler API)    |
| idb-keyval        | Simple key-value IndexedDB store   |

---

## 9. Phase 9 Implementation Checklist

- [ ] Set up service worker with Workbox (Vite PWA plugin)
- [ ] Configure static asset caching (cache-first)
- [ ] Set up IndexedDB schema with Dexie.js
- [ ] Implement offline data reader (IndexedDB fallback)
- [ ] Implement sync queue for offline mutations
- [ ] Implement queue processor for online reconnection
- [ ] Implement conflict detection and resolution UI
- [ ] Add background sync for data freshness
- [ ] Add storage quota monitoring
- [ ] Add eviction strategy for old cached data
- [ ] Test offline → online transitions thoroughly
- [ ] Test conflict scenarios with multiple sessions
- [ ] Add manifest.json for PWA install prompt
