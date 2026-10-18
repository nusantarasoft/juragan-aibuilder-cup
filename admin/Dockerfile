# ===== Base Stage =====
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ===== Dependencies Stage =====
FROM base AS deps
RUN apk add --no-cache python3 make g++ vips-dev
COPY package.json package-lock.json ./
RUN npm config set fetch-retry-mintimeout 600000 && \
    npm config set fetch-retry-maxtimeout 1200000 && \
    npm ci --legacy-peer-deps

# ===== Builder Stage =====
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
ARG BUST_CACHE=1
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time env vars for Next.js (NEXT_PUBLIC_* are baked into the client bundle).
# Provide via --build-arg / compose build.args for production (point to the public host).
# Defaults keep local-dev behaviour when no build args are passed.
ARG NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql
ARG NEXT_PUBLIC_SUPABASE_URL=http://kong:8000
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1MjE1MjE4LCJleHAiOjIxNDU5MTY4MDB9.6q7QrCyLzEJ-m2Mw8Y29BNR_tF3fKAfbXhdcc4HKxhE
ARG NEXT_PUBLIC_S3_ENDPOINT=http://127.0.0.1:9000
ARG NEXT_PUBLIC_S3_BUCKET=cms-media
ARG NEXT_PUBLIC_GALLERY_URL=http://localhost:3004

ENV NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_S3_ENDPOINT=${NEXT_PUBLIC_S3_ENDPOINT}
ENV NEXT_PUBLIC_S3_BUCKET=${NEXT_PUBLIC_S3_BUCKET}
ENV NEXT_PUBLIC_GALLERY_URL=${NEXT_PUBLIC_GALLERY_URL}


# Build the application (increase heap for 126+ page compilation)
ENV NODE_OPTIONS="--max-old-space-size=4096"
ARG CACHEBUST=1
RUN npm run build

# ===== Runner Stage =====
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Create .next directory with proper permissions
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]
