# Architecture Documentation — NoteSpace

> A modern, scalable note-taking application inspired by Microsoft OneNote.

---

## 1. Architecture Overview

NoteSpace follows a **monorepo, three-tier architecture**:

```
┌─────────────────────────────────────────────────────┐
│                    Client (SPA)                     │
│              React + TypeScript + Vite              │
├─────────────────────────────────────────────────────┤
│                   API Gateway                       │
│            Node.js + Express + TypeScript            │
├─────────────────────────────────────────────────────┤
│              Data Layer                             │
│     PostgreSQL │ Redis │ Local Filesystem / S3       │
└─────────────────────────────────────────────────────┘
```

**Why this architecture?**

- **Monorepo**: Shared types, simpler CI/CD, atomic changes across frontend and backend.
- **Three-tier**: Clear separation of concerns — presentation, business logic, data.
- **SPA + REST API**: Decouples frontend from backend, enabling future mobile clients.
- **TypeScript everywhere**: End-to-end type safety reduces bugs at boundaries.

---

## 2. Frontend Architecture

### 2.1 Technology Choices

| Concern              | Choice               | Rationale                                                                 |
|----------------------|----------------------|---------------------------------------------------------------------------|
| Language             | TypeScript 5.x       | Type safety, IDE support, refactoring confidence                          |
| Framework            | React 18+            | Mature ecosystem, rich-text editor support, massive community             |
| Build Tool           | Vite 5+              | Fast HMR, ESBuild-based, excellent DX                                    |
| UI Components        | Radix UI + custom    | Accessible primitives, full styling control, no vendor lock-in            |
| CSS Solution         | Vanilla CSS Modules  | Scoped styles, no runtime cost, co-located with components               |
| State Management     | Zustand              | Minimal boilerplate, TypeScript-friendly, devtools support                |
| Form Management      | React Hook Form      | Performant (uncontrolled), validation integration, small bundle           |
| Routing              | React Router v6      | Standard, nested routes, lazy loading support                             |
| Rich-Text Editor     | TipTap (ProseMirror) | Extensible, collaborative-ready, JSON document model                      |
| API Client           | Axios + React Query  | Caching, deduplication, retry, optimistic updates                         |
| Validation           | Zod                  | Schema-first, TypeScript inference, shared with backend                   |
| Auth Handling        | HTTP-only cookies    | Secure, no JS access to tokens, CSRF-protected                           |
| Error Handling       | Error Boundaries + toast notifications | Graceful degradation, user-friendly messages           |
| Testing              | Vitest + Testing Library + Playwright | Unit, component, and E2E coverage                    |

### 2.2 Component Architecture

```
src/
├── components/          # Shared, reusable UI components
│   ├── ui/              # Primitives (Button, Input, Modal, Toast)
│   ├── editor/          # Rich-text editor components
│   └── layout/          # Shell, Sidebar, Header
├── features/            # Feature-based modules
│   ├── auth/            # Login, Register, Password Reset
│   ├── notebooks/       # Notebook CRUD, list, sidebar
│   ├── sections/        # Section CRUD, tabs
│   ├── notes/           # Note CRUD, editor integration
│   ├── search/          # Search bar, results, filters
│   ├── attachments/     # Upload, preview, download
│   └── settings/        # User profile, preferences
├── hooks/               # Shared custom hooks
├── services/            # API service layer
├── stores/              # Zustand stores
├── types/               # Shared TypeScript types
├── utils/               # Pure utility functions
├── lib/                 # Third-party wrappers/config
└── pages/               # Route-level page components
```

**Why feature-based?** Co-locating related components, hooks, and services reduces cognitive load. Each feature is self-contained and can be lazy-loaded.

### 2.3 State Management Architecture

```
┌──────────────────────────────────────────────────┐
│                   React Components               │
├──────────────────────────────────────────────────┤
│ Server State (React Query)  │ Client State (Zustand) │
│ ─ Notes, Notebooks, etc.   │ ─ UI state (sidebar)    │
│ ─ Cached & synchronized    │ ─ Editor state           │
│ ─ Background refetching    │ ─ Search filters          │
│ ─ Optimistic mutations     │ ─ Toast queue             │
└──────────────────────────────────────────────────┘
```

