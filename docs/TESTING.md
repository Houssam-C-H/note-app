# Testing Strategy — NoteSpace

---

## 1. Testing Philosophy

- **Test behavior, not implementation**: Tests verify what the system does, not how it does it.
- **Meaningful coverage over 100% coverage**: Focus on critical paths, edge cases, and regression-prone areas.
- **Testing pyramid**: Many unit tests, fewer integration tests, minimal E2E tests.
- **Tests are documentation**: Well-named tests describe the system's expected behavior.

---

## 2. Testing Pyramid

```
        ╱╲
       ╱  ╲
      ╱ E2E╲          5–10 critical user journeys
     ╱──────╲          (Playwright)
    ╱        ╲
   ╱Integration╲      30–50 API endpoint tests
  ╱──────────────╲     (Vitest + Supertest)
 ╱                ╲
╱   Unit Tests     ╲   100+ tests for services, utils, schemas
╱────────────────────╲  (Vitest)
```

---

## 3. Coverage Targets

| Layer              | Target Coverage | Focus Areas                              |
|--------------------|-----------------|------------------------------------------|
| Backend Services   | 80%+            | Business logic, edge cases               |
| Backend Utils      | 90%+            | Pure functions, parsers, validators      |
| Backend Schemas    | 95%+            | All validation rules                     |
| Backend Controllers| 60%+            | Via integration tests                    |
| Backend Middleware | 80%+            | Auth, authorization, error handling      |
| Frontend Hooks     | 70%+            | State management, side effects           |
| Frontend Utils     | 90%+            | Pure functions                           |
| Frontend Components| 50%+            | Interactive components, forms            |
| E2E                | N/A             | Critical user journeys (not % based)     |

---

## 4. Unit Tests

### Backend Unit Tests

#### Services

```typescript
// note.service.test.ts
describe('NoteService', () => {
  describe('createNote', () => {
    it('creates a note with valid data');
    it('extracts plaintext from rich content');
    it('sets default title as "Untitled" when title is empty');
    it('throws NotFoundError when section does not exist');
    it('throws ForbiddenError when user has no access to section');
    it('creates audit log entry');
  });
  
  describe('updateNote', () => {
    it('updates note content');
    it('regenerates plaintext on content change');
    it('updates lastEditedAt on content change');
    it('does not update lastEditedAt on metadata-only change');
    it('throws NotFoundError for non-existent note');
    it('throws ForbiddenError for unauthorized user');
    it('throws ConflictError when note was modified by another session');
  });
  
  describe('deleteNote', () => {
    it('soft-deletes note (sets deletedAt)');
    it('only owner can delete');
    it('shared users cannot delete');
  });
  
  describe('restoreNote', () => {
    it('clears deletedAt on soft-deleted note');
    it('throws NotFoundError for non-deleted note');
  });
});
```

#### Utilities

```typescript
// contentParser.test.ts
describe('extractPlaintext', () => {
  it('extracts text from simple paragraph');
  it('extracts text from nested headings');
  it('handles empty document');
  it('handles document with only images');
  it('concatenates text from multiple paragraphs');
  it('preserves spaces between blocks');
  it('ignores formatting marks (bold, italic)');
});

// contentValidator.test.ts
describe('validateContent', () => {
  it('accepts valid ProseMirror JSON');
  it('rejects invalid node types');
  it('rejects script nodes');
  it('rejects javascript: URLs in links');
  it('accepts http/https URLs in links');
  it('rejects deeply nested documents (max depth: 10)');
});
```

#### Schemas

```typescript
// auth.schema.test.ts
describe('registerSchema', () => {
  it('accepts valid registration data');
  it('rejects email without domain');
  it('rejects password shorter than 8 chars');
  it('rejects password without uppercase letter');
  it('rejects password without special character');
  it('rejects displayName shorter than 2 chars');
  it('rejects displayName longer than 100 chars');
  it('normalizes email to lowercase');
  it('trims whitespace from displayName');
});
```

### Frontend Unit Tests

#### Hooks

```typescript
// useAutosave.test.ts
describe('useAutosave', () => {
  it('saves after debounce delay');
  it('does not save if content unchanged');
  it('retries on save failure');
  it('shows error after 3 failed retries');
  it('flushes save on unmount');
  it('cancels previous save when new save triggers');
});

// useDebounce.test.ts
describe('useDebounce', () => {
  it('delays value update by specified ms');
  it('resets timer on new value');
  it('returns latest value after delay');
});
```

