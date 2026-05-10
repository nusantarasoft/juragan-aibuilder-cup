# ═══════════════════════════════════════════════════════════
# Nusantarasoft Makefile — Common Docker operations
# ═══════════════════════════════════════════════════════════

.PHONY: build-admin build-middleware build-all up down restart logs deploy version dev clean status

# ── Build ─────────────────────────────────────────────────
build-admin:
	docker compose build admin

build-middleware:
	docker compose build middleware

build-all: build-admin build-middleware

# ── Lifecycle ─────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart admin middleware

# ── Logs ──────────────────────────────────────────────────
logs:
	docker compose logs -f admin middleware --tail=100

logs-all:
	docker compose logs -f --tail=50

# ── Deploy (build + restart) ─────────────────────────────
deploy: build-all
	docker compose up -d admin middleware
	@echo "✅ Deployed admin + middleware"

deploy-prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build admin middleware
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "✅ Production deployment complete"

# ── Development ───────────────────────────────────────────
dev:
	cd admin && npm run dev

dev-middleware:
	cd middleware && npm run start:dev

# ── Status ────────────────────────────────────────────────
status:
	docker compose ps

health:
	@echo "── Admin ──"
	@docker inspect --format='{{.State.Health.Status}}' admin 2>/dev/null || echo "not running"
	@echo "── Middleware ──"
	@docker inspect --format='{{.State.Health.Status}}' middleware 2>/dev/null || echo "not running"
	@echo "── Postgres ──"
	@docker inspect --format='{{.State.Health.Status}}' postgres 2>/dev/null || echo "not running"

# ── Version ───────────────────────────────────────────────
version:
	@read -p "Tag (e.g. v2.9.0): " tag; \
	git add -A && git commit -m "release: $$tag" && git tag $$tag && git push && git push --tags

# ── Cleanup ───────────────────────────────────────────────
clean:
	docker compose down --remove-orphans
	docker system prune -f
	@echo "✅ Cleanup complete"

prune-volumes:
	docker volume prune -f
	@echo "⚠️  Pruned unused volumes"
