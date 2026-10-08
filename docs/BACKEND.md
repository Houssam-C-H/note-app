# Backend Documentation — NoteSpace

---

## 1. Technology Stack

| Concern              | Technology           | Version  |
|----------------------|----------------------|----------|
| Runtime              | Node.js              | 20 LTS   |
| Language             | TypeScript           | 5.x      |
| Framework            | Express              | 4.x      |
| ORM                  | Prisma               | 5.x      |
| Database             | PostgreSQL           | 16       |
| Cache / Sessions     | Redis                | 7.x      |
| Job Queue            | BullMQ               | 5.x      |
| Authentication       | jsonwebtoken + argon2| Latest   |
| Validation           | Zod                  | 3.x      |
| File Upload          | Multer               | 1.x      |
| Logging              | Pino                 | 8.x      |
| Security Headers     | Helmet               | 7.x      |
| CORS                 | cors                 | 2.x      |
| Rate Limiting        | express-rate-limit   | 7.x      |
| API Documentation    | swagger-jsdoc + swagger-ui-express | Latest |
| Testing              | Vitest + Supertest   | Latest   |
| Linting              | ESLint               | 8.x      |
| Formatting           | Prettier             | 3.x      |

---

## 2. Project Structure

```
backend/
├── src/
│   ├── config/                        # Application configuration
│   │   ├── index.ts                   # Central config loader (reads env vars)
│   │   ├── database.ts                # Prisma client initialization
│   │   ├── redis.ts                   # Redis client initialization
│   │   ├── storage.ts                 # Storage service factory
│   │   └── queue.ts                   # BullMQ queue configuration
│   │
│   ├── middleware/                     # Express middleware
│   │   ├── authenticate.ts            # JWT verification, attach req.user
│   │   ├── authorize.ts               # Resource-level permission checks
│   │   ├── validate.ts                # Zod schema validation middleware
│   │   ├── rateLimiter.ts             # Rate limiting configuration
│   │   ├── errorHandler.ts            # Global error handling middleware
│   │   ├── requestId.ts               # Attach unique request ID
│   │   ├── requestLogger.ts           # HTTP request logging (Pino)
│   │   └── upload.ts                  # Multer file upload configuration
│   │
│   ├── routes/                        # Route definitions
│   │   ├── index.ts                   # Route aggregator
│   │   ├── auth.routes.ts             # /api/auth/*
│   │   ├── user.routes.ts             # /api/users/*
│   │   ├── notebook.routes.ts         # /api/notebooks/*
│   │   ├── section.routes.ts          # /api/sections/*
│   │   ├── note.routes.ts             # /api/notes/*
│   │   ├── tag.routes.ts              # /api/tags/*
│   │   ├── attachment.routes.ts       # /api/attachments/*
│   │   ├── search.routes.ts           # /api/search
│   │   ├── share.routes.ts            # /api/shared/*
│   │   └── trash.routes.ts            # /api/trash/*
│   │
│   ├── controllers/                   # Request/response handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── notebook.controller.ts
│   │   ├── section.controller.ts
│   │   ├── note.controller.ts
│   │   ├── tag.controller.ts
│   │   ├── attachment.controller.ts
│   │   ├── search.controller.ts
│   │   ├── share.controller.ts
│   │   └── trash.controller.ts
│   │
│   ├── services/                      # Business logic layer
│   │   ├── auth.service.ts            # Login, register, token management
│   │   ├── user.service.ts            # Profile management
│   │   ├── notebook.service.ts        # Notebook CRUD + business rules
│   │   ├── section.service.ts         # Section CRUD
│   │   ├── note.service.ts            # Note CRUD + autosave + content processing
│   │   ├── tag.service.ts             # Tag management
│   │   ├── attachment.service.ts      # File upload/download logic
│   │   ├── search.service.ts          # Full-text search queries
│   │   ├── share.service.ts           # Sharing and permission management
│   │   ├── storage.service.ts         # File storage abstraction
│   │   ├── email.service.ts           # Email sending (password reset, etc.)
│   │   ├── audit.service.ts           # Audit log creation
│   │   └── content.service.ts         # Rich-text content validation + plaintext extraction
│   │
│   ├── repositories/                  # Data access layer (Prisma queries)
│   │   ├── user.repository.ts
│   │   ├── notebook.repository.ts
│   │   ├── section.repository.ts
│   │   ├── note.repository.ts
│   │   ├── tag.repository.ts
│   │   ├── attachment.repository.ts
│   │   ├── session.repository.ts
│   │   ├── share.repository.ts
│   │   └── audit.repository.ts
│   │
│   ├── schemas/                       # Zod validation schemas
│   │   ├── auth.schema.ts             # Login, register, password reset schemas
│   │   ├── user.schema.ts             # Profile update schemas
│   │   ├── notebook.schema.ts         # Notebook create/update schemas
│   │   ├── section.schema.ts          # Section schemas
│   │   ├── note.schema.ts             # Note create/update schemas
│   │   ├── tag.schema.ts              # Tag schemas
│   │   ├── search.schema.ts           # Search query schemas
│   │   ├── share.schema.ts            # Share schemas
│   │   └── common.schema.ts           # Shared schemas (UUID, pagination)
│   │
│   ├── errors/                        # Custom error classes
│   │   ├── AppError.ts                # Base error class
│   │   ├── NotFoundError.ts
│   │   ├── ValidationError.ts
│   │   ├── UnauthorizedError.ts
│   │   ├── ForbiddenError.ts
│   │   ├── ConflictError.ts
│   │   └── RateLimitError.ts
│   │
│   ├── jobs/                          # Background job processors
│   │   ├── emailJob.ts                # Send emails (password reset, verification)
│   │   ├── cleanupJob.ts             # Purge expired sessions, old audit logs
│   │   └── orphanFileJob.ts          # Clean up orphaned attachments
│   │
│   ├── types/                         # TypeScript type definitions
│   │   ├── express.d.ts               # Express request augmentation (req.user)
│   │   ├── models.ts                  # Domain model types
│   │   └── common.ts                  # Shared utility types
│   │
│   ├── utils/                         # Utility functions
│   │   ├── hash.ts                    # Argon2 hashing helpers
│   │   ├── jwt.ts                     # JWT sign/verify helpers
│   │   ├── crypto.ts                  # Secure random token generation
│   │   ├── contentParser.ts           # ProseMirror JSON → plaintext
│   │   ├── contentValidator.ts        # ProseMirror JSON schema validation
│   │   ├── fileValidator.ts           # MIME type + magic byte validation
│   │   ├── sanitize.ts               # Input sanitization helpers
│   │   ├── pagination.ts             # Cursor/offset pagination helpers
│   │   └── response.ts               # Standard response envelope builders
│   │
│   ├── app.ts                         # Express app setup (middleware, routes)
│   └── server.ts                      # HTTP server startup
│
├── prisma/
│   ├── schema.prisma                  # Database schema definition
│   ├── migrations/                    # Auto-generated migration files
│   └── seed.ts                        # Development seed data
│
├── tests/
│   ├── setup.ts                       # Test configuration
│   ├── helpers/
│   │   ├── testDb.ts                  # Test database utilities
│   │   ├── testAuth.ts                # Auth helpers for tests
│   │   └── factories.ts              # Test data factories
│   ├── unit/
│   │   ├── services/
│   │   ├── utils/
│   │   └── schemas/
│   └── integration/
│       ├── auth.test.ts
│       ├── notebooks.test.ts
│       ├── notes.test.ts
│       ├── search.test.ts
│       └── attachments.test.ts
│
├── uploads/                           # Local file storage (dev only)
│   └── .gitkeep
│
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
├── vitest.config.ts
├── nodemon.json
└── package.json
```

