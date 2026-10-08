# Development Roadmap — NoteSpace

---

## Phase 0 — Architecture & Documentation ✅

**Goal**: Complete technical documentation before any code is written.

| Task                              | Status    |
|-----------------------------------|-----------|
| Requirements analysis             | ✅ Done    |
| Technology stack selection         | ✅ Done    |
| Architecture design                | ✅ Done    |
| Database schema design             | ✅ Done    |
| API design                         | ✅ Done    |
| Authentication design              | ✅ Done    |
| Security documentation             | ✅ Done    |
| Frontend design                    | ✅ Done    |
| Backend design                     | ✅ Done    |
| File storage design                | ✅ Done    |
| Search system design               | ✅ Done    |
| Autosave design                    | ✅ Done    |
| Offline sync design                | ✅ Done    |
| Testing strategy                   | ✅ Done    |
| Deployment planning                | ✅ Done    |
| Development workflow               | ✅ Done    |

**Deliverable**: Complete `docs/` directory with all technical documentation.

---

## Phase 1 — Project Setup

**Goal**: Working development environment with all tooling configured.

**Duration**: 1–2 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| Initialize monorepo (Turborepo)   | P0        |
| Set up frontend (Vite + React + TypeScript) | P0 |
| Set up backend (Express + TypeScript) | P0    |
| Set up shared types package        | P0        |
| Configure Prisma + PostgreSQL      | P0        |
| Configure Redis client             | P0        |
| Docker Compose for dev services    | P0        |
| ESLint + Prettier configuration    | P0        |
| Environment variables setup        | P0        |
| Git repository + .gitignore        | P0        |
| README with setup instructions     | P1        |

**Deliverable**: `npm run dev` starts frontend + backend with hot reload.

---

## Phase 2 — Authentication ✅

**Goal**: Users can register, log in, and log out securely.

**Duration**: 3–5 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| User model + migration             | ✅ P0        |
| Session model + migration          | ✅ P0        |
| Password hashing (Argon2id)        | ✅ P0        |
| JWT generation + verification      | ✅ P0        |
| Register endpoint                  | ✅ P0        |
| Login endpoint                     | ✅ P0        |
| Logout endpoint                    | ✅ P0        |
| Refresh token endpoint             | ✅ P0        |
| Authentication middleware          | ✅ P0        |
| Rate limiting on auth endpoints    | ✅ P0        |
| Login page UI                      | ✅ P0        |
| Register page UI                   | ✅ P0        |
| Protected route component          | ✅ P0        |
| Password reset flow                | ✅ P1        |
| Email verification flow            | ✅ P1        |
| Email service (MailHog in dev)      | ✅ P1        |
| Session management (list/revoke)   | ✅ P2        |
| Auth integration tests             | ✅ P0        |

**Deliverable**: Full authentication flow with secure cookie-based session management.

---

## Phase 3 — Notebook & Section System ✅

**Goal**: Users can create and organize notebooks and sections.

**Duration**: 2–3 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| Notebook model + migration         | ✅ P0        |
| Section model + migration          | ✅ P0        |
| Notebook CRUD endpoints            | ✅ P0        |
| Section CRUD endpoints             | ✅ P0        |
| Authorization middleware           | ✅ P0        |
| Notebook sidebar UI                | ✅ P0        |
| Section tabs UI                    | ✅ P0        |
| Create/rename/delete dialogs       | ✅ P0        |
| Notebook color picker              | ✅ P1        |
| Reorder notebooks (drag & drop)    | ✅ P2        |
| Reorder sections                   | ✅ P2        |
| Archive notebook                   | ✅ P2        |
| Notebook/section integration tests | ✅ P0        |

**Deliverable**: 3-panel layout with functional notebook/section navigation.

---

## Phase 4 — Notes + Rich-Text Editor ✅

**Goal**: Users can create, edit, and manage notes with rich formatting.

**Duration**: 5–7 days

| Task                              | Priority  | Status    |
|-----------------------------------|-----------|-----------|
| Note model + migration             | P0        | ✅ Done   |
| Note CRUD endpoints                | P0        | ✅ Done   |
| TipTap editor integration          | P0        | ✅ Done   |
| Editor toolbar (bold, italic, etc.)| P0        | ✅ Done   |
| Headings (H1–H3)                   | P0        | ✅ Done   |
| Lists (bullet, numbered)           | P0        | ✅ Done   |
| Checklists                         | P0        | ✅ Done   |
| Links                              | P0        | ✅ Done   |
| Code blocks                        | P0        | ✅ Done   |
| Blockquotes                        | P0        | ✅ Done   |
| Tables                             | P1        | ✅ Done   |
| Text alignment                     | P1        | ✅ Done   |
| Text color                         | P2        | ✅ Done   |
| Strikethrough                      | P1        | ✅ Done   |
| Horizontal rule                    | P2        | ✅ Done   |
| Note list UI (center panel)        | P0        | ✅ Done   |
| Note metadata bar (tags, status)   | P1        | ✅ Done   |
| Pin/Favorite/Archive toggles       | P1        | ✅ Done   |
| Content validation (server-side)   | P0        | ✅ Done   |
| Plaintext extraction               | P0        | ✅ Done   |
| Note list preview (first 150 chars)| P1        | ✅ Done   |
| Keyboard shortcuts                 | P1        | ✅ Done   |
| Move note to different section     | P2        | ✅ Done   |
| Duplicate note                     | P2        | ✅ Done   |
| Note integration tests             | P0        | ✅ Done   |

