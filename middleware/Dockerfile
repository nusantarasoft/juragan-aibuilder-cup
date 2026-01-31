# ===== Base Stage =====
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat ffmpeg ghostscript graphicsmagick
WORKDIR /app

# ===== Dependencies Stage =====
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# ===== Builder Stage =====
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# ===== Production Dependencies Stage =====
FROM base AS prod-deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# ===== Runner Stage =====
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy only production dependencies (smaller image)
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4001

# Set environment variables
ENV PORT=4001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4001/graphql?query=%7Bhealth%7D || exit 1

# Start the application
CMD ["node", "dist/main.js"]