**Decision**: Server state (API data) is managed by React Query. Client-only state (UI toggles, editor focus, sidebar collapse) is managed by Zustand. This prevents the common anti-pattern of duplicating server data into a client store.

---

## 3. Backend Architecture

### 3.1 Technology Choices

| Concern              | Choice                | Rationale                                                                |
|----------------------|-----------------------|--------------------------------------------------------------------------|
| Language             | TypeScript 5.x (Node) | Shared types with frontend, single language across stack                |
| Runtime              | Node.js 20 LTS        | Stable, async I/O, excellent for API servers                            |
| Framework            | Express 4.x           | Mature, minimal, middleware ecosystem, well-understood                   |
| API Architecture     | RESTful + JSON         | Simple, cacheable, widely supported by clients                          |
| Authentication       | Passport.js + JWT (HTTP-only cookies) | Battle-tested, strategy-based, cookie transport      |
| Authorization        | Custom RBAC middleware | Ownership + role checks per resource                                    |
| Validation           | Zod                   | Shared schemas with frontend, runtime validation                        |
| Database Access      | Prisma ORM            | Type-safe queries, migrations, schema-as-code                           |
| File Storage         | Local disk (dev) / S3-compatible (prod) | Abstracted via storage service interface            |
| Background Jobs      | BullMQ (Redis-backed)  | Reliable job queue, retries, delay, rate limiting                       |
| Caching              | Redis                 | Session store, query cache, rate limiting                               |
| Logging              | Pino                  | Structured JSON logs, fast, low overhead                                |
| Error Handling       | Custom error classes + middleware | Consistent error response format                       |
| API Documentation    | OpenAPI 3.0 (Swagger) | Auto-generated from route definitions                                   |
| Testing              | Vitest + Supertest     | Fast, compatible with frontend tooling                                  |

### 3.2 Layered Architecture

```
┌────────────────────────────────────────────────────┐
│                    Routes (HTTP)                    │
│        Define endpoints, attach middleware          │
├────────────────────────────────────────────────────┤
│                  Controllers                       │
│     Parse request, call services, send response    │
├────────────────────────────────────────────────────┤
│                   Services                         │
│         Business logic, orchestration              │
├────────────────────────────────────────────────────┤
│                 Repositories                       │
│           Database access (Prisma)                 │
├────────────────────────────────────────────────────┤
│                   Database                         │
│               PostgreSQL + Redis                   │
└────────────────────────────────────────────────────┘
```

**Why this layering?**

- **Routes** → Thin HTTP concern only. No business logic.
- **Controllers** → Request/response transformation. Calls one or more services.
- **Services** → All business rules live here. Testable without HTTP context.
- **Repositories** → Data access abstraction. Swappable for testing.

This separation means business logic can be tested independently of HTTP, and the database can be swapped without touching business rules.

### 3.3 Middleware Pipeline

```
Request
  → CORS
  → Helmet (security headers)
  → Rate limiter
  → Cookie parser
  → Body parser
  → Authentication (optional per route)
  → Authorization (per route)
  → Validation (Zod schema)
  → Controller
  → Error handler
Response
```

---

## 4. Database Architecture

### 4.1 Why PostgreSQL?

- **Relational data model**: Notes → Sections → Notebooks is inherently relational.
- **Full-text search**: Built-in `tsvector` + `tsquery` eliminates the need for Elasticsearch at MVP scale.
- **JSONB**: Rich-text content (TipTap JSON) stored as JSONB — queryable, indexable.
- **Mature**: ACID transactions, battle-tested, excellent tooling.
- **Prisma support**: First-class PostgreSQL support in Prisma.

### 4.2 Key Design Decisions

