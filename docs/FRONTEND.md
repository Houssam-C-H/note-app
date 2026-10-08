# Frontend Documentation — NoteSpace

---

## 1. Technology Stack

| Concern              | Technology           | Version  |
|----------------------|----------------------|----------|
| Language             | TypeScript           | 5.x      |
| Framework            | React                | 18+      |
| Build Tool           | Vite                 | 5+       |
| UI Primitives        | Radix UI             | Latest   |
| Icons                | Lucide React         | Latest   |
| CSS                  | Vanilla CSS Modules  | —        |
| State (Client)       | Zustand              | 4.x      |
| State (Server)       | TanStack React Query | 5.x      |
| Routing              | React Router         | 6.x      |
| Forms                | React Hook Form      | 7.x      |
| Validation           | Zod                  | 3.x      |
| Rich-Text Editor     | TipTap               | 2.x      |
| HTTP Client          | Axios                | 1.x      |
| Date Handling        | date-fns             | 3.x      |
| Testing (Unit)       | Vitest               | 1.x      |
| Testing (Component)  | Testing Library      | Latest   |
| Testing (E2E)        | Playwright           | Latest   |
| Linting              | ESLint               | 8.x      |
| Formatting           | Prettier             | 3.x      |

---

## 2. Project Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   └── manifest.json
│
├── src/
│   ├── components/                    # Shared, reusable UI components
│   │   ├── ui/                        # Design system primitives
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.module.css
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Toast/
│   │   │   ├── Dropdown/
│   │   │   ├── Avatar/
│   │   │   ├── Badge/
│   │   │   ├── Spinner/
│   │   │   ├── Skeleton/
│   │   │   ├── EmptyState/
│   │   │   ├── ConfirmDialog/
│   │   │   └── SearchInput/
│   │   │
│   │   ├── editor/                    # Rich-text editor components
│   │   │   ├── Editor.tsx             # Main TipTap editor wrapper
│   │   │   ├── EditorToolbar.tsx      # Formatting toolbar
│   │   │   ├── EditorBubbleMenu.tsx   # Floating format menu
│   │   │   ├── extensions/            # Custom TipTap extensions
│   │   │   │   ├── checklist.ts
│   │   │   │   ├── image-upload.ts
│   │   │   │   └── file-attachment.ts
│   │   │   └── Editor.module.css
│   │   │
│   │   └── layout/                    # Layout shell components
│   │       ├── AppShell.tsx           # Main 3-panel layout
│   │       ├── Header.tsx             # Top bar (search, user menu)
│   │       ├── Sidebar.tsx            # Notebook sidebar
│   │       ├── SectionTabs.tsx        # Section navigation
│   │       ├── NoteList.tsx           # Note list panel
│   │       └── Layout.module.css
│   │
│   ├── features/                      # Feature modules (domain-specific)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   ├── ForgotPasswordForm.tsx
│   │   │   │   └── ResetPasswordForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useSession.ts
│   │   │   └── services/
│   │   │       └── authService.ts
│   │   │
│   │   ├── notebooks/
│   │   │   ├── components/
│   │   │   │   ├── NotebookList.tsx
│   │   │   │   ├── NotebookItem.tsx
│   │   │   │   ├── CreateNotebookDialog.tsx
│   │   │   │   └── NotebookContextMenu.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useNotebooks.ts
│   │   │   │   └── useNotebookMutations.ts
│   │   │   └── services/
│   │   │       └── notebookService.ts
│   │   │
│   │   ├── sections/
│   │   │   ├── components/
│   │   │   │   ├── SectionList.tsx
│   │   │   │   ├── SectionTab.tsx
│   │   │   │   └── CreateSectionDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSections.ts
│   │   │   └── services/
│   │   │       └── sectionService.ts
│   │   │
│   │   ├── notes/
│   │   │   ├── components/
│   │   │   │   ├── NoteListItem.tsx
│   │   │   │   ├── NoteEditor.tsx
│   │   │   │   ├── NoteHeader.tsx
│   │   │   │   ├── NoteMetadata.tsx
│   │   │   │   ├── NoteTagManager.tsx
│   │   │   │   └── MoveNoteDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useNotes.ts
│   │   │   │   ├── useNote.ts
│   │   │   │   ├── useNoteMutations.ts
│   │   │   │   └── useAutosave.ts
│   │   │   └── services/
│   │   │       └── noteService.ts
│   │   │
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── SearchResults.tsx
│   │   │   │   ├── SearchFilters.tsx
│   │   │   │   └── SearchResultItem.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSearch.ts
│   │   │   └── services/
│   │   │       └── searchService.ts
│   │   │
│   │   ├── attachments/
│   │   │   ├── components/
│   │   │   │   ├── AttachmentList.tsx
│   │   │   │   ├── AttachmentItem.tsx
│   │   │   │   ├── UploadButton.tsx
│   │   │   │   └── ImagePreview.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAttachments.ts
│   │   │   └── services/
│   │   │       └── attachmentService.ts
│   │   │
│   │   ├── sharing/
│   │   │   ├── components/
│   │   │   │   ├── ShareDialog.tsx
│   │   │   │   ├── ShareList.tsx
│   │   │   │   └── PermissionSelect.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSharing.ts
│   │   │   └── services/
│   │   │       └── sharingService.ts
│   │   │
│   │   ├── trash/
│   │   │   ├── components/
│   │   │   │   ├── TrashList.tsx
│   │   │   │   └── TrashItem.tsx
│   │   │   └── hooks/
│   │   │       └── useTrash.ts
│   │   │
│   │   └── settings/
│   │       ├── components/
│   │       │   ├── ProfileSettings.tsx
│   │       │   ├── AccountSettings.tsx
│   │       │   ├── AppearanceSettings.tsx
│   │       │   └── SessionManager.tsx
│   │       └── hooks/
│   │           └── useSettings.ts
│   │
│   ├── hooks/                         # Shared custom hooks
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useClickOutside.ts
│   │   ├── useKeyboardShortcut.ts
│   │   ├── useOnlineStatus.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── services/                      # API layer
│   │   ├── api.ts                     # Axios instance + interceptors
│   │   └── queryClient.ts            # React Query configuration
│   │
│   ├── stores/                        # Zustand client state
│   │   ├── uiStore.ts                 # Sidebar state, active panels
│   │   ├── editorStore.ts             # Current editor state
│   │   └── toastStore.ts             # Toast notification queue
│   │
│   ├── types/                         # Shared TypeScript types
│   │   ├── api.ts                     # API response types
│   │   ├── models.ts                  # Domain model types
│   │   ├── editor.ts                  # Editor-specific types
│   │   └── common.ts                  # Shared utility types
│   │
│   ├── utils/                         # Pure utility functions
│   │   ├── cn.ts                      # className merger
│   │   ├── formatDate.ts
│   │   ├── truncateText.ts
│   │   ├── extractPlaintext.ts        # Extract text from ProseMirror JSON
│   │   └── validation.ts             # Shared Zod schemas
│   │
│   ├── lib/                           # Third-party configuration
│   │   ├── axios.ts
│   │   └── editor.ts                  # TipTap editor configuration
│   │
│   ├── pages/                         # Route-level page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── VerifyEmailPage.tsx
│   │   ├── DashboardPage.tsx          # Main app (3-panel layout)
│   │   ├── SettingsPage.tsx
│   │   ├── TrashPage.tsx
│   │   ├── SharedPage.tsx
│   │   ├── FavoritesPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── styles/                        # Global styles
│   │   ├── globals.css                # CSS custom properties, resets
│   │   ├── typography.css             # Font imports, text styles
│   │   └── animations.css            # Shared keyframe animations
│   │
│   ├── App.tsx                        # Root component + router
│   ├── main.tsx                       # Entry point
│   └── vite-env.d.ts                 # Vite type declarations
│
├── tests/
│   ├── setup.ts                       # Test configuration
│   ├── helpers/                       # Test utilities
│   └── e2e/                           # Playwright E2E tests
│       ├── auth.spec.ts
│       ├── notebooks.spec.ts
│       ├── notes.spec.ts
│       └── search.spec.ts
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── eslint.config.js
├── prettier.config.js
├── playwright.config.ts
└── package.json
```

---

## 3. UI/UX Design

### 3.1 Main Layout — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ 🔍 Search...                        👤 Jane Doe  ⚙️ ☰     │
├────────┬───────────────┬───────────────────────────────────┤
│        │               │                                   │
│ 📓     │ 📋 Section A  │ 📝 Note Title                     │
│ Work   │ 📋 Section B  │ ─────────────────────────────     │
│        │ 📋 Section C  │                                   │
│ 📓     │ + New Section │ [B] [I] [U] [H] [📎] [🖼️]      │
│ Personal│              │                                   │
│        │               │ Rich text editor content area     │
│ 📓     │               │ with full formatting support...   │
│ Projects│              │                                   │
│        │               │                                   │
│ 📁     │               │                                   │
│ Shared │               │                                   │
│        │               │                                   │
│ 🗑️    │               │ ─────────────────────────────     │
│ Trash  │               │ Tags: [work] [meeting] [+]       │
│        │               │ 📎 2 attachments                  │
│ + New  │               │ Saved ✓  •  Last edited 2m ago   │
├────────┴───────────────┴───────────────────────────────────┤
│                                            NoteSpace v1.0  │
└────────────────────────────────────────────────────────────┘
```