#### Utils

```typescript
// formatDate.test.ts
describe('formatDate', () => {
  it('shows "Just now" for < 1 minute');
  it('shows "5 minutes ago" for recent');
  it('shows "2 hours ago" for same day');
  it('shows "Yesterday" for previous day');
  it('shows full date for older');
});
```

---

## 5. Integration Tests

### API Endpoint Tests (Supertest)

```typescript
// auth.test.ts
describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('creates user and returns 201');
    it('returns 409 for duplicate email');
    it('returns 400 for invalid email');
    it('returns 400 for weak password');
    it('hashes password (not stored in plaintext)');
    it('sends verification email');
  });
  
  describe('POST /api/auth/login', () => {
    it('returns 200 and sets cookies for valid credentials');
    it('returns 401 for invalid password');
    it('returns 401 for non-existent email');
    it('returns same error for invalid email and invalid password');
    it('sets HttpOnly cookies');
    it('creates session record');
  });
  
  describe('POST /api/auth/logout', () => {
    it('clears cookies');
    it('deletes session record');
    it('returns 401 if not authenticated');
  });
});

// notebooks.test.ts
describe('Notebooks API', () => {
  describe('GET /api/notebooks', () => {
    it('returns only user\'s notebooks');
    it('includes shared notebooks');
    it('excludes archived by default');
    it('includes archived when requested');
    it('returns 401 if not authenticated');
  });
  
  describe('POST /api/notebooks', () => {
    it('creates notebook and returns 201');
    it('returns 400 for empty title');
    it('sets correct owner');
  });
  
  describe('DELETE /api/notebooks/:id', () => {
    it('soft-deletes notebook');
    it('returns 404 for non-existent');
    it('returns 403 for non-owner');
    it('cascades soft-delete to sections and notes');
  });
});

// notes.test.ts
describe('Notes API', () => {
  describe('PATCH /api/notes/:id', () => {
    it('updates content and returns 200');
    it('updates lastEditedAt on content change');
    it('regenerates plaintext for search');
    it('returns 403 for read-only shared user');
    it('returns 404 for non-existent note');
    it('returns 409 for conflict (stale updatedAt)');
  });
  
  describe('Authorization', () => {
    it('owner can read, edit, delete');
    it('EDIT shared user can read and edit');
    it('READ shared user can only read');
    it('unshared user gets 404 (not 403)');
    it('notebook share cascades to all notes in notebook');
  });
});

// search.test.ts
describe('Search API', () => {
  describe('GET /api/search', () => {
    it('returns matching notes ranked by relevance');
    it('matches by title (higher weight)');
    it('matches by content');
    it('supports prefix search');
    it('filters by notebook');
    it('filters by section');
    it('filters by tags');
    it('does not return deleted notes');
    it('does not return other users\' notes');
    it('includes shared notes in results');
    it('returns highlighted preview');
    it('paginates results');
    it('returns 400 for query shorter than 2 chars');
  });
});

// attachments.test.ts
describe('Attachments API', () => {
  describe('POST /api/notes/:noteId/attachments', () => {
    it('uploads valid file and returns 201');
    it('rejects files exceeding size limit');
    it('rejects disallowed MIME types');
    it('rejects MIME-spoofed files (wrong magic bytes)');
    it('generates UUID filename');
    it('returns 403 for read-only shared user');
  });
  
  describe('GET /api/attachments/:id/download', () => {
    it('returns file with correct Content-Type');
    it('sets Content-Disposition header');
    it('returns 404 for non-existent attachment');
    it('returns 403 for unauthorized user');
  });
});
```

### Test Database Setup

```typescript
// tests/helpers/testDb.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } }
});

export async function resetDatabase() {
  // Delete all data in reverse dependency order
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.noteTag.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.noteShare.deleteMany(),
    prisma.notebookShare.deleteMany(),
    prisma.note.deleteMany(),
    prisma.section.deleteMany(),
    prisma.notebook.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.session.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.emailVerification.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function createTestUser(overrides = {}) {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: await hashPassword('TestP@ss123'),
      displayName: 'Test User',
      emailVerified: true,
      ...overrides,
    },
  });
}
```