---

## 3. Application Startup

```typescript
// server.ts — Entry point
async function bootstrap() {
  // 1. Validate environment variables
  validateConfig();
  
  // 2. Connect to PostgreSQL (Prisma)
  await prisma.$connect();
  
  // 3. Connect to Redis
  await redis.connect();
  
  // 4. Initialize background job queues
  initializeQueues();
  
  // 5. Create Express app (middleware + routes)
  const app = createApp();
  
  // 6. Start HTTP server
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });
  
  // 7. Graceful shutdown handlers
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}
```

### Graceful Shutdown

```typescript
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  // Stop accepting new requests
  server.close();
  
  // Wait for in-flight requests (10s timeout)
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Close connections
  await prisma.$disconnect();
  await redis.quit();
  await closeQueues();
  
  process.exit(0);
}
```

---

## 4. Middleware Pipeline

```
Request ────────────────────────────────────────────────────────→ Response

  1. requestId()         — Generate UUID, attach to req + response header
  2. requestLogger()     — Log method, URL, status, duration
  3. helmet()            — Security headers
  4. cors()              — Cross-origin configuration
  5. express.json()      — Parse JSON body (limit: 10MB)
  6. cookieParser()      — Parse cookies
  7. rateLimiter()       — Global rate limit (100/min)
  
  Per-route middleware:
  8. authenticate()      — Verify JWT, attach req.user (optional/required)
  9. validate(schema)    — Validate req.body/query/params against Zod schema
  10. authorize(check)   — Resource-level permission check
  
  11. controller()       — Handle request, call service, return response
  
  Error path:
  12. errorHandler()     — Catch all errors, format response, log
```

