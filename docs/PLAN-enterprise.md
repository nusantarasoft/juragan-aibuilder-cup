# Enterprise Architecture Plan

## Overview

Three enterprise-grade modules added to the existing NusantaraSoft platform:

1. **Permission System** — Salesforce-style 6-layer RBAC with vertical & horizontal permissions
2. **CRM System** — Individual-centric CRM with Accounts, Contacts, Leads, Opportunities, Cases
3. **Project Management** — Full PMBOK 6th Edition (10 knowledge areas, 49 processes)

All modules are **multi-tenant**, share a unified user model, and are built as **modular NestJS modules** that can be extracted into microservices later.

---

## Current Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Middleware | NestJS + GraphQL (Apollo, Code-First) |
| Database | PostgreSQL via Supabase |
| Storage | MinIO (S3-compatible) |
| Containerization | Docker Compose |

## New Modules (NestJS)

```
middleware/src/
├── tenants/          # Multi-tenant core
├── permissions/      # 6-layer permission engine
├── crm/              # CRM module
│   ├── individuals/
│   ├── accounts/
│   ├── contacts/
│   ├── leads/
│   ├── opportunities/
│   ├── cases/
│   ├── activities/
│   ├── products/
│   └── campaigns/
└── pm/               # Project Management module
    ├── projects/
    ├── integration/
    ├── scope/
    ├── schedule/
    ├── cost/
    ├── quality/
    ├── resource/
    ├── communications/
    ├── risk/
    ├── procurement/
    └── stakeholder/
```

## New Admin Pages

```
admin/src/app/admin/
├── permissions/      # Role, Profile, Permission management
├── crm/              # CRM dashboard, entity pages
│   ├── individuals/
│   ├── accounts/
│   ├── contacts/
│   ├── leads/
│   ├── opportunities/
│   ├── cases/
│   └── activities/
└── projects/         # Project management
    ├── [id]/         # Single project view
    ├── board/        # Kanban board
    ├── gantt/        # Gantt chart
    ├── risks/        # Risk register
    ├── budget/       # Cost management
    └── resources/    # Resource allocation
```

## Multi-Tenant Model

```
┌─────────────────────────────────────┐
│           tenant_id (UUID)          │
│  Every table includes tenant_id    │
│  RLS policies enforce isolation    │
└─────────────────────────────────────┘
```

- `tenants` table stores org data
- Every entity table has `tenant_id` FK
- Supabase RLS policies enforce tenant isolation
- Users belong to tenants via `tenant_members` junction table

## Design Document Index

| Document | Scope | Path |
|----------|-------|------|
| Permission System | 6-layer RBAC, field-level security, sharing rules | [design-permissions.md](./design-permissions.md) |
| CRM System | Individuals, Accounts, Contacts, Leads, Opportunities, Cases | [design-crm.md](./design-crm.md) |
| Project Management | PMBOK 6th Ed, 10 knowledge areas, 49 processes | [design-pm.md](./design-pm.md) |

## Implementation Phases

### Phase A: Database Schema + API (per design docs)
1. Create PostgreSQL migrations for all tables
2. Build NestJS modules with GraphQL resolvers
3. Implement permission engine middleware

### Phase B: Admin UI
1. Permission management pages (Profiles, Roles, Permission Sets)
2. CRM pages (CRUD for all entities, pipeline view)
3. PM pages (Gantt, Kanban, Risk Register, Budget, Resource)
