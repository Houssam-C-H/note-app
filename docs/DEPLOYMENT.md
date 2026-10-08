# Deployment — NoteSpace

---

## 1. Deployment Environments

| Environment   | Purpose                           | Database         | URL                        |
|---------------|-----------------------------------|------------------|----------------------------|
| Development   | Local development                 | Local PostgreSQL | http://localhost:5173       |
| Staging       | Pre-production testing            | Staging DB       | https://staging.notespace.app |
| Production    | Live application                  | Production DB    | https://notespace.app      |

---

## 2. Docker Architecture

### Docker Compose (Development)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: notespace_dev
      POSTGRES_USER: notespace
      POSTGRES_PASSWORD: devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 100mb --maxmemory-policy allkeys-lru

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

volumes:
  postgres_data:
```

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports: ["3000:3000"]
    environment:
      NODE_ENV: production
    env_file: .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    environment:
      POSTGRES_DB: notespace
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
      - frontend_build:/usr/share/nginx/html
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  frontend_build:
```

### Dockerfile

```dockerfile
# docker/Dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=backend-build /app/backend/package.json ./
COPY --from=frontend-build /app/frontend/dist ./public

RUN mkdir -p uploads && chown appuser:appgroup uploads

USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## 3. Nginx Configuration

```nginx
# docker/nginx/nginx.conf
upstream api {
    server app:3000;
}

server {
    listen 80;
    server_name notespace.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name notespace.app;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;

    # Static frontend files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # File upload limit
        client_max_body_size 25M;
    }

    # Health check
    location /api/health {
        proxy_pass http://api;
        access_log off;
    }
}
```

---

## 4. Database Backups

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup.sh
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="notespace_${TIMESTAMP}.sql.gz"

pg_dump -h postgres -U ${DB_USER} ${DB_NAME} | gzip > ${BACKUP_DIR}/${FILENAME}

# Keep only last 30 days
find ${BACKUP_DIR} -name "notespace_*.sql.gz" -mtime +30 -delete

echo "Backup created: ${FILENAME}"
```

### Backup Schedule

- **Daily**: Full database dump (compressed) at 2 AM UTC.
- **Retention**: 30 days.
- **Off-site**: Copy to S3/remote storage (production).
- **Restore test**: Monthly restore to staging environment.

---

## 5. Environment Variables

All environment variables are documented in `.env.example`:

```env
# Application
NODE_ENV=development
APP_URL=http://localhost:5173
API_PORT=3000

# Database
DATABASE_URL=postgresql://notespace:devpassword@localhost:5432/notespace_dev

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
AUTH_ACCESS_SECRET=your-256-bit-access-secret-here
AUTH_REFRESH_SECRET=your-256-bit-refresh-secret-here
AUTH_ACCESS_EXPIRY=15m
AUTH_REFRESH_EXPIRY=7d

# Storage
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./uploads
# STORAGE_S3_BUCKET=
# STORAGE_S3_REGION=
# STORAGE_S3_ACCESS_KEY=
# STORAGE_S3_SECRET_KEY=

# Email (MailHog for development)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=noreply@notespace.app

# Logging
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

---

## 6. Production Checklist

- [ ] Environment variables set for production
- [ ] JWT secrets are cryptographically random (256-bit)
- [ ] Database password is strong and unique
- [ ] Redis password is set
- [ ] HTTPS configured with valid SSL certificate
- [ ] HSTS header enabled
- [ ] CORS restricted to production domain
- [ ] Rate limiting configured
- [ ] File upload size limits configured in nginx
- [ ] Database backups automated and tested
- [ ] Error tracking service configured (Sentry)
- [ ] Log aggregation configured
- [ ] Health check endpoint monitored
- [ ] Docker resource limits set
- [ ] Non-root user in Docker container
- [ ] `npm audit` clean
- [ ] Database migrations applied
- [ ] Seed data NOT applied to production
- [ ] Debug endpoints disabled
- [ ] Swagger UI disabled in production
- [ ] Source maps not served to client

---

## 7. Monitoring

### Health Check

```
GET /api/health → 200 OK
```

Monitored by: uptime monitoring service (UptimeRobot, Healthchecks.io, or similar).

### Alerts

| Alert                      | Threshold        | Action                        |
|----------------------------|------------------|-------------------------------|
| API response time          | > 2s (p95)       | Investigate slow queries      |
| Error rate                 | > 5% of requests | Check logs, investigate       |
| Database connections       | > 80% pool       | Scale pool or optimize queries|
| Disk usage                 | > 80%            | Clean up or expand            |
| Memory usage               | > 80%            | Investigate leaks             |
| Failed background jobs     | Any critical job  | Check logs, retry manually    |
| SSL certificate expiry     | 14 days before   | Renew certificate             |

---

## 8. Scaling Strategy

### Vertical (Phase 1)

- Single server with Docker Compose.
- Scale by increasing server resources (CPU, RAM, storage).
- Sufficient for 1,000–10,000 users.

### Horizontal (Future)

- Containerized deployment (Kubernetes or managed containers).
- Multiple API server instances behind a load balancer.
- PostgreSQL read replicas for read-heavy queries.
- Redis Cluster for distributed caching.
- S3 for file storage (already abstracted).
- CDN for static assets.
