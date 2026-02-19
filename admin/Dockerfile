# ===== Base Stage =====
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ===== Dependencies Stage =====
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm config set fetch-retry-mintimeout 600000 && \
    npm config set fetch-retry-maxtimeout 1200000 && \
    npm install --legacy-peer-deps

# ===== Builder Stage =====
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time env vars for Next.js (baked at build time)
# Admin uses GraphQL middleware - using localhost for browser access
ENV NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:4001/graphql
# Supabase vars kept for backward compatibility (deprecated)
ENV NEXT_PUBLIC_SUPABASE_URL=http://kong:8000
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0


# Build the application
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
