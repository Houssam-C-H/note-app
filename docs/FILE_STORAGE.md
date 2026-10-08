# File Storage — NoteSpace

---

## 1. Storage Architecture

NoteSpace uses an **abstracted storage interface** that supports multiple backends:

```
┌─────────────────────────────────────────────────────────┐
│                  StorageService (Interface)              │
│                                                         │
│  upload(file, path): Promise<string>                   │
│  download(path): Promise<Buffer>                       │
│  delete(path): Promise<void>                           │
│  getUrl(path): string                                  │
│  exists(path): Promise<boolean>                        │
└───────────┬────────────────────────┬────────────────────┘
            │                        │
   ┌────────▼────────┐    ┌─────────▼────────┐
   │ LocalStorage    │    │  S3Storage       │
   │ (Development)   │    │  (Production)    │
   │                 │    │                  │
   │ Writes to disk  │    │ Uses AWS SDK     │
   │ uploads/ dir    │    │ S3-compatible    │
   └─────────────────┘    └──────────────────┘
```

**Why abstraction?** Allows switching from local filesystem in development to S3 (or MinIO, Cloudflare R2) in production without changing any business logic.

---

## 2. Storage Configuration

```env
# Development
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./uploads

# Production
STORAGE_DRIVER=s3
STORAGE_S3_BUCKET=notespace-uploads
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY=...
STORAGE_S3_SECRET_KEY=...
STORAGE_S3_ENDPOINT=...     # Optional (for MinIO/R2)
```

---

## 3. File Organization

```
uploads/
├── attachments/
│   ├── 2026/
│   │   ├── 03/
│   │   │   ├── {uuid}.pdf
│   │   │   ├── {uuid}.png
│   │   │   └── {uuid}.docx
│   │   └── 04/
│   │       └── ...
│   └── ...
└── avatars/
    ├── {userId}.webp
    └── ...
```

**Naming convention**: `{type}/{year}/{month}/{uuid}.{ext}`
- UUID filenames prevent collisions and path traversal.
- Date-based directories keep filesystem manageable.
- Original filename stored in database only.

---

## 4. Upload Pipeline

```
1. Client sends multipart/form-data
2. Multer receives file into memory buffer (not disk)
3. Validate file:
   a. Check Content-Type header
   b. Check file extension from original name
   c. Read magic bytes with 'file-type' library
   d. Verify magic bytes match claimed MIME type
   e. If SVG: sanitize with DOMPurify
   f. Check file size against per-type limits
4. Generate storage path: attachments/{year}/{month}/{uuid}.{ext}
5. Calculate SHA-256 checksum
6. Write file to storage backend
7. Create attachment record in database
8. Return attachment metadata to client
```

---

## 5. Download Pipeline

```
1. Client requests GET /api/attachments/{id}/download
2. Authenticate user (JWT cookie)
3. Load attachment metadata from database
4. Load parent note
5. Verify user has access to parent note (owner or shared)
6. Read file from storage backend
7. Set response headers:
   - Content-Type: {mimeType}
   - Content-Disposition: attachment; filename="{originalName}"
   - Content-Length: {fileSize}
   - Cache-Control: private, max-age=3600
   - X-Content-Type-Options: nosniff
8. Stream file to response
```

---

## 6. File Validation Rules

| MIME Type                          | Extensions     | Max Size | Magic Bytes Check |
|------------------------------------|----------------|----------|-------------------|
| image/jpeg                         | .jpg, .jpeg    | 10 MB    | FF D8 FF          |
| image/png                          | .png           | 10 MB    | 89 50 4E 47       |
| image/gif                          | .gif           | 5 MB     | 47 49 46 38       |
| image/webp                         | .webp          | 10 MB    | 52 49 46 46       |
| image/svg+xml                      | .svg           | 1 MB     | Text-based        |
| application/pdf                    | .pdf           | 25 MB    | 25 50 44 46       |
| application/msword                 | .doc           | 25 MB    | D0 CF 11 E0       |
| application/vnd.openxmlformats...  | .docx          | 25 MB    | 50 4B 03 04       |
| application/vnd.ms-excel           | .xls           | 25 MB    | D0 CF 11 E0       |
| application/vnd.openxmlformats...  | .xlsx          | 25 MB    | 50 4B 03 04       |
| text/plain                         | .txt           | 5 MB     | Text-based        |
| text/csv                           | .csv           | 10 MB    | Text-based        |
| application/zip                    | .zip           | 25 MB    | 50 4B 03 04       |

**Rejected by default**: Executables (.exe, .bat, .sh), scripts (.js, .py), HTML files.

---

## 7. Image Processing

For uploaded images (used as note content or avatars):

- **Avatars**: Resized to 256x256, converted to WebP, quality 80%.
- **Note images**: Stored as-is (no server-side processing in MVP).
- **Future**: Generate thumbnails for gallery view, progressive loading.

Library: `sharp` (high-performance image processing).

---

## 8. Cleanup Strategy

### Orphaned File Detection

A background job runs daily to find and delete orphaned files:

```sql
-- Find attachments whose parent note is hard-deleted
SELECT a.id, a."storagePath"
FROM attachments a
LEFT JOIN notes n ON a."noteId" = n.id
WHERE n.id IS NULL;
```

### Trash Expiration

- Notes in trash (soft-deleted) for more than 30 days are **hard-deleted**.
- Associated attachments are also deleted from storage.
- A weekly background job handles this.

### Avatar Replacement

- When a user uploads a new avatar, the old file is deleted.
- Handled synchronously during upload.

---

## 9. Quotas (Future)

| Resource               | Free Tier   | Pro Tier     |
|------------------------|-------------|--------------|
| Storage per user       | 100 MB      | 10 GB        |
| Single file size       | 10 MB       | 25 MB        |
| Attachments per note   | 10          | 50           |
| Total notes            | 500         | Unlimited    |
| Total notebooks        | 20          | Unlimited    |

**MVP**: No quotas enforced. The schema supports adding quota tracking later via a `user_quotas` table.

---

## 10. Security Summary

- ✅ UUID filenames — no user-controlled paths
- ✅ Magic byte validation — prevents MIME spoofing
- ✅ Size limits — prevents denial-of-service
- ✅ Extension whitelist — rejects dangerous file types
- ✅ SVG sanitization — removes embedded scripts
- ✅ Storage outside web root — no direct URL access
- ✅ Authorization on download — ownership/share verification
- ✅ Checksum stored — integrity verification
- ✅ No symlink following — prevents path traversal
- ✅ Content-Disposition: attachment — prevents inline execution
