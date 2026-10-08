# Development Guide — NoteSpace

---

## 1. Prerequisites

| Tool         | Version  | Purpose                          |
|--------------|----------|----------------------------------|
| Node.js      | 20 LTS   | JavaScript runtime               |
| npm          | 10+      | Package manager                  |
| Docker       | 24+      | Database and services            |
| Docker Compose| 2.20+   | Multi-container orchestration    |
| Git          | 2.40+    | Version control                  |

---

## 2. Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/notespace.git
cd notespace

# 2. Install dependencies
npm install          # Root (Turborepo)

# 3. Start infrastructure (PostgreSQL + Redis + MailHog)
docker compose up -d

# 4. Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 5. Run database migrations
cd backend && npx prisma migrate dev

# 6. Seed development data
cd backend && npx prisma db seed

# 7. Start development servers
cd .. && npm run dev   # Starts both frontend and backend via Turborepo
```

### Development URLs

| Service      | URL                          |
|--------------|------------------------------|
| Frontend     | http://localhost:5173        |
| Backend API  | http://localhost:3000/api    |
| MailHog UI   | http://localhost:8025        |
| Swagger UI   | http://localhost:3000/api-docs |
| PgAdmin      | Optional — connect to localhost:5432 |

---

## 3. Project Structure Overview

```
notespace/
├── frontend/              # React SPA (Vite)
├── backend/               # Express API (Node.js)
├── shared/                # Shared types and schemas (Zod)
├── docker/                # Docker configuration files
│   ├── Dockerfile         # Production multi-stage build
│   └── nginx/             # Nginx config for production
├── docs/                  # Technical documentation
├── scripts/               # Utility scripts
│   ├── backup.sh          # Database backup script
│   └── generate-secret.sh # Generate JWT secrets
├── docker-compose.yml     # Development infrastructure
├── docker-compose.prod.yml# Production deployment
├── turbo.json             # Turborepo configuration
├── package.json           # Root package.json
├── .gitignore
├── .env.example
└── README.md
```

---

## 4. Development Workflow

### Daily Workflow

```bash
# Start infrastructure
docker compose up -d

# Start dev servers (frontend + backend with hot reload)
npm run dev

# In a separate terminal: watch backend logs
npm run dev:logs
```

### Common Commands

```bash
# Frontend
cd frontend
npm run dev            # Start Vite dev server
npm run build          # Build for production
npm run test           # Run unit/component tests
npm run test:coverage  # Tests with coverage report
npm run lint           # ESLint
npm run format         # Prettier

# Backend
cd backend
npm run dev            # Start Express with nodemon
npm run build          # Compile TypeScript
npm run test           # Run unit/integration tests
npm run test:coverage  # Tests with coverage
npm run lint           # ESLint
npm run format         # Prettier

# Database
cd backend
npx prisma migrate dev        # Create + apply migration
npx prisma migrate reset      # Reset database (delete all data)
npx prisma studio             # Open Prisma Studio (visual DB editor)
npx prisma generate           # Regenerate Prisma client
npx prisma db seed             # Run seed script