**Deliverable**: Fully functional rich-text note editor with formatting toolbar.

---

## Phase 5 — Autosave

**Goal**: Notes save automatically without user intervention.

**Duration**: 2–3 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| useAutosave hook                   | P0        | ✅ Done |
| Debounce implementation (1500ms)   | P0        | ✅ Done |
| Diff check (skip unchanged saves) | P0        | ✅ Done |
| Save status indicator UI           | P0        | ✅ Done |
| Retry with exponential backoff     | P0        | ✅ Done |
| Flush on page unload (beforeunload)| P0        | ✅ Done |
| Flush on navigation                | P0        | ✅ Done |
| Manual save (Ctrl+S)               | P0        | ✅ Done |
| Conflict detection (updatedAt)     | P1        | ⏳     |
| AbortController for in-flight cancellation | P1 | ✅ Done |
| Online/offline detection           | P1        | ✅ Done |
| Autosave unit tests                | P0        | ✅ Done |

**Deliverable**: Reliable autosave with visual feedback and failure recovery.

---

## Phase 6 — Search ✅

**Goal**: Users can search across all their notes by title, content, and tags.

**Duration**: 2–3 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| Search vector trigger (PostgreSQL) | ✅ P0        |
| GIN index on search vector         | ✅ P0        |
| pg_trgm extension for fuzzy search | ✅ P1        |
| Search endpoint                    | ✅ P0        |
| Search service (full-text query)   | ✅ P0        |
| Search bar UI (header)             | ✅ P0        |
| Search results dropdown            | ✅ P0        |
| Highlighted preview (ts_headline)  | ✅ P1        |
| Debounced search (300ms)           | ✅ P0        |
| Filter by notebook                 | ✅ P1        |
| Filter by section                  | ✅ P1        |
| Filter by tags                     | ✅ P1        |
| Filter by pinned/favorite          | ✅ P2        |
| Pagination                         | ✅ P1        |
| Recent searches (localStorage)     | ✅ P2        |
| Search integration tests           | ⏳ P0        |

**Deliverable**: Fast, relevant full-text search with filters.

---

## Phase 7 — Tags & Attachments

**Goal**: Users can tag notes and upload files.

**Duration**: 3–4 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| Tag model + migration              | ✅ P0        |
| NoteTag junction table             | ✅ P0        |
| Tag CRUD endpoints                 | ✅ P0        |
| Tag management UI                  | ✅ P0        |
| Add/remove tags on notes           | ✅ P0        |
| Tag autocomplete                   | ✅ P1        |
| Attachment model + migration       | ✅ P0        |
| Multer upload configuration        | ✅ P0        |
| File validation (MIME + magic bytes)| ✅ P0       |
| Storage service (local backend)    | ✅ P0        |
| Upload endpoint                    | ✅ P0        |
| Download endpoint (with auth)      | ✅ P0        |
| Delete attachment endpoint         | ✅ P0        |
| Upload button in editor toolbar    | ✅ P0        |
| Attachment list UI in note         | ✅ P0        |
| Image preview (inline in editor)   | ✅ P1        |
| SVG sanitization                   | ✅ P1        |
| File type icons                    | ✅ P2        |
| Drag-and-drop upload               | ✅ P2        |
| Attachment integration tests       | ✅ P0        |

**Deliverable**: Working tag system and secure file upload/download.

---

## Phase 8 — Sharing & Trash

**Goal**: Users can share notes/notebooks and manage deleted items.

**Duration**: 3–4 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| NoteShare model + migration        | P0        |
| NotebookShare model + migration    | P0        |
| Share endpoints (note + notebook)  | P0        |
| Authorization cascade (notebook → notes) | P0 |
| Share dialog UI                    | P0        |
| Permission select (READ/EDIT)      | P0        |
| Shared items page                  | P0        |
| Revoke share                       | P0        |
| Trash page UI                      | P0        |
| Restore from trash                 | P0        |
| Empty trash (hard delete)          | P0        |
| Auto-empty trash after 30 days (BG job) | P1  |
| Orphaned file cleanup job          | P1        |
| Sharing authorization tests        | P0        |
| Trash integration tests            | P0        |