**3-panel layout**:
- **Left panel (240px)**: Notebook list, navigation (Favorites, Shared, Trash)
- **Center panel (280px)**: Section tabs + note list within selected section
- **Right panel (remaining)**: Note editor with toolbar

### 3.2 Tablet Layout (768px–1023px)

- Left panel collapses to icons (60px) with tooltip labels.
- Center and right panels share remaining space.
- Hamburger menu reveals full left panel as overlay.

### 3.3 Mobile Layout (<768px)

- **Single-panel navigation**: Only one panel visible at a time.
- **Stack navigation**: Notebooks → Sections → Notes → Editor
- **Back button** navigation between panels.
- **Swipe gestures** for panel transitions.
- **Floating action button** for creating new items.
- **Bottom navigation bar** for quick access (Notebooks, Favorites, Search, Settings).

### 3.4 Design System

#### Color Palette (Dark Theme — Default)

```css
:root {
  /* Background */
  --bg-primary: hsl(225, 20%, 8%);        /* Main background */
  --bg-secondary: hsl(225, 18%, 12%);      /* Panels */
  --bg-tertiary: hsl(225, 16%, 16%);       /* Cards, inputs */
  --bg-elevated: hsl(225, 14%, 20%);       /* Hover states */
  
  /* Text */
  --text-primary: hsl(220, 20%, 92%);      /* Main text */
  --text-secondary: hsl(220, 15%, 65%);    /* Secondary text */
  --text-tertiary: hsl(220, 10%, 45%);     /* Placeholder */
  
  /* Accent */
  --accent-primary: hsl(245, 80%, 65%);    /* Primary actions */
  --accent-hover: hsl(245, 80%, 72%);      /* Hover state */
  --accent-subtle: hsl(245, 60%, 15%);     /* Subtle backgrounds */
  
  /* Semantic */
  --success: hsl(152, 60%, 50%);
  --warning: hsl(38, 90%, 60%);
  --error: hsl(0, 75%, 60%);
  --info: hsl(210, 80%, 60%);
  
  /* Borders */
  --border-subtle: hsl(225, 15%, 18%);
  --border-default: hsl(225, 15%, 22%);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px hsl(0 0% 0% / 0.3);
  --shadow-md: 0 4px 12px hsl(0 0% 0% / 0.4);
  --shadow-lg: 0 8px 24px hsl(0 0% 0% / 0.5);
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

#### Light Theme Override

```css
[data-theme="light"] {
  --bg-primary: hsl(220, 20%, 97%);
  --bg-secondary: hsl(220, 18%, 100%);
  --bg-tertiary: hsl(220, 15%, 95%);
  --bg-elevated: hsl(220, 12%, 90%);
  --text-primary: hsl(220, 20%, 12%);
  --text-secondary: hsl(220, 15%, 40%);
  --text-tertiary: hsl(220, 10%, 60%);
  --border-subtle: hsl(220, 15%, 90%);
  --border-default: hsl(220, 15%, 85%);
  --shadow-sm: 0 1px 2px hsl(0 0% 0% / 0.05);
  --shadow-md: 0 4px 12px hsl(0 0% 0% / 0.08);
  --shadow-lg: 0 8px 24px hsl(0 0% 0% / 0.12);
}
```

### 3.5 UI States

| State         | Visual Treatment                                       |
|---------------|-------------------------------------------------------|
| Loading       | Skeleton placeholders matching content layout          |
| Empty         | Illustration + descriptive text + primary action CTA   |
| Error         | Error message + retry button + help link               |
| Saving        | Subtle spinner in header + "Saving..." text            |
| Saved         | Checkmark icon + "Saved" text (fades after 2s)        |
| Save Failed   | Warning icon + "Save failed" + retry link              |
| Offline       | Banner at top: "You're offline. Changes saved locally" |
| Confirmation  | Modal dialog with destructive action warning           |
| Toast         | Slide-in notification from bottom-right (auto-dismiss) |

### 3.6 Keyboard Shortcuts

| Shortcut       | Action                    |
|----------------|---------------------------|
| `Ctrl+N`       | New note                  |
| `Ctrl+S`       | Force save                |
| `Ctrl+F`       | Focus search              |
| `Ctrl+B`       | Bold                      |
| `Ctrl+I`       | Italic                    |
| `Ctrl+U`       | Underline                 |
| `Ctrl+Shift+X` | Strikethrough             |
| `Ctrl+Shift+7` | Ordered list              |
| `Ctrl+Shift+8` | Bullet list               |
| `Ctrl+Shift+9` | Checklist                 |
| `Ctrl+K`       | Insert link               |
| `Ctrl+Z`       | Undo                      |
| `Ctrl+Shift+Z` | Redo                      |
| `Ctrl+\`       | Toggle sidebar            |
| `Delete`       | Delete selected item      |
| `Escape`       | Close dialog / deselect   |

### 3.7 Responsive Breakpoints

```css
/* Mobile first approach */
@media (min-width: 640px)  { /* sm  — small tablets */ }
@media (min-width: 768px)  { /* md  — tablets */ }
@media (min-width: 1024px) { /* lg  — desktop */ }
@media (min-width: 1280px) { /* xl  — large desktop */ }
@media (min-width: 1536px) { /* 2xl — ultrawide */ }
```

---

## 4. Routing

```typescript
const routes = [
  // Public routes
  { path: '/login',           element: <LoginPage /> },
  { path: '/register',        element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password',  element: <ResetPasswordPage /> },
  { path: '/verify-email',    element: <VerifyEmailPage /> },

  // Protected routes (require authentication)
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true,                        element: <DashboardPage /> },
      { path: 'notebooks/:notebookId',      element: <DashboardPage /> },
      { path: 'notebooks/:notebookId/sections/:sectionId', element: <DashboardPage /> },
      { path: 'notes/:noteId',              element: <DashboardPage /> },
      { path: 'favorites',                  element: <FavoritesPage /> },
      { path: 'shared',                     element: <SharedPage /> },
      { path: 'trash',                      element: <TrashPage /> },
      { path: 'settings',                   element: <SettingsPage /> },
      { path: 'settings/profile',           element: <SettingsPage /> },
      { path: 'settings/account',           element: <SettingsPage /> },
      { path: 'settings/appearance',        element: <SettingsPage /> },
      { path: 'settings/sessions',          element: <SettingsPage /> },
    ]
  },

  // Catch-all
  { path: '*', element: <NotFoundPage /> }
];
```

---

## 5. Component Design Principles

1. **Composition over configuration**: Components accept `children` and `render props` over excessive `prop` APIs.
2. **Controlled when external state matters, uncontrolled otherwise**: Forms use React Hook Form (uncontrolled) for performance.
3. **Accessible by default**: Radix UI primitives handle ARIA, focus management, and keyboard navigation.
4. **CSS Modules for scoping**: Every component with custom styles uses a `.module.css` file.
5. **Barrel exports**: Every component directory has an `index.ts` for clean imports.
6. **No business logic in UI components**: Components call hooks that call services. Components render data and handle events.

---

## 6. Error Boundary Strategy

```
<App>
  <GlobalErrorBoundary>        ← Catches catastrophic errors
    <Router>
      <AppShell>
        <Sidebar />
        <FeatureErrorBoundary>  ← Catches feature-level errors
          <Outlet />            ← Route content
        </FeatureErrorBoundary>
      </AppShell>
    </Router>
  </GlobalErrorBoundary>
</App>
```

- **Global boundary**: Shows "Something went wrong" with a reload button.
- **Feature boundary**: Shows an error message within the panel, rest of the app remains functional.
- **React Query errors**: Handled via `onError` callbacks → toast notifications.
