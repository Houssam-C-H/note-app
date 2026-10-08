# Search System — NoteSpace

---

## 1. Search Architecture

NoteSpace uses **PostgreSQL full-text search** (FTS) as the primary search engine.

### Why PostgreSQL FTS?

| Factor              | PostgreSQL FTS        | Elasticsearch/MeiliSearch    |
|---------------------|-----------------------|------------------------------|
| Infrastructure      | No additional service | Separate cluster needed      |
| Maintenance         | Zero (part of DB)     | Cluster management required  |
| Scale threshold     | ~100K–500K documents  | Millions of documents        |
| Relevance ranking   | `ts_rank` (adequate)  | BM25 (superior)              |
| Fuzzy matching      | Trigram indexes        | Built-in                     |
| Faceted search      | Manual SQL            | Built-in                     |
| Real-time indexing  | Trigger-based (sync)  | Near real-time               |

**Decision**: PostgreSQL FTS is sufficient for the target scale (individual users/small teams with thousands of notes). If search requirements exceed this, the `SearchService` interface allows dropping in Elasticsearch without changing the API.

---

## 2. Indexing Strategy

### Full-Text Search Vector

Each note has a `searchVector` column of type `tsvector`, automatically maintained by a database trigger:

```sql
-- Weighted search vector: title is weighted higher than content
CREATE FUNCTION notes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.plaintext, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, plaintext ON notes
  FOR EACH ROW EXECUTE FUNCTION notes_search_vector_update();
```

**Weights**:
- **A (highest)**: Note title — title matches rank highest.
- **B**: Note plaintext content — content matches rank lower.

### GIN Index

```sql
CREATE INDEX idx_notes_search_vector ON notes USING GIN("searchVector");
```

GIN (Generalized Inverted Index) is optimized for full-text search lookups.