**Deliverable**: Sharing with permissions + trash with restore.

---

## Phase 9 — Offline Support

**Goal**: Application works offline with sync on reconnect.

**Duration**: 5–7 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| Service worker setup (Workbox)     | P0        |
| Static asset caching               | P0        |
| IndexedDB schema (Dexie.js)        | P0        |
| Offline data reader                 | P0        |
| Sync queue for mutations            | P0        |
| Queue processor on reconnect       | P0        |
| Conflict detection                  | P0        |
| Conflict resolution UI             | P1        |
| Background sync (data freshness)   | P1        |
| Storage quota monitoring            | P2        |
| PWA manifest                        | P1        |
| Offline tests                       | P0        |

**Deliverable**: PWA with offline note editing and sync.

---

## Phase 10 — Testing & Polish

**Goal**: Comprehensive test coverage and UX polish.

**Duration**: 3–5 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| Complete unit test suite            | P0        |
| Complete integration test suite     | P0        |
| E2E test suite (Playwright)        | P0        |
| Responsive design audit             | P0        |
| Accessibility audit (WCAG 2.1 AA)  | P1        |
| Performance audit (Lighthouse)      | P1        |
| Loading states and skeletons        | P0        |
| Empty states with illustrations     | P1        |
| Error states                        | P0        |
| Toast notifications                 | P0        |
| Keyboard navigation                 | P1        |
| Animation polish                    | P2        |
| Dark/light theme toggle             | P1        |

**Deliverable**: Polished, well-tested application.

---

## Phase 11 — Security Audit

**Goal**: Verify all security measures are properly implemented.

**Duration**: 2–3 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| OWASP Top 10 checklist review      | P0        |
| Authentication security test        | P0        |
| Authorization boundary testing      | P0        |
| XSS testing (stored, reflected)     | P0        |
| CSRF testing                        | P0        |
| SQL injection testing               | P0        |
| File upload security testing        | P0        |
| Rate limiting verification          | P0        |
| Security headers verification       | P0        |
| CORS configuration review           | P0        |
| Dependency audit (`npm audit`)      | P0        |
| Secrets management review           | P0        |
| Penetration testing (if resources allow) | P1  |

**Deliverable**: Security audit report with all issues addressed.

---

## Phase 12 — Production Deployment

**Goal**: Application deployed and monitored in production.

**Duration**: 2–3 days

| Task                              | Priority  |
|-----------------------------------|-----------|
| Production Docker configuration    | P0        |
| Nginx reverse proxy setup          | P0        |
| SSL certificate installation       | P0        |
| Environment variables (production) | P0        |
| Database migration (production)    | P0        |
| Automated backup setup             | P0        |
| Health check monitoring             | P0        |
| Error tracking (Sentry)            | P1        |
| Log aggregation                    | P1        |
| Performance monitoring              | P1        |
| CI/CD pipeline                      | P1        |
| Documentation update                | P0        |

**Deliverable**: Live, monitored production deployment.

---

## Priority Legend

| Priority | Meaning                                      |
|----------|----------------------------------------------|
| P0       | Must have — blocking for phase completion    |
| P1       | Should have — important but not blocking     |
| P2       | Nice to have — can be deferred to next phase |

---

## Estimated Timeline

| Phase     | Duration    | Cumulative  |
|-----------|-------------|-------------|
| Phase 0   | 1–2 days    | Week 1      |
| Phase 1   | 1–2 days    | Week 1      |
| Phase 2   | 3–5 days    | Week 2      |
| Phase 3   | 2–3 days    | Week 2–3    |
| Phase 4   | 5–7 days    | Week 3–4    |
| Phase 5   | 2–3 days    | Week 4      |
| Phase 6   | 2–3 days    | Week 5      |
| Phase 7   | 3–4 days    | Week 5–6    |
| Phase 8   | 3–4 days    | Week 6–7    |
| Phase 9   | 5–7 days    | Week 7–8    |
| Phase 10  | 3–5 days    | Week 8–9    |
| Phase 11  | 2–3 days    | Week 9      |
| Phase 12  | 2–3 days    | Week 10     |

**Total estimated: 8–12 weeks** for a single developer working full-time.

---

## MVP Scope (Phases 1–6)

A functional MVP is achievable after Phase 6 (~5 weeks):

- ✅ User authentication
- ✅ Notebook/section organization
- ✅ Rich-text note editing
- ✅ Autosave
- ✅ Full-text search
- ✅ Tags (Phase 7)
- ✅ Attachments (Phase 7)
- ❌ Sharing (Phase 8)
- ❌ Offline (Phase 9)

This MVP can be deployed and used while remaining phases continue in parallel.
