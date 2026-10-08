# API Documentation — NoteSpace

---

## 1. API Design Principles

- **RESTful**: Resource-oriented URLs, standard HTTP methods.
- **JSON**: All request/response bodies are JSON (`application/json`).
- **Authentication**: HTTP-only cookie (JWT). All endpoints except auth require authentication.
- **Consistent envelope**: Every response uses the same shape.
- **Meaningful HTTP status codes**: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.
- **Pagination**: Cursor-based for resource lists; offset-based for search.
- **Rate limiting**: Per-IP and per-user limits on sensitive endpoints.

---

## 2. Response Envelope

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "nextCursor": "uuid-value"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": [
      { "field": "title", "message": "Must not be empty" }
    ]
  }
}
```

---

## 3. Authentication Endpoints

### `POST /api/auth/register`

Create a new user account.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | No                                   |
| Rate Limit     | 5 requests / 15 min per IP          |

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "displayName": "Jane Doe"
}
```

**Validation:**
- `email`: Valid email, max 255 chars, normalized to lowercase.
- `password`: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char.
- `displayName`: 2–100 chars, no HTML.

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "displayName": "Jane Doe",
      "emailVerified": false,
      "createdAt": "2026-01-15T10:30:00Z"
    }
  }
}
```

**Error Responses:**
- `400` — Validation error (invalid email format, weak password).
- `409` — Email already registered.
- `429` — Rate limit exceeded.

---

### `POST /api/auth/login`

Authenticate and receive session cookies.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | No                                   |
| Rate Limit     | 10 requests / 15 min per IP         |

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "displayName": "Jane Doe",
      "emailVerified": true
    }
  }
}
```

**Response Headers:**
```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/refresh; Max-Age=604800
```

**Error Responses:**
- `401` — Invalid credentials (generic message to prevent user enumeration).
- `429` — Rate limit exceeded.

---

### `POST /api/auth/logout`

Invalidate the current session.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

**Response Headers:**
```
Set-Cookie: access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/refresh; Max-Age=0
```

---

### `POST /api/auth/refresh`

Refresh the access token using the refresh token.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | No (uses refresh token cookie)       |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Token refreshed" }
}
```

New `access_token` and rotated `refresh_token` set via cookies.

**Error Responses:**
- `401` — Invalid or expired refresh token.

---

### `POST /api/auth/forgot-password`

Request a password reset email.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | No                                   |
| Rate Limit     | 3 requests / 15 min per IP          |

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "If an account exists, a reset email has been sent" }
}
```

> Always returns 200 regardless of whether the email exists (prevents enumeration).

---

### `POST /api/auth/reset-password`

Reset password using the token from the email.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | No                                   |

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecureP@ss456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Password reset successfully" }
}
```

**Error Responses:**
- `400` — Invalid or expired token, weak password.

---

### `POST /api/auth/verify-email`

Verify email address using the token from the email.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | No                                   |

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Email verified successfully" }
}
```

---

## 4. User Endpoints

### `GET /api/users/me`

Get the authenticated user's profile.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "displayName": "Jane Doe",
      "avatarUrl": "/uploads/avatars/550e8400.jpg",
      "preferences": { "theme": "dark", "language": "en" },
      "emailVerified": true,
      "createdAt": "2026-01-15T10:30:00Z"
    }
  }
}
```

---

### `PATCH /api/users/me`

Update the authenticated user's profile.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

**Request Body (partial update):**
```json
{
  "displayName": "Jane D.",
  "preferences": { "theme": "dark" }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { "user": { ... } }
}
```

---

### `PUT /api/users/me/avatar`

Upload or replace user avatar.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Content-Type   | multipart/form-data                  |
| Max File Size  | 5 MB                                 |
| Allowed Types  | image/jpeg, image/png, image/webp    |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "avatarUrl": "/uploads/avatars/550e8400.webp" }
}
```

---

### `PATCH /api/users/me/password`

Change password (requires current password).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

**Request Body:**
```json
{
  "currentPassword": "OldP@ss123",
  "newPassword": "NewP@ss456"
}
```

---

## 5. Notebook Endpoints

### `GET /api/notebooks`

List all notebooks for the authenticated user (including shared).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

**Query Parameters:**
- `includeArchived` (boolean, default: false)
- `includeShared` (boolean, default: true)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notebooks": [
      {
        "id": "nb-uuid-1",
        "title": "Work Notes",
        "color": "#6366f1",
        "icon": "briefcase",
        "sortOrder": 0,
        "isArchived": false,
        "isOwner": true,
        "permission": "OWNER",
        "sectionsCount": 3,
        "notesCount": 15,
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-03-20T14:00:00Z"
      }
    ]
  }
}
```

---

### `POST /api/notebooks`

Create a new notebook.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

**Request Body:**
```json
{
  "title": "Project Ideas",
  "color": "#f59e0b",
  "icon": "lightbulb"
}
```

**Validation:**
- `title`: Required, 1–200 chars.
- `color`: Optional, valid hex color.
- `icon`: Optional, from predefined icon set.

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "notebook": {
      "id": "nb-uuid-new",
      "title": "Project Ideas",
      "color": "#f59e0b",
      "icon": "lightbulb",
      "sortOrder": 3,
      "isArchived": false,
      "createdAt": "2026-03-21T08:00:00Z",
      "updatedAt": "2026-03-21T08:00:00Z"
    }
  }
}
```