---

## 5. Service Layer Patterns

### Request Lifecycle

```
Route → Controller → Service → Repository → Database
                 ↓                    ↓
              Validate           Prisma ORM
              Transform          Query/Mutate
              Authorize          Return data
```

### Service Example

```typescript
// note.service.ts
class NoteService {
  constructor(
    private noteRepo: NoteRepository,
    private sectionRepo: SectionRepository,
    private contentService: ContentService,
    private auditService: AuditService
  ) {}

  async createNote(userId: string, data: CreateNoteInput): Promise<Note> {
    // 1. Verify section exists and user has access
    const section = await this.sectionRepo.findByIdWithNotebook(data.sectionId);
    if (!section) throw new NotFoundError('Section not found');
    
    // 2. Validate content if provided
    if (data.content) {
      this.contentService.validateContent(data.content);
    }
    
    // 3. Extract plaintext for search
    const plaintext = data.content 
      ? this.contentService.extractPlaintext(data.content) 
      : '';
    
    // 4. Create note
    const note = await this.noteRepo.create({
      ...data,
      userId,
      plaintext,
    });
    
    // 5. Audit log
    await this.auditService.log({
      userId,
      action: 'NOTE_CREATED',
      entityType: 'note',
      entityId: note.id,
    });
    
    return note;
  }
}
```

---

## 6. Error Handling

### Error Class Hierarchy

```
AppError (abstract)
├── NotFoundError        (404)
├── ValidationError      (400)
├── UnauthorizedError    (401)
├── ForbiddenError       (403)
├── ConflictError        (409)
└── RateLimitError       (429)
```

### Global Error Handler

```typescript
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.id;
  
  if (err instanceof AppError) {
    // Known application error
    logger.warn({ requestId, code: err.code, message: err.message });
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || undefined,
      },
    });
  }
  
  if (err instanceof ZodError) {
    // Validation error from Zod
    logger.warn({ requestId, errors: err.errors });
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }
  
  // Unknown error — log full stack, return generic message
  logger.error({ requestId, err }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isDev 
        ? err.message 
        : 'An unexpected error occurred',
    },
  });
}
```

---

## 7. Logging Strategy

### Logger Configuration (Pino)

```typescript
const logger = pino({
  level: config.isDev ? 'debug' : 'info',
  transport: config.isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: ['req.headers.cookie', 'req.body.password', 'req.body.currentPassword'],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});
```

### Log Levels

| Level   | When                                          |
|---------|-----------------------------------------------|
| `fatal` | Application cannot continue                   |
| `error` | Unhandled errors, failed critical operations   |
| `warn`  | Expected errors (validation, auth failures)    |
| `info`  | Significant events (startup, shutdown, auth)   |
| `debug` | Detailed debugging (SQL queries, request data) |
| `trace` | Ultra-detailed (never in production)           |

### What is Logged

- HTTP requests: method, URL, status, duration, user ID, request ID
- Authentication events: login, logout, failed login, token refresh
- Authorization failures: forbidden access attempts
- Database errors: connection failures, query errors
- Background job events: start, completion, failure
- Application lifecycle: startup, shutdown, health checks

### What is NEVER Logged

- Passwords (plain or hashed)
- JWT token values
- Full request bodies for auth endpoints
- Full note content (PII)
- Credit card or financial data
- Personal identification numbers

---

## 8. Background Jobs (BullMQ)

### Job Definitions

| Queue Name       | Job Type            | Schedule / Trigger              | Description                          |
|------------------|---------------------|---------------------------------|--------------------------------------|
| `email`          | `sendEmail`         | On demand (event-driven)        | Send transactional emails            |
| `cleanup`        | `purgeExpiredSessions` | Cron: daily at 2 AM          | Remove expired session records       |
| `cleanup`        | `purgeOldAuditLogs` | Cron: weekly on Sunday         | Remove audit logs older than 90 days |
| `cleanup`        | `cleanOrphanFiles`  | Cron: daily at 3 AM           | Delete attachments without note refs |
| `cleanup`        | `emptyTrash`        | Cron: weekly                   | Hard-delete items in trash > 30 days |

### Job Configuration

```typescript
const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
```

---

## 9. Health Check Endpoint

### `GET /api/health`

```json
{
  "status": "healthy",
  "uptime": 86400,
  "timestamp": "2026-03-21T09:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "available"
  }
}
```

No authentication required. Used by load balancers and monitoring.
