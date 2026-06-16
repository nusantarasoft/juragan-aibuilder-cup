# Supabase Database Setup

## Overview

This directory contains the complete database schema and seed data for Nusantarasoft 3, organized as Supabase-compatible migrations.

## Directory Structure

```
supabase/
├── migrations/                          # Run automatically on fresh DB
│   ├── 00000000000000_consolidated_init.sql   # All 144 tables (schema)
│   └── 00000001000000_seed_data.sql           # All demo/seed data
├── archive/                             # Old individual schema files (reference only)
│   ├── permissions_schema.sql
│   ├── crm_schema.sql
│   ├── pm_migration_combined.sql
│   └── ... (19 more files)
└── README.md                            # This file
```

## Setting Up on a New Machine

### Option 1: Via Docker Compose (Recommended)

The PostgreSQL container is configured to auto-run migrations on startup:

```bash
docker-compose up -d postgres
# Wait for healthy status
docker-compose up -d
```

### Option 2: Manual (Supabase SQL Editor)

Run the migrations in order:

1. **Schema**: Copy & paste `migrations/00000000000000_consolidated_init.sql` into the SQL Editor
2. **Seed Data**: Copy & paste `migrations/00000001000000_seed_data.sql` into the SQL Editor

### Option 3: Via psql CLI

```bash
psql -h localhost -p 5432 -U postgres -d postgres \
  -f supabase/migrations/00000000000000_consolidated_init.sql

psql -h localhost -p 5432 -U postgres -d postgres \
  -f supabase/migrations/00000001000000_seed_data.sql
```

## Modules Included

| Module | Tables | Description |
|--------|--------|-------------|
| Permissions & Multi-Tenant | 22 | Tenants, users, RBAC, profiles, roles, sharing rules, field-level security |
| CMS Core | 3 | Pages, settings, blocks |
| User Stars | 1 | User favorites/bookmarks |
| CRM | 11 | Accounts, contacts, deals, activities, campaigns, cases, products, quotes |
| Inventory | 4 | Warehouses, zones, bins, stock transfers |
| Stock Opname | 2 | Physical count sessions and line items |
| Manufacturing | 3 | BOMs, BOM lines, work orders |
| E-Commerce | 4 | Customers, orders, order items, store settings |
| Booking & Ticketing | 5 | Schedules, occurrences, seats, bookings, passengers |
| Rental | 2 | Rental assets, rental contracts |
| ITSM (ITIL v4) | 12 | Tickets, problems, changes, service catalog, knowledge base, approvals |
| Project Management (PMBOK) | 25 | Projects, tasks, sprints, WBS, risks, EVM, quality, resources, stakeholders |
| Media | 3 | Files with vector embeddings and Label Studio annotations |
| DCIM | 16 | Sites, buildings, rooms, racks, devices, power, sensors, cables |
| BMS | 13 | Systems, zones, equipment, points, schedules, alarms, energy, access |
| SCADA | 9 | Data sources, tags, alarms, HMI screens, trends, reports |
| BIM | 7 | Models, elements, annotations, viewpoints, clashes, issues |
| Studio | 2 | AI studio settings and outputs |
| **Total** | **144** | |

## Adding New Migrations

When you need to add new tables or alter existing ones:

1. Create a new file in `migrations/` with a timestamp prefix:
   ```
   migrations/20260617120000_add_new_feature.sql
   ```
2. Use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for idempotency
3. The naming convention is: `YYYYMMDDHHMMSS_description.sql`

## Design Decisions

- **PM tables** use `TEXT NOT NULL` for `tenant_id` (not UUID FK to tenants) for flexibility
- **Media table** uses the extended version with `s3_key`, `checksum`, `thumbnail_path`, and vector embeddings
- **All tables** use `IF NOT EXISTS` for safe re-runs
- **All INSERTs** use `ON CONFLICT DO NOTHING` for idempotent seeding