| Decision                     | Choice                          | Rationale                                                     |
|------------------------------|---------------------------------|---------------------------------------------------------------|
| Rich-text storage            | JSONB column                    | TipTap outputs JSON; JSONB is queryable and indexable         |
| Soft deletes                 | `deletedAt` timestamp           | Enables trash/restore without data loss                       |
| Timestamps                   | `createdAt`, `updatedAt`        | Audit trail, sorting, conflict detection                      |
| UUIDs                        | UUID v4 primary keys            | No sequential ID enumeration, safe for URLs                   |
| Full-text search             | PostgreSQL `tsvector` column    | Avoids external search service dependency                     |
| File metadata                | Database row + filesystem blob  | Metadata queryable; binary stored on disk/S3                  |

### 4.3 Connection Pooling

- Prisma uses a connection pool by default (pool size configurable via `DATABASE_URL`).
- In production, PgBouncer can be placed in front for additional connection management.

---

## 5. API Architecture

### 5.1 Design Principles

- **Resource-oriented URLs**: `/api/notebooks/{id}/sections`
- **Consistent response envelope**:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "page": 1, "totalPages": 10 }
  }
  ```
- **Error envelope**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "...",
      "details": [...]
    }
  }
  ```
- **Pagination**: Cursor-based for lists (performant at scale), offset-based for search results.
- **Versioning**: URL prefix `/api/v1/` — introduced only when breaking changes occur.
- **HATEOAS**: Not implemented (unnecessary complexity for SPA client).

### 5.2 API Versioning Strategy

The initial API is unversioned (`/api/`). When a breaking change is needed, the old API is preserved under `/api/v1/` and the new one under `/api/v2/`. This avoids premature versioning overhead.

---

## 6. Authentication Architecture

```
┌─────────────┐     POST /auth/login      ┌──────────────┐
│   Client    │ ──────────────────────────→│   Server     │
│   (React)   │                            │  (Express)   │
│             │ ←── Set-Cookie: token=JWT ─│              │
│             │     HttpOnly; Secure;      │              │
│             │     SameSite=Lax           │              │
├─────────────┤                            ├──────────────┤
│ Subsequent  │ ── Cookie: token=JWT ────→ │ Verify JWT   │
│ Requests    │                            │ Extract user │
│             │ ←── Response ──────────── │ Attach to req│
└─────────────┘                            └──────────────┘
```

**Why HTTP-only cookies over Authorization header?**

- JS cannot access the token → immune to XSS token theft.
- Automatic transmission → no client-side token management.
- CSRF mitigated via `SameSite=Lax` + CSRF token for mutations.

**Token strategy**:

- **Access token**: Short-lived JWT (15 min) in HTTP-only cookie.
- **Refresh token**: Longer-lived (7 days) in HTTP-only cookie, rotated on use.
- **Refresh rotation**: Each refresh invalidates the old token, preventing replay.

---

## 7. File Storage Architecture

```
┌──────────────┐    Upload    ┌──────────────┐   Store    ┌──────────────┐
│   Client     │ ───────────→ │   API        │ ────────→  │  Storage     │
│              │              │ (Multer)     │            │ (disk / S3)  │
│              │              │ Validate:    │            │              │
│              │              │  - MIME      │            │              │
│              │              │  - Size      │            │              │
│              │              │  - Extension │            │              │
└──────────────┘              └──────────────┘            └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  Database    │
                              │ (metadata)   │
                              └──────────────┘
```

**Storage service interface** abstracts the storage backend:

```typescript
interface StorageService {
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}
```

This allows switching from local disk (development) to S3 (production) without changing business logic.

---

## 8. Search Architecture

### MVP Implementation (PostgreSQL Full-Text Search)

```
┌──────────┐  GET /api/search?q=...  ┌──────────┐  ts_query  ┌──────────┐
│  Client  │ ──────────────────────→ │  API     │ ─────────→ │ Postgres │
│          │                          │          │            │ tsvector │
│          │ ←── ranked results ──── │          │ ←───────── │ GIN index│
└──────────┘                          └──────────┘            └──────────┘
```

**Why PostgreSQL FTS over Elasticsearch?**