---

### `GET /api/notebooks/:id`

Get a single notebook with its sections.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Owner or shared user                 |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notebook": {
      "id": "nb-uuid-1",
      "title": "Work Notes",
      "color": "#6366f1",
      "sections": [
        { "id": "sec-uuid-1", "title": "Meeting Notes", "sortOrder": 0 },
        { "id": "sec-uuid-2", "title": "Action Items", "sortOrder": 1 }
      ]
    }
  }
}
```

**Error Responses:**
- `404` — Notebook not found.
- `403` — No access to this notebook.

---

### `PATCH /api/notebooks/:id`

Update notebook properties.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Owner or EDIT permission             |

**Request Body (partial):**
```json
{
  "title": "Updated Title",
  "color": "#10b981"
}
```

---

### `DELETE /api/notebooks/:id`

Soft-delete a notebook (moves to trash).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Owner only                           |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Notebook moved to trash" }
}
```

---

### `POST /api/notebooks/:id/restore`

Restore a soft-deleted notebook.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Owner only                           |

---

### `PATCH /api/notebooks/reorder`

Reorder notebooks.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

**Request Body:**
```json
{
  "order": [
    { "id": "nb-uuid-2", "sortOrder": 0 },
    { "id": "nb-uuid-1", "sortOrder": 1 },
    { "id": "nb-uuid-3", "sortOrder": 2 }
  ]
}
```

---

## 6. Section Endpoints

### `GET /api/notebooks/:notebookId/sections`

List sections in a notebook.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Notebook owner or shared user        |

---

### `POST /api/notebooks/:notebookId/sections`

Create a section in a notebook.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Notebook owner or EDIT permission    |

**Request Body:**
```json
{
  "title": "Research",
  "color": "#8b5cf6"
}
```

---

### `PATCH /api/sections/:id`

Update a section.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Notebook owner or EDIT permission    |

---

### `DELETE /api/sections/:id`

Soft-delete a section (and its notes).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Notebook owner only                  |

---

### `PATCH /api/sections/reorder`

Reorder sections within a notebook.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

---

## 7. Note Endpoints

### `GET /api/sections/:sectionId/notes`

List notes in a section.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Section's notebook owner or shared   |

**Query Parameters:**
- `cursor` — Pagination cursor
- `limit` — Items per page (default: 20, max: 100)
- `includeArchived` — Include archived notes

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": "note-uuid-1",
        "title": "Sprint Planning",
        "isPinned": true,
        "isFavorite": false,
        "isArchived": false,
        "lastEditedAt": "2026-03-20T14:00:00Z",
        "tags": [{ "id": "tag-1", "name": "work", "color": "#f59e0b" }],
        "preview": "First 150 characters of plaintext..."
      }
    ]
  },
  "meta": {
    "nextCursor": "note-uuid-20",
    "hasMore": true
  }
}
```

---

### `POST /api/notes`

Create a new note.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Section's notebook owner or EDIT     |

**Request Body:**
```json
{
  "sectionId": "sec-uuid-1",
  "title": "New Note",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Hello world" }]
      }
    ]
  }
}
```

**Validation:**
- `sectionId`: Required, valid UUID, must exist and be accessible.
- `title`: Optional (defaults to "Untitled"), max 500 chars.
- `content`: Optional, valid ProseMirror JSON schema.

---

### `GET /api/notes/:id`

Get a single note with full content.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner or shared user            |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "note": {
      "id": "note-uuid-1",
      "sectionId": "sec-uuid-1",
      "title": "Sprint Planning",
      "content": { "type": "doc", "content": [...] },
      "isPinned": true,
      "isFavorite": false,
      "isArchived": false,
      "tags": [{ "id": "tag-1", "name": "work", "color": "#f59e0b" }],
      "attachments": [
        {
          "id": "att-uuid-1",
          "originalName": "screenshot.png",
          "mimeType": "image/png",
          "fileSize": 245000,
          "url": "/api/attachments/att-uuid-1/download"
        }
      ],
      "lastEditedAt": "2026-03-20T14:00:00Z",
      "createdAt": "2026-03-15T09:00:00Z",
      "updatedAt": "2026-03-20T14:00:00Z"
    }
  }
}
```

---

### `PATCH /api/notes/:id`

Update note content or metadata (used by autosave).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner or EDIT permission        |

**Request Body (partial):**
```json
{
  "title": "Updated Title",
  "content": { "type": "doc", "content": [...] }
}
```

---

### `DELETE /api/notes/:id`

Soft-delete a note (move to trash).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner only                      |

---

### `POST /api/notes/:id/restore`

Restore a soft-deleted note.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner only                      |

---

### `POST /api/notes/:id/duplicate`

Create a copy of a note.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner or READ+ permission       |

---

### `POST /api/notes/:id/move`

Move a note to a different section.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner                           |

