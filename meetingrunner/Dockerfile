FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files first for dependency caching
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install dependencies
RUN npm install

# Copy all source files — adding a unique label to bust Docker layer cache
COPY . .
RUN echo "build-20260413v3"

# Clean all build artifacts to ensure fresh build
RUN rm -rf packages/shared/dist packages/shared/tsconfig.tsbuildinfo packages/server/dist packages/client/dist

# Build shared types
RUN npm run build -w packages/shared

# Generate Prisma client
RUN npx prisma generate --schema=packages/server/prisma/schema.prisma

# Build client
RUN cd packages/client && npx vite build

# Verify build includes new features
RUN grep -c "Import from Trello" packages/client/dist/assets/*.js && echo "=== Import feature verified ===" || (echo "ERROR: Import feature missing from build!" && exit 1)

# Build server
RUN npm run build -w packages/server

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/prisma ./packages/server/prisma
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/server/prisma/schema.prisma && node packages/server/dist/index.js"]