# Turborepo (from root)
npm run dev            # Run all dev servers
npm run build          # Build all packages
npm run test           # Test all packages
npm run lint           # Lint all packages
npm run format         # Format all packages
```

---

## 5. Adding a New Feature

### Checklist

1. **Backend**:
   - [ ] Define Zod schema in `backend/src/schemas/`
   - [ ] Create/update Prisma model in `prisma/schema.prisma`
   - [ ] Generate migration: `npx prisma migrate dev --name feature-name`
   - [ ] Create repository in `backend/src/repositories/`
   - [ ] Create service in `backend/src/services/`
   - [ ] Create controller in `backend/src/controllers/`
   - [ ] Create route in `backend/src/routes/`
   - [ ] Register route in `backend/src/routes/index.ts`
   - [ ] Add authorization middleware if needed
   - [ ] Write unit tests for service
   - [ ] Write integration tests for endpoint

2. **Frontend**:
   - [ ] Create feature directory in `frontend/src/features/{name}/`
   - [ ] Add service functions in `features/{name}/services/`
   - [ ] Add React Query hooks in `features/{name}/hooks/`
   - [ ] Create components in `features/{name}/components/`
   - [ ] Add page component if needed
   - [ ] Add route in `App.tsx`
   - [ ] Write component tests
   - [ ] Verify responsive layout

3. **Shared**:
   - [ ] Add TypeScript types to `shared/types/`
   - [ ] Add Zod schemas to `shared/schemas/` if needed

---

## 6. Code Style

### TypeScript

- Strict mode enabled.
- No `any` — use `unknown` and narrow.
- Prefer `interface` for objects, `type` for unions/intersections.
- Use `const` assertions for literal types.
- Naming: `camelCase` for variables/functions, `PascalCase` for types/components.

### React

- Functional components only (no class components).
- Custom hooks for reusable logic.
- Avoid `useEffect` for derived state — use `useMemo` or compute inline.
- Props interfaces named `{Component}Props`.
- Event handlers named `handle{Event}` in components, `on{Event}` in props.

### CSS

- CSS Modules for component styles.
- CSS custom properties for theming.
- No magic numbers — use design system variables.
- Mobile-first responsive design.

---

## 7. Git Strategy

### Branching Model

```
main
├── develop
│   ├── feature/auth-system
│   ├── feature/notebook-crud
│   ├── feature/rich-text-editor
│   ├── fix/autosave-retry
│   └── chore/update-dependencies
└── release/v1.0.0
```

| Branch          | Purpose                              | Merges Into  |
|-----------------|--------------------------------------|--------------|
| `main`          | Production-ready code                | —            |
| `develop`       | Integration branch                   | `main`       |
| `feature/*`     | New features                         | `develop`    |
| `fix/*`         | Bug fixes                            | `develop`    |
| `chore/*`       | Maintenance, dependencies            | `develop`    |
| `release/*`     | Release preparation                  | `main`       |
| `hotfix/*`      | Critical production fixes            | `main`       |

### Commit Conventions (Conventional Commits)

```
feat: add notebook sharing functionality
fix: resolve autosave retry loop on network timeout
docs: update API documentation for search endpoint
chore: upgrade Prisma to v5.10
test: add integration tests for attachment upload
refactor: extract content validator from note service
style: format code with Prettier
perf: add GIN index for tag search
security: sanitize SVG uploads against XSS
```

### Pull Request Process

1. Create feature branch from `develop`.
2. Implement changes with tests.
3. Run `npm run lint && npm run test` locally.
4. Push and create PR to `develop`.
5. Automated CI runs (lint, test, build).
6. Code review by at least 1 reviewer.
7. Address review feedback.
8. Squash-merge into `develop`.

### Release Process

1. Create `release/vX.Y.Z` branch from `develop`.
2. Update version in `package.json`.
3. Update `CHANGELOG.md`.
4. Final testing on staging.
5. Merge into `main`.
6. Tag: `git tag vX.Y.Z`.
7. Deploy to production.
8. Merge back into `develop`.

### Versioning

- **Semantic Versioning**: `MAJOR.MINOR.PATCH`
- `MAJOR`: Breaking API changes.
- `MINOR`: New features, backward-compatible.
- `PATCH`: Bug fixes, backward-compatible.

---

## 8. IDE Setup

### VS Code Extensions (Recommended)

- ESLint
- Prettier
- Prisma
- TypeScript Hero
- CSS Modules
- GitLens
- Docker
- Thunder Client (API testing)

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

---

## 9. Troubleshooting

| Problem                           | Solution                                        |
|-----------------------------------|-------------------------------------------------|
| `prisma migrate dev` fails        | Check DATABASE_URL in .env; ensure Docker is running |
| Port 3000 already in use          | `npx kill-port 3000` or change API_PORT in .env |
| Port 5173 already in use          | `npx kill-port 5173`                            |
| Redis connection refused          | Check Docker: `docker compose ps`               |
| Hot reload not working            | Check file watchers limit; restart Vite          |
| TypeScript errors after schema change | Run `npx prisma generate`                   |
| CORS errors in browser            | Check APP_URL matches frontend URL               |
| Cookies not being set             | Ensure SameSite, Secure, and domain match        |
| Email not sending                 | Check MailHog at http://localhost:8025            |
| Out of memory (Node)              | Increase `--max-old-space-size` in nodemon config|