**Request Body:**
```json
{
  "sectionId": "sec-uuid-target"
}
```

---

### `PATCH /api/notes/:id/pin`

Toggle pin status.

**Request Body:**
```json
{ "isPinned": true }
```

---

### `PATCH /api/notes/:id/favorite`

Toggle favorite status.

**Request Body:**
```json
{ "isFavorite": true }
```

---

### `PATCH /api/notes/:id/archive`

Toggle archive status.

**Request Body:**
```json
{ "isArchived": true }
```

---

## 8. Tag Endpoints

### `GET /api/tags`

List all tags for the authenticated user.

---

### `POST /api/tags`

Create a new tag.

**Request Body:**
```json
{
  "name": "important",
  "color": "#ef4444"
}
```

---

### `PATCH /api/tags/:id`

Update a tag.

---

### `DELETE /api/tags/:id`

Delete a tag (removes from all notes).

---

### `POST /api/notes/:noteId/tags`

Add a tag to a note.

**Request Body:**
```json
{ "tagId": "tag-uuid" }
```

---

### `DELETE /api/notes/:noteId/tags/:tagId`

Remove a tag from a note.

---

## 9. Attachment Endpoints

### `POST /api/notes/:noteId/attachments`

Upload an attachment.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner or EDIT permission        |
| Content-Type   | multipart/form-data                  |
| Max File Size  | 25 MB                                |

**Allowed MIME Types:**
- `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- `application/pdf`
- `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `text/plain`, `text/csv`
- `application/zip`

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "attachment": {
      "id": "att-uuid-new",
      "originalName": "report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 1048576,
      "url": "/api/attachments/att-uuid-new/download",
      "createdAt": "2026-03-21T09:00:00Z"
    }
  }
}
```

**Error Responses:**
- `400` — Invalid file type or exceeds size limit.
- `413` — Payload too large.

---

### `GET /api/attachments/:id/download`

Download an attachment.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner or shared user            |
| Response       | File stream with Content-Disposition |

---

### `DELETE /api/attachments/:id`

Delete an attachment (removes file from storage).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Attachment uploader or note owner    |

---

## 10. Search Endpoint

### `GET /api/search`

Search notes across all accessible content.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

**Query Parameters:**
- `q` — Search query (required, min 2 chars)
- `notebookId` — Filter by notebook
- `sectionId` — Filter by section
- `tags` — Comma-separated tag IDs
- `isPinned` — Filter pinned notes
- `isFavorite` — Filter favorites
- `page` — Page number (default: 1)
- `limit` — Results per page (default: 20, max: 50)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "note-uuid-1",
        "title": "Sprint Planning",
        "preview": "...matched text with <mark>highlight</mark>...",
        "notebookTitle": "Work Notes",
        "sectionTitle": "Meetings",
        "relevance": 0.85,
        "lastEditedAt": "2026-03-20T14:00:00Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1,
    "query": "sprint"
  }
}
```

---

## 11. Sharing Endpoints

### `POST /api/notes/:id/share`

Share a note with another user.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner only                      |

**Request Body:**
```json
{
  "email": "colleague@example.com",
  "permission": "EDIT"
}
```

---

### `GET /api/notes/:id/shares`

List all shares for a note.

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |
| Authorization  | Note owner only                      |

---

### `PATCH /api/notes/:id/shares/:shareId`

Update share permission.

---

### `DELETE /api/notes/:id/shares/:shareId`

Revoke a share.

---

### `POST /api/notebooks/:id/share`

Share an entire notebook.

---

### `GET /api/shared/notes`

List notes shared with the current user.

---

### `GET /api/shared/notebooks`

List notebooks shared with the current user.

---

## 12. Trash Endpoints

### `GET /api/trash`

List all soft-deleted items (notes, sections, notebooks).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

---

### `DELETE /api/trash/empty`

Permanently delete all items in trash (hard delete).

| Property       | Value                                |
|----------------|--------------------------------------|
| Auth Required  | Yes                                  |

> **Warning**: This action is irreversible. A confirmation dialog is shown on the frontend.

---

## 13. Favorites & Pinned Endpoints

### `GET /api/notes/favorites`

List all favorited notes across all notebooks.

---

### `GET /api/notes/pinned`

List all pinned notes across all notebooks.

---

## 14. HTTP Status Code Summary

| Code | Meaning              | Used For                                    |
|------|----------------------|---------------------------------------------|
| 200  | OK                   | Successful GET, PATCH, DELETE                |
| 201  | Created              | Successful POST (resource created)           |
| 204  | No Content           | Successful operation with no response body   |
| 400  | Bad Request          | Validation errors, malformed input           |
| 401  | Unauthorized         | Missing or invalid authentication            |
| 403  | Forbidden            | Authenticated but insufficient permissions   |
| 404  | Not Found            | Resource does not exist                      |
| 409  | Conflict             | Duplicate resource (e.g., email exists)      |
| 413  | Payload Too Large    | File upload exceeds size limit               |
| 422  | Unprocessable Entity | Semantically invalid request                 |
| 429  | Too Many Requests    | Rate limit exceeded                          |
| 500  | Internal Server Error| Unexpected server error                      |
