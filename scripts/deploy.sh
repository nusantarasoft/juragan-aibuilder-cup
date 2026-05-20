#!/bin/bash
# deploy.sh — Production deployment script for Nusantarasoft Enterprise Suite
# Usage: ./scripts/deploy.sh [--skip-build] [--skip-pull]

set -e

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
SKIP_BUILD=false
SKIP_PULL=false

for arg in "$@"; do
    case $arg in
        --skip-build) SKIP_BUILD=true ;;
        --skip-pull) SKIP_PULL=true ;;
    esac
done

echo "╔══════════════════════════════════════════════════════╗"
echo "║   Nusantarasoft Enterprise Suite — Deploy v2.14.0   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# 1. Pull latest images
if [ "$SKIP_PULL" = false ]; then
    echo "📦 Step 1/5: Pulling latest images..."
    docker compose $COMPOSE_FILES pull --quiet
    echo "   ✅ Images pulled"
else
    echo "⏭️  Step 1/5: Skipping image pull"
fi

# 2. Build custom services
if [ "$SKIP_BUILD" = false ]; then
    echo ""
    echo "🔨 Step 2/5: Building custom services..."
    docker compose $COMPOSE_FILES build --parallel admin middleware landing-page
    echo "   ✅ Build complete"
else
    echo "⏭️  Step 2/5: Skipping build"
fi

# 3. Start infrastructure first
echo ""
echo "🗄️  Step 3/5: Starting infrastructure..."
docker compose $COMPOSE_FILES up -d postgres minio
echo "   Waiting for PostgreSQL health..."
docker compose $COMPOSE_FILES exec -T postgres pg_isready -U postgres -h localhost 2>/dev/null
until docker compose $COMPOSE_FILES exec -T postgres pg_isready -U postgres -h localhost 2>/dev/null; do
    sleep 2
done
echo "   ✅ Infrastructure ready"

# 4. Rolling restart of application services
echo ""
echo "🚀 Step 4/5: Starting application services..."
docker compose $COMPOSE_FILES up -d --remove-orphans
echo "   Waiting for health checks..."
sleep 10

# 5. Post-deploy verification
echo ""
echo "🔍 Step 5/5: Verification..."
echo ""

SERVICES=("admin" "middleware" "landing-page" "postgres" "minio" "supabase-kong" "supabase-auth")
ALL_HEALTHY=true

for svc in "${SERVICES[@]}"; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "no-health")
    if [ "$STATUS" = "healthy" ]; then
        echo "   ✅ $svc: healthy"
    elif [ "$STATUS" = "no-health" ]; then
        RUNNING=$(docker inspect --format='{{.State.Running}}' "$svc" 2>/dev/null || echo "false")
        if [ "$RUNNING" = "true" ]; then
            echo "   🟡 $svc: running (no healthcheck)"
        else
            echo "   ❌ $svc: not running"
            ALL_HEALTHY=false
        fi
    else
        echo "   ⚠️  $svc: $STATUS"
        ALL_HEALTHY=false
    fi
done

echo ""
if [ "$ALL_HEALTHY" = true ]; then
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║   ✅ Deployment successful!                         ║"
    echo "║                                                      ║"
    echo "║   Landing Page:  http://localhost:80                 ║"
    echo "║   Admin CMS:     http://localhost:3003               ║"
    echo "║   GraphQL API:   http://localhost:4001/graphql       ║"
    echo "║   Supabase:      http://localhost:8000               ║"
    echo "╚══════════════════════════════════════════════════════╝"
else
    echo "⚠️  Some services are not healthy. Check logs with:"
    echo "   docker compose $COMPOSE_FILES logs --tail=50 <service>"
fi
