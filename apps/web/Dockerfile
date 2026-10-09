FROM node:20-alpine AS builder

# Install build tools for native node-gyp modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root workspace configurations and package files
COPY package*.json ./
COPY tsconfig.json ./
COPY packages ./packages/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install dependencies across workspace
RUN npm ci

# Copy Web source
COPY apps/web ./apps/web/

# Build Web Frontend for Production
WORKDIR /app/apps/web
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production Server (Nginx)
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