### Trigram Index (Fuzzy Search)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_notes_title_trgm ON notes USING GIN(title gin_trgm_ops);
```

Enables `LIKE '%partial%'` and similarity matching for typo-tolerant search.

---

## 3. Plaintext Extraction

Rich-text content is stored as ProseMirror JSON. Before indexing, plaintext is extracted:

```typescript
// contentParser.ts
function extractPlaintext(doc: ProseMirrorDoc): string {
  const texts: string[] = [];
  
  function walk(node: ProseMirrorNode) {
    if (node.type === 'text' && node.text) {
      texts.push(node.text);
    }
    if (node.content) {
      node.content.forEach(walk);
    }
  }
  
  walk(doc);
  return texts.join(' ');
}
```

This plaintext is stored in the `plaintext` column and used by the `tsvector` trigger. It is regenerated on every note save.

---

## 4. Search Query Processing

### Client-Side

1. User types in search bar.
2. Input is debounced (300ms).
3. After debounce, `GET /api/search?q=...` is called.
4. React Query caches results (stale time: 30s).

### Server-Side Query

```typescript
// search.service.ts
async function searchNotes(userId: string, params: SearchParams) {
  const { q, notebookId, sectionId, tags, isPinned, isFavorite, page, limit } = params;
  
  // Build the tsquery from user input
  // "sprint planning" → 'sprint' & 'planning'
  const tsquery = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => `${word}:*`)  // Prefix matching
    .join(' & ');
  
  const results = await prisma.$queryRaw`
    SELECT 
      n.id,
      n.title,
      ts_headline('english', n.plaintext, to_tsquery('english', ${tsquery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') as preview,
      ts_rank(n."searchVector", to_tsquery('english', ${tsquery})) as relevance,
      n."isPinned",
      n."isFavorite",
      n."lastEditedAt",
      s.title as "sectionTitle",
      nb.title as "notebookTitle"
    FROM notes n
    JOIN sections s ON n."sectionId" = s.id
    JOIN notebooks nb ON s."notebookId" = nb.id
    WHERE 
      n."searchVector" @@ to_tsquery('english', ${tsquery})
      AND n."deletedAt" IS NULL
      AND n."userId" = ${userId}
      ${notebookId ? Prisma.sql`AND nb.id = ${notebookId}` : Prisma.empty}
      ${sectionId ? Prisma.sql`AND s.id = ${sectionId}` : Prisma.empty}
      ${isPinned !== undefined ? Prisma.sql`AND n."isPinned" = ${isPinned}` : Prisma.empty}
      ${isFavorite !== undefined ? Prisma.sql`AND n."isFavorite" = ${isFavorite}` : Prisma.empty}
    ORDER BY relevance DESC, n."lastEditedAt" DESC
    LIMIT ${limit}
    OFFSET ${(page - 1) * limit}
  `;
  
  return results;
}
```

### Search Features

| Feature            | Implementation                                           |
|--------------------|----------------------------------------------------------|
| Full-text search   | `tsvector @@ tsquery` with GIN index                     |
| Title search       | Weighted A in tsvector (ranks higher)                    |
| Content search     | Weighted B in tsvector                                   |
| Prefix matching    | `word:*` in tsquery (e.g., "spr" matches "sprint")      |
| Phrase matching    | `'sprint' <-> 'planning'` (adjacent words)               |
| Relevance ranking  | `ts_rank()` — considers word frequency and position      |
| Highlighted preview| `ts_headline()` — wraps matches in `<mark>` tags         |
| Filter by notebook | WHERE clause on notebook ID                              |
| Filter by section  | WHERE clause on section ID                               |
| Filter by tags     | JOIN on note_tags + tags table                           |
| Filter by pinned   | WHERE clause on isPinned                                 |
| Filter by favorite | WHERE clause on isFavorite                               |
| Pagination         | Offset-based (acceptable for search results)             |

---

## 5. Search UI

### Search Bar

```
┌──────────────────────────────────────────────┐
│ 🔍 Search notes...                    ⌘F     │
└──────────────────────────────────────────────┘
```

- Always visible in the header.
- Focus with `Ctrl+F` or `Cmd+F`.
- Debounced input (300ms).
- Shows recent searches when empty (stored in localStorage).

### Search Results Dropdown

```
┌──────────────────────────────────────────────┐
│ Results for "sprint planning"        3 found │
├──────────────────────────────────────────────┤
│ 📝 Sprint Planning Q4                       │
│    Work Notes > Meetings                     │
│    ...discussed the <mark>sprint</mark>      │
│    <mark>planning</mark> for next quarter... │
│    Last edited: 2 hours ago                  │
├──────────────────────────────────────────────┤
│ 📝 Team Retrospective                       │
│    Work Notes > Reviews                      │
│    ...review the <mark>sprint</mark> goals   │
│    and <mark>planning</mark> process...      │
│    Last edited: 1 week ago                   │
├──────────────────────────────────────────────┤
│ 📝 Project Roadmap                           │
│    Projects > Planning                       │
│    ...<mark>sprint</mark>-based              │
│    <mark>planning</mark> methodology...      │
│    Last edited: 2 weeks ago                  │
└──────────────────────────────────────────────┘
```

### Search Filters Panel

```
┌──────────────────────────────────────────────┐
│ Filters                              Clear ↺ │
├──────────────────────────────────────────────┤
│ Notebook:  [All notebooks      ▾]           │
│ Section:   [All sections       ▾]           │
│ Tags:      [work] [meeting] [+]             │
│ Status:    ☐ Pinned  ☐ Favorites            │
│ Sort:      [Relevance ▾]                    │
└──────────────────────────────────────────────┘
```

---

## 6. Tag-Based Search

Tags are searched via a JOIN:

```sql
SELECT DISTINCT n.*
FROM notes n
JOIN note_tags nt ON n.id = nt."noteId"
JOIN tags t ON nt."tagId" = t.id
WHERE t.id IN ('tag-uuid-1', 'tag-uuid-2')
AND n."userId" = 'user-uuid'
AND n."deletedAt" IS NULL;
```

Tags can be combined with full-text search (AND logic).

---

## 7. Performance Optimizations

| Optimization           | Implementation                                    |
|------------------------|--------------------------------------------------|
| Client debounce        | 300ms debounce before API call                   |
| Query caching          | React Query caches results (30s stale time)      |
| GIN index              | PostgreSQL GIN index on searchVector column       |
| Trigram index           | pg_trgm GIN index for fuzzy/partial matching     |
| Limit results          | Max 50 results per page                          |
| Lightweight response   | Only title, preview, metadata — not full content |
| Connection pooling     | Prisma connection pool for search queries        |
| Short-circuit empty    | Return empty immediately for query < 2 chars     |

---

## 8. Shared Notes in Search

Search results include notes shared with the user:

```sql
WHERE (
  n."userId" = ${userId}                          -- Own notes
  OR EXISTS (
    SELECT 1 FROM note_shares ns                   -- Directly shared
    WHERE ns."noteId" = n.id AND ns."sharedWithId" = ${userId}
  )
  OR EXISTS (
    SELECT 1 FROM notebook_shares nbs             -- Notebook shared
    JOIN sections s2 ON s2."notebookId" = nbs."notebookId"
    WHERE s2.id = n."sectionId" AND nbs."sharedWithId" = ${userId}
  )
)
```

---

## 9. Future Scalability Path

If search requirements outgrow PostgreSQL FTS:

1. **Extract `SearchService` interface** — already designed for this.
2. **Add Elasticsearch/MeiliSearch adapter** implementing the same interface.
3. **Sync pipeline**: Use database triggers or change data capture (CDC) to push note changes to the search engine.
4. **Dual-write period**: Run both PostgreSQL FTS and external search in parallel during migration.
5. **Switch service binding**: Point `SearchService` to the new adapter.

No API changes needed. No frontend changes needed.
