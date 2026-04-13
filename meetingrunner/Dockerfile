FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy all source at once to avoid layer caching issues
COPY . .

# Install dependencies
RUN npm install

# Clean all build artifacts
RUN rm -rf packages/shared/dist packages/shared/tsconfig.tsbuildinfo packages/server/dist packages/client/dist

# Build shared types
RUN npm run build -w packages/shared

# Generate Prisma client
RUN npx prisma generate --schema=packages/server/prisma/schema.prisma

# Verify new files exist before building
RUN echo "=== Checking source files ===" && \
    ls packages/client/src/pages/AdminPage.tsx && \
    ls packages/client/src/components/TrelloImportPanel.tsx && \
    grep -c "AdminPage" packages/client/src/App.tsx && \
    echo "=== Files verified ==="

# Build client
RUN cd packages/client && npx vite build

# Verify build output
RUN ls -la packages/client/dist/assets/ && echo "=== Client build complete ==="

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
