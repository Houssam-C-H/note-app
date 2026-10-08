# Security — NoteSpace

---

## 1. Security Philosophy

NoteSpace treats security as a first-class architectural concern, not an afterthought. All user-generated content is untrusted. All API inputs are validated. All resource access is authorized.

---

## 2. OWASP Top 10 Coverage

### A01:2021 — Broken Access Control

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| IDOR (Insecure Direct Object Reference) | UUID primary keys + ownership/share checks on every request |
| Missing function-level access control | Authorization middleware on every protected route         |
| CORS misconfiguration           | Strict CORS whitelist (only `APP_URL` origin)                |
| Metadata manipulation           | Server-side permission checks; frontend state is advisory    |

### A02:2021 — Cryptographic Failures

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| Weak password hashing           | Argon2id with tuned parameters                               |
| Sensitive data in transit       | HTTPS enforced (HSTS header)                                 |
| Tokens in URL                   | Reset/verification tokens sent via email body, not URL params visible in logs |
| Secret exposure                 | Environment variables, never committed to git                |
| Weak JWT signing                | HS256 with 256-bit+ secrets, separate keys for access/refresh |

### A03:2021 — Injection

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| SQL injection                   | Prisma ORM parameterized queries; no raw SQL without `$queryRaw` with params |
| XSS (Stored)                    | Rich-text stored as JSON (not HTML); rendered via TipTap (schema-validated) |
| XSS (Reflected)                 | React auto-escapes; no `dangerouslySetInnerHTML` without sanitization |
| NoSQL injection                 | N/A (PostgreSQL, not MongoDB)                                |
| Command injection               | No shell execution; `child_process` not used                 |

### A04:2021 — Insecure Design

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| Mass assignment                 | Zod schemas whitelist allowed fields; no `req.body` pass-through |
| Business logic flaws            | Service layer with explicit validation                       |
| Missing rate limiting           | Rate limiter on auth endpoints and general API               |

### A05:2021 — Security Misconfiguration

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| Default credentials             | No defaults; env vars required at startup                    |
| Verbose error messages          | Generic errors in production; detailed errors only in dev    |
| Unnecessary features exposed    | No debug endpoints, stack traces, or Swagger UI in production |
| Missing security headers        | Helmet.js sets all recommended headers                       |

### A06:2021 — Vulnerable and Outdated Components

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| Known vulnerabilities           | `npm audit` in CI pipeline                                   |
| Outdated dependencies           | Dependabot / Renovate bot for automated updates              |
| Supply chain attacks            | Lock file committed; exact versions in `package-lock.json`   |

### A07:2021 — Identification and Authentication Failures

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| Credential stuffing             | Rate limiting on login (10/15min per IP)                     |
| Brute force                     | Progressive delay + account lockout after 10 failed attempts |
| Session fixation                | New session created on login; old sessions not reused        |
| Weak passwords                  | Enforced complexity + common password check                  |
| Password in logs                | Passwords never logged; request body logging excludes sensitive fields |

### A08:2021 — Software and Data Integrity Failures

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| CI/CD pipeline tampering        | Protected branches, required reviews                         |
| Unsigned updates                | npm integrity checks via lock file                           |
| Deserialization attacks         | JSON.parse with schema validation (Zod)                      |

### A09:2021 — Security Logging and Monitoring Failures

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| Missing audit trail             | Audit log table for all sensitive actions                     |
| Insufficient logging            | Pino structured logging with request IDs                     |
| No alerting                     | Log aggregation with alerting on error spikes (production)   |

### A10:2021 — Server-Side Request Forgery (SSRF)

| Threat                          | Mitigation                                                    |
|---------------------------------|---------------------------------------------------------------|
| SSRF via user input             | No server-side URL fetching from user input                  |
| Internal service access         | N/A (single-service architecture, no internal HTTP calls)    |

---

## 3. XSS Protection

### Rich-Text Content

- Content is stored as **ProseMirror JSON**, not raw HTML.
- The JSON schema is validated server-side against a whitelist of allowed node types.
- Rendering is handled by TipTap's React renderer, which produces safe DOM from the JSON.
- **No `dangerouslySetInnerHTML`** is used for user content.

### Server-Side Sanitization

