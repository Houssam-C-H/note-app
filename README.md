# NoteSpace

> A modern, scalable note-taking application inspired by Microsoft OneNote.

## Overview

NoteSpace is a full-stack note-taking application built with React, TypeScript, Node.js, Express, and PostgreSQL. It features a 3-panel layout (Notebooks -> Sections -> Notes), a rich-text editor, autosave, full-text search, and secure authentication.

## Documentation

The complete architecture and technical design of NoteSpace is thoroughly documented in the `docs/` directory:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - High-level system architecture and design decisions
- [FRONTEND.md](docs/FRONTEND.md) - Frontend architecture, UI/UX, state management
- [BACKEND.md](docs/BACKEND.md) - Backend architecture, services, middleware
- [DATABASE.md](docs/DATABASE.md) - Schema design, ER diagram, indexing strategy
- [API.md](docs/API.md) - Complete REST API documentation
- [AUTHENTICATION.md](docs/AUTHENTICATION.md) - Auth flows, JWT, sessions, RBAC
- [SECURITY.md](docs/SECURITY.md) - Security posture, XSS/CSRF protection, headers
- [FILE_STORAGE.md](docs/FILE_STORAGE.md) - Upload pipelines, validation, storage abstraction
- [SEARCH.md](docs/SEARCH.md) - PostgreSQL full-text search strategy
- [AUTOSAVE.md](docs/AUTOSAVE.md) - Debounce logic, optimistic UI, conflict handling
- [OFFLINE_SYNC.md](docs/OFFLINE_SYNC.md) - IndexedDB caching and sync queue strategy
- [TESTING.md](docs/TESTING.md) - Testing strategy, coverage goals, E2E
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Docker, Nginx, CI/CD, monitoring
- [DEVELOPMENT.md](docs/DEVELOPMENT.md) - Local setup, branching strategy, code style
- [ROADMAP.md](docs/ROADMAP.md) - Phased implementation plan

## Quick Start (Development)

Please refer to [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed setup instructions.

```bash
# 1. Clone repository
git clone https://github.com/your-org/notespace.git
cd notespace

# 2. Install dependencies
npm install

# 3. Start database and redis
docker compose up -d

# 4. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 5. Start development servers
npm run dev
```

## Technologies

- **Frontend**: React 18, Vite, TypeScript, Zustand, React Query, TipTap, Radix UI
- **Backend**: Node.js 20, Express, TypeScript, Prisma, BullMQ, Pino
- **Database**: PostgreSQL 16 (Relational + JSONB + FTS), Redis 7
- **Infrastructure**: Docker, Nginx

## License

MIT
