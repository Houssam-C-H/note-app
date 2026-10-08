# Authentication & Authorization — NoteSpace

---

## 1. Authentication Mechanism

NoteSpace uses **JWT-based authentication transported via HTTP-only cookies**.

### Why JWT in Cookies?

| Approach           | XSS-Safe | CSRF-Safe | Stateless | Chosen |
|--------------------|----------|-----------|-----------|--------|
| Bearer token (localStorage) | ❌ | ✅ | ✅ | No — XSS can steal tokens |
| Session cookie (server sessions) | ✅ | ❌ (needs CSRF token) | ❌ | No — requires session store at scale |
| JWT in HTTP-only cookie | ✅ | ✅ (SameSite=Lax) | ✅ | **Yes** |

### Token Architecture

```
┌─────────────────────────────────────────────────┐
│                  Access Token                   │
│  - Short-lived: 15 minutes                     │
│  - Cookie: access_token                         │
│  - HttpOnly, Secure, SameSite=Lax, Path=/      │
│  - Contains: userId, email, iat, exp            │
│  - Signed with AUTH_ACCESS_SECRET (HS256)       │
├─────────────────────────────────────────────────┤
│                  Refresh Token                  │
│  - Long-lived: 7 days                           │
│  - Cookie: refresh_token                        │
│  - HttpOnly, Secure, SameSite=Lax              │
│  - Path=/api/auth/refresh (scoped)              │
│  - Stored hashed in sessions table              │
│  - Rotated on every refresh                     │
│  - Contains: sessionId, userId, iat, exp        │
│  - Signed with AUTH_REFRESH_SECRET (HS256)      │
└─────────────────────────────────────────────────┘
```

### Token Lifecycle

```
Login
  → Generate access token (15 min)
  → Generate refresh token (7 days)
  → Store refresh token hash in sessions table
  → Set both as HTTP-only cookies
  → Return user data

API Request
  → Read access_token from cookie
  → Verify JWT signature and expiration
  → Extract userId → attach to req.user
  → If expired → client calls /auth/refresh

Refresh
  → Read refresh_token from cookie
  → Verify JWT signature
  → Look up session in database
  → Verify hashed token matches
  → Invalidate old session
  → Generate new access + refresh tokens
  → Store new refresh token hash
  → Set new cookies

Logout
  → Delete session from database
  → Clear both cookies
```

### Refresh Token Rotation

Every successful refresh:
1. The old refresh token is invalidated (session deleted).
2. A new session is created with a new refresh token.
3. Both cookies are replaced.

**If a stolen refresh token is replayed**: The legitimate user's next refresh fails (session not found), forcing re-authentication. The attacker's session is also invalidated if the legitimate user logs out.

---

## 2. Password Security

### Hashing Algorithm: Argon2id

- **Algorithm**: Argon2id (memory-hard, GPU-resistant)
- **Parameters**: `memoryCost: 65536 (64 MB), timeCost: 3, parallelism: 4`
- **Salt**: Auto-generated per hash (built into argon2 library)
- **Library**: `argon2` npm package (C bindings)

### Password Requirements

| Requirement          | Rule                         |
|----------------------|------------------------------|
| Minimum length       | 8 characters                 |
| Maximum length       | 128 characters               |
| Uppercase            | At least 1                   |
| Lowercase            | At least 1                   |
| Digit                | At least 1                   |
| Special character    | At least 1                   |
| Common passwords     | Checked against top-10K list |
| User info            | Cannot contain email/name    |

### Password Reset Flow

```
1. User submits email to POST /api/auth/forgot-password
2. Server generates cryptographically random token (32 bytes, hex)
3. Token hash (SHA-256) stored in password_resets table with 1-hour expiry
4. Plain token sent via email link: {APP_URL}/reset-password?token=xxx
5. User submits new password + token to POST /api/auth/reset-password
6. Server hashes submitted token, looks up in password_resets
7. If valid and not expired: update password hash, mark token as used
8. All existing sessions for the user are invalidated
9. User must log in again with new password
```

---

## 3. Email Verification

```
1. On registration, server generates verification token (32 bytes, hex)
2. Token hash stored in email_verifications with 24-hour expiry
3. Email sent with link: {APP_URL}/verify-email?token=xxx
4. User clicks link → POST /api/auth/verify-email
5. Server verifies token → sets emailVerified = true
6. Token marked as used
```

**Unverified accounts**: Can log in but cannot share notes/notebooks with other users. A banner prompts email verification.

---

## 4. Session Management

### Session Table

Each login creates a session record containing:
- Hashed refresh token
- User agent (browser identification)
- IP address (last known)
- Expiration timestamp