Even though content is JSON, the server validates:
1. Only allowed node types (`paragraph`, `heading`, `text`, `bulletList`, etc.).
2. Only allowed mark types (`bold`, `italic`, `link`, etc.).
3. Link `href` attributes: only `http://`, `https://`, and `mailto:` schemes.
4. No `javascript:`, `data:`, or `vbscript:` URIs.
5. No `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>` nodes.

### Plaintext Extraction

The `plaintext` column (used for search) is generated by stripping all formatting from the JSON tree. This is never rendered as HTML.

### Content Security Policy (CSP)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self';
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
```

---

## 4. CSRF Protection

- **SameSite=Lax cookies**: Prevents cross-site request forgery for state-changing requests.
- **Custom header requirement**: API requests must include `X-Requested-With: XMLHttpRequest` (Axios does this by default for XHR). Simple form submissions from external sites won't include this header.
- **No cookie-based authentication for GET requests that modify state**: All mutations use POST/PATCH/PUT/DELETE.

---

## 5. File Upload Security

### Validation Pipeline

```
Upload received
  → Check Content-Type header
  → Check file extension
  → Read file magic bytes (file-type library)
  → Verify magic bytes match claimed MIME type
  → Reject if mismatch
  → Check file size (max 25 MB)
  → Generate UUID filename (no user-controlled paths)
  → Store in isolated uploads directory
  → Create database record