---

## 6. End-to-End Tests (Playwright)

### Critical User Journeys

```typescript
// e2e/auth.spec.ts
test.describe('Authentication Flow', () => {
  test('user can register, verify email, and login', async ({ page }) => {
    // Navigate to register page
    // Fill form with valid data
    // Submit form
    // Verify success message
    // Click verification link (mock email)
    // Login with credentials
    // Verify dashboard is shown
  });
  
  test('user cannot login with wrong password', async ({ page }) => {
    // Attempt login with wrong password
    // Verify error message is shown
    // Verify user stays on login page
  });
});

// e2e/notes.spec.ts
test.describe('Note Lifecycle', () => {
  test('complete note workflow', async ({ page }) => {
    // Login
    // Create notebook
    // Create section in notebook
    // Create note in section
    // Type content in editor
    // Wait for autosave
    // Verify "Saved" status
    // Search for note
    // Verify note appears in results
    // Pin note
    // Verify note appears in pinned list
    // Add tag to note
    // Delete note
    // Verify note is in trash
    // Restore note
    // Verify note is back
  });
});

// e2e/editor.spec.ts
test.describe('Rich Text Editor', () => {
  test('formatting toolbar works', async ({ page }) => {
    // Type text
    // Select text
    // Click bold button
    // Verify text is bold
    // Click heading dropdown
    // Select H1
    // Verify heading is applied
    // Create checklist
    // Toggle checkbox
    // Insert link
    // Verify link is clickable
  });
});

// e2e/sharing.spec.ts
test.describe('Sharing', () => {
  test('share note with another user', async ({ page }) => {
    // User A: create and share note with User B
    // User B: verify shared note appears
    // User B (with EDIT): can modify note
    // User B (with READ): cannot modify note
    // User A: revoke share
    // User B: no longer sees note
  });
});

// e2e/mobile.spec.ts
test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  test('navigation works on mobile', async ({ page }) => {
    // Verify single-panel layout
    // Navigate notebooks → sections → notes → editor
    // Use back button to navigate up
    // Open menu
    // Search for note
  });
});
```

---

## 7. Test Configuration

### Vitest Config (Backend)

```typescript
// backend/vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/**/*.d.ts'],
    },
  },
});
```

### Playwright Config

```typescript
// frontend/playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 8. Running Tests

```bash
# Backend unit + integration tests
cd backend && npm test

# Backend with coverage
cd backend && npm run test:coverage

# Frontend unit + component tests
cd frontend && npm test

# Frontend with coverage
cd frontend && npm run test:coverage

# E2E tests (requires running backend + frontend)
cd frontend && npx playwright test

# E2E with UI mode (development)
cd frontend && npx playwright test --ui

# All tests
npm run test:all   # (turborepo runs all packages)
```

---

## 9. CI Pipeline Testing

```yaml
# Simplified CI test stage
test:
  - Install dependencies
  - Run linting (ESLint + Prettier check)
  - Run backend unit tests with coverage
  - Run frontend unit tests with coverage
  - Start test database (Docker PostgreSQL + Redis)
  - Run database migrations
  - Run backend integration tests
  - Build frontend
  - Run E2E tests (Playwright against built frontend + running backend)
  - Upload coverage reports
  - Fail on coverage threshold violations
```

---

## 10. Test Data Management

### Factories

```typescript
// tests/helpers/factories.ts
export function buildUser(overrides: Partial<User> = {}): CreateUserInput {
  return {
    email: `user-${randomUUID().slice(0, 8)}@example.com`,
    password: 'TestP@ss123',
    displayName: 'Test User',
    ...overrides,
  };
}

export function buildNotebook(overrides: Partial<Notebook> = {}) {
  return {
    title: `Notebook ${Date.now()}`,
    color: '#6366f1',
    icon: 'notebook',
    ...overrides,
  };
}

export function buildNote(overrides: Partial<Note> = {}) {
  return {
    title: `Note ${Date.now()}`,
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] },
      ],
    },
    ...overrides,
  };
}
```

### Seed Data

```typescript
// prisma/seed.ts — Development seed data only
// Creates sample notebooks, sections, notes, and tags for development/demo purposes
// Never runs in production
```
