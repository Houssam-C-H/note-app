FROM node:20-alpine AS builder

# Install build tools for native node-gyp modules (argon2) and openssl for Prisma
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy root workspace configurations and package files
COPY package*.json ./
COPY tsconfig.json ./
COPY packages ./packages/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install dependencies across workspace
RUN npm ci

# Copy API source code
COPY apps/api ./apps/api/

# Generate Prisma Client and Build Production API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# Production Runtime Image
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Copy workspace node_modules and built packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

EXPOSE 3000

# Push DB schema on startup and launch server
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