```

### Allowed File Types

| MIME Type                          | Extensions     | Max Size |
|------------------------------------|----------------|----------|
| image/jpeg                         | .jpg, .jpeg    | 10 MB    |
| image/png                          | .png           | 10 MB    |
| image/gif                          | .gif           | 5 MB     |
| image/webp                         | .webp          | 10 MB    |
| image/svg+xml                      | .svg           | 1 MB     |
| application/pdf                    | .pdf           | 25 MB    |
| application/msword                 | .doc           | 25 MB    |
| application/vnd.openxmlformats...  | .docx          | 25 MB    |
| application/vnd.ms-excel           | .xls           | 25 MB    |
| application/vnd.openxmlformats...  | .xlsx          | 25 MB    |
| text/plain                         | .txt           | 5 MB     |
| text/csv                           | .csv           | 10 MB    |
| application/zip                    | .zip           | 25 MB    |

### SVG Sanitization

SVG files are sanitized using `DOMPurify` (server-side via `jsdom`) to remove:
- `<script>` elements
- Event handlers (`onload`, `onclick`, etc.)
- `<foreignObject>` elements
- External references

### Path Traversal Prevention

- Uploaded files are stored with UUID-based filenames: `{uuid}.{ext}`.
- No user-controlled path components.
- Storage directory is outside the web root.
- Symlink following is disabled.

### Access Control

- Attachment downloads require authentication.
- Server verifies the requesting user has access to the parent note.
- Direct URL guessing is insufficient — authorization is always checked.

### Virus Scanning (Production)

- Integration point for ClamAV via `clamav.js` or API-based scanning.
- Scans run asynchronously after upload.
- Infected files are quarantined and the user is notified.
- **MVP**: Virus scanning is logged as a TODO but not blocking for Phase 1.

---

## 6. Security Headers (Helmet.js)

```javascript
app.use(helmet({
  contentSecurityPolicy: { /* see CSP above */ },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },          // X-Frame-Options: DENY
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,                            // X-Content-Type-Options: nosniff
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true                           // X-XSS-Protection (legacy)
}));
```

---

## 7. CORS Configuration

```javascript
app.use(cors({
  origin: process.env.APP_URL,        // Single allowed origin
  credentials: true,                   // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
  maxAge: 86400                        // Cache preflight for 24h
}));
```

- **No wildcard origins** — only the configured `APP_URL`.
- **Credentials allowed** — required for cookie-based auth.
- **Preflight caching** — reduces OPTIONS requests.

---

## 8. Secrets Management

### Environment Variables

| Variable              | Purpose                    | Required |
|-----------------------|----------------------------|----------|
| `AUTH_ACCESS_SECRET`  | JWT access token signing   | Yes      |
| `AUTH_REFRESH_SECRET` | JWT refresh token signing  | Yes      |
| `DATABASE_URL`        | PostgreSQL connection      | Yes      |
| `REDIS_URL`           | Redis connection           | Yes      |
| `MAIL_*`              | SMTP configuration         | Yes (prod) |

### Rules

- **Never committed to git** — `.env` is in `.gitignore`.
- **`.env.example`** contains only keys, no values.
- **Different secrets per environment** — dev, staging, production.
- **Minimum 256-bit entropy** for JWT secrets.
- **Rotation plan**: Secrets should be rotatable without downtime (graceful dual-key acceptance during rotation).

---

## 9. Encryption

| Data                  | At Rest                         | In Transit          |
|-----------------------|---------------------------------|---------------------|
| Passwords             | Argon2id hash                   | HTTPS               |
| JWT tokens            | N/A (stateless, signed)         | HTTPS (cookies)     |
| File uploads          | Filesystem (OS-level encryption)| HTTPS               |
| Database              | PostgreSQL TDE (optional)       | TLS to database     |
| Redis                 | N/A                             | TLS (production)    |

---

## 10. Audit Trail

### Logged Actions

| Action                | Entity Type  | Logged Data                |
|-----------------------|--------------|----------------------------|
| `USER_LOGIN`          | user         | IP, user agent             |
| `USER_LOGIN_FAILED`   | user         | IP, email (not password)   |
| `USER_LOGOUT`         | user         | IP                         |
| `USER_REGISTER`       | user         | IP                         |
| `PASSWORD_CHANGED`    | user         | IP                         |
| `PASSWORD_RESET`      | user         | IP                         |
| `NOTE_CREATED`        | note         | noteId, sectionId          |
| `NOTE_DELETED`        | note         | noteId                     |
| `NOTE_RESTORED`       | note         | noteId                     |
| `NOTE_SHARED`         | note_share   | noteId, sharedWithId, perm |
| `NOTEBOOK_CREATED`    | notebook     | notebookId                 |
| `NOTEBOOK_DELETED`    | notebook     | notebookId                 |
| `NOTEBOOK_SHARED`     | notebook_share| notebookId, sharedWithId  |
| `ATTACHMENT_UPLOADED` | attachment   | noteId, mimeType, size     |
| `ATTACHMENT_DELETED`  | attachment   | attachmentId               |

### Not Logged

- Password values (never)
- JWT token values (never)
- Full note content (too large, PII risk)
- Request/response bodies for non-auth endpoints (PII risk)

### Retention

- Audit logs are retained for 90 days in production.
- A background job purges logs older than the retention period.
- Logs can be exported for compliance before purging.

---

## 11. Dependency Security

- **`npm audit`** runs in CI on every pull request.
- **Lock file** (`package-lock.json`) committed and used for deterministic installs.
- **Dependabot/Renovate** configured for automated dependency updates.
- **Critical vulnerability policy**: Block deployment if critical/high severity CVEs are present.
- **Minimal dependencies**: Prefer well-maintained packages with small dependency trees.

---

## 12. Brute-Force Protection

### Login

- After 5 failed attempts from the same IP: 30-second delay.
- After 10 failed attempts: 15-minute lockout for that IP.
- After 10 failed attempts for the same account: account locked for 30 minutes.
- Lockout state stored in Redis (auto-expires).

### Password Reset

- Rate limited: 3 requests per 15 minutes per IP.
- Token expires after 1 hour.
- Used tokens cannot be replayed.

### API General

- 100 requests per minute per authenticated user.
- 30 requests per minute per IP for unauthenticated endpoints.

---

## 13. Security Checklist (Pre-Launch)

- [ ] All API endpoints require authentication (except auth routes)
- [ ] All resource access checks ownership/permissions
- [ ] All user input validated with Zod schemas
- [ ] All passwords hashed with Argon2id
- [ ] HTTPS enforced with HSTS
- [ ] Security headers configured (Helmet)
- [ ] CORS restricted to application origin
- [ ] Rate limiting enabled on all endpoints
- [ ] File uploads validated (MIME, size, extension, magic bytes)
- [ ] Rich-text content validated against schema whitelist
- [ ] No sensitive data in logs
- [ ] Audit logging enabled for security events
- [ ] Environment variables for all secrets
- [ ] `npm audit` clean (no critical/high vulnerabilities)
- [ ] CSP header configured
- [ ] Error responses don't leak internal details
- [ ] Session management tested (rotation, expiry, revocation)
- [ ] SQL injection tested (Prisma parameterized queries verified)
- [ ] XSS tested (stored, reflected)
- [ ] CSRF tested (SameSite cookies + custom header)