- Zero additional infrastructure.
- Sufficient for 10K–100K notes per user.
- Built-in ranking (`ts_rank`).
- Trigram indexes for fuzzy/partial matching.
- Elasticsearch can be introduced later if needed, behind the same search service interface.

### Search features

- Full-text search on title + plaintext content (extracted from rich-text JSON).
- Tag-based filtering.
- Notebook/section scoping.
- Result ranking by relevance.
- Debounced on the client (300ms).

---

## 9. Rich-Text Architecture

### Storage Format

TipTap produces a **ProseMirror JSON document**:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "My Note" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Hello world" }]
    }
  ]
}
```

**Why JSON over HTML?**

- **Safer**: No raw HTML stored or rendered — eliminates stored XSS.
- **Structured**: Queryable, transformable, versionable.
- **Portable**: Can render to HTML, Markdown, PDF, or plain text.
- **Collaborative-ready**: ProseMirror's document model supports OT/CRDT in the future.

### Content Pipeline

```
User types → TipTap editor → ProseMirror JSON
     → Validate schema server-side
     → Store as JSONB in PostgreSQL
     → Extract plaintext → Update tsvector for search
     → Render back via TipTap on read
```

**Plaintext extraction** happens server-side on save. A utility walks the JSON tree and concatenates text nodes. This plaintext is stored in a separate column and indexed with `tsvector` for search.

---

## 10. Error Handling Architecture

### Backend Error Classes

```typescript
abstract class AppError extends Error {
  abstract statusCode: number;
  abstract code: string;
}

class NotFoundError extends AppError { statusCode = 404; code = "NOT_FOUND"; }
class ValidationError extends AppError { statusCode = 400; code = "VALIDATION_ERROR"; }
class UnauthorizedError extends AppError { statusCode = 401; code = "UNAUTHORIZED"; }
class ForbiddenError extends AppError { statusCode = 403; code = "FORBIDDEN"; }
class ConflictError extends AppError { statusCode = 409; code = "CONFLICT"; }
class RateLimitError extends AppError { statusCode = 429; code = "RATE_LIMIT_EXCEEDED"; }
```

### Global Error Middleware

All errors flow through a single Express error middleware that:

1. Logs the error (Pino).
2. Maps known `AppError` subclasses to HTTP responses.
3. Returns a generic 500 for unknown errors (no stack trace in production).
4. Includes a `requestId` for correlation.

### Frontend Error Handling

- **React Error Boundaries** catch render errors and show a fallback UI.
- **React Query `onError`** handlers show toast notifications for API failures.
- **Global Axios interceptor** handles 401 (redirect to login) and 5xx (generic toast).
- **Form validation errors** are displayed inline via React Hook Form + Zod.

---

## 11. Architectural Decisions Record (ADR)

| # | Decision | Choice | Alternatives Considered | Rationale |
|---|----------|--------|------------------------|-----------|
| 1 | Database | PostgreSQL | MongoDB, SQLite | Relational model fits; FTS built-in; Prisma support |
| 2 | ORM | Prisma | TypeORM, Knex, Drizzle | Type-safe, migrations, schema-as-code |
| 3 | Rich-text editor | TipTap | Slate.js, Quill, CKEditor | ProseMirror base, extensible, JSON output |
| 4 | Auth transport | HTTP-only cookies | Bearer token, session store | XSS-immune token transport |
| 5 | Search | PostgreSQL FTS | Elasticsearch, MeiliSearch | No extra infra; sufficient for MVP scale |
| 6 | State management | Zustand + React Query | Redux, MobX, Recoil | Minimal boilerplate, clear server/client separation |
| 7 | CSS | Vanilla CSS Modules | Tailwind, styled-components | No runtime cost, full control, scoped |
| 8 | File storage | Abstracted interface | Direct S3, Cloudinary | Flexible; local dev, S3 prod |
| 9 | Background jobs | BullMQ | Agenda, node-cron | Redis-backed, reliable, retries |
| 10 | Monorepo | Turborepo | Nx, Lerna | Fast, simple config, caching |