### Active Sessions

Users can view and manage their active sessions:
- `GET /api/users/me/sessions` — list all active sessions
- `DELETE /api/users/me/sessions/:id` — revoke a specific session
- `DELETE /api/users/me/sessions` — revoke all sessions (logout everywhere)

### Session Limits

- Maximum 10 active sessions per user.
- Oldest session is automatically revoked when the limit is exceeded.

---

## 5. Rate Limiting

| Endpoint               | Limit                    | Window   | Key     |
|------------------------|--------------------------|----------|---------|
| POST /auth/login       | 10 requests              | 15 min   | IP      |
| POST /auth/register    | 5 requests               | 15 min   | IP      |
| POST /auth/forgot-password | 3 requests            | 15 min   | IP      |
| POST /auth/refresh     | 30 requests              | 15 min   | IP      |
| General API            | 100 requests             | 1 min    | User ID |
| File uploads           | 20 requests              | 1 min    | User ID |
| Search                 | 30 requests              | 1 min    | User ID |

**Implementation**: `express-rate-limit` with Redis store for distributed environments.

**Response when limited:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 120
  }
}
```

Header: `Retry-After: 120`

---

## 6. Authorization Model

### Permission Hierarchy

```
OWNER
  └── Can do everything
  └── Can share with others
  └── Can delete
  └── Can transfer ownership

EDIT
  └── Can read content
  └── Can modify content
  └── Can add/remove tags
  └── Can add attachments
  └── Cannot delete the resource
  └── Cannot share with others
  └── Cannot modify sharing

READ
  └── Can read content
  └── Can download attachments
  └── Cannot modify anything
```

### Authorization Middleware

Every protected route includes an authorization check:

```typescript
// Pseudo-code for authorization middleware
async function authorizeNote(req, res, next) {
  const note = await noteRepository.findById(req.params.id);
  
  if (!note) throw new NotFoundError("Note not found");
  
  // Owner always has access
  if (note.userId === req.user.id) {
    req.permission = "OWNER";
    return next();
  }
  
  // Check note-level share
  const noteShare = await noteShareRepository.findByNoteAndUser(
    note.id, req.user.id
  );
  if (noteShare) {
    req.permission = noteShare.permission;
    return next();
  }
  
  // Check notebook-level share (cascade)
  const section = await sectionRepository.findById(note.sectionId);
  const notebookShare = await notebookShareRepository.findByNotebookAndUser(
    section.notebookId, req.user.id
  );
  if (notebookShare) {
    req.permission = notebookShare.permission;
    return next();
  }
  
  throw new ForbiddenError("Access denied");
}
```

### Authorization Matrix

| Action              | OWNER | EDIT | READ | None |
|---------------------|-------|------|------|------|
| View note           | ✅    | ✅   | ✅   | ❌   |
| Edit note           | ✅    | ✅   | ❌   | ❌   |
| Delete note         | ✅    | ❌   | ❌   | ❌   |
| Restore note        | ✅    | ❌   | ❌   | ❌   |
| Pin/Favorite        | ✅    | ✅   | ❌   | ❌   |
| Add tags            | ✅    | ✅   | ❌   | ❌   |
| Upload attachment   | ✅    | ✅   | ❌   | ❌   |
| Download attachment | ✅    | ✅   | ✅   | ❌   |
| Delete attachment   | ✅    | ❌   | ❌   | ❌   |
| Share note          | ✅    | ❌   | ❌   | ❌   |
| View shares         | ✅    | ❌   | ❌   | ❌   |
| Move note           | ✅    | ❌   | ❌   | ❌   |
| Duplicate note      | ✅    | ✅   | ✅   | ❌   |

---

## 7. Security Protections

### IDOR/BOLA Prevention

- Every resource access checks ownership or share permissions.
- UUIDs prevent sequential enumeration.
- Authorization middleware runs before any controller logic.
- Database queries always include `userId` or share check in WHERE clause.

### Unauthorized Access Prevention

- No resource data is included in error responses for unauthorized requests.
- Generic "Not Found" for resources the user cannot access (prevents existence leaks).
- Attachment downloads verify user has access to the parent note.

### Privilege Escalation Prevention

- Permission level is checked server-side on every mutation.
- Frontend-disabled buttons are also enforced on the backend.
- Share permission cannot be self-elevated.
- Only the owner can modify shares.
- Only the owner can delete resources.

### Account Takeover Prevention

- Password change requires current password.
- All sessions invalidated on password change/reset.
- Email change requires re-verification.
- Suspicious login detection (new device/location) → notification email.
