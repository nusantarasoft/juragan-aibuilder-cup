# Nusantarasoft Architecture Documentation

This document describes the monolithic architecture of the Nusantarasoft 3 platform, currently at **v3.1.0**.

## 1. System Topology

### 1.1 The Client Layer
- **Admin App** (`/admin`): A monolithic Next.js 16 (App Router) application. Uses Ant Design and Tailwind CSS.
  - Serves 16 major modules (PM, ITSM, HR, CRM, Inventory, Facility Management, Big Data, Security, etc.)
  - Compiles over 200 pages.
  - Utilizes `@react-three/fiber` for complex WebGL visualizations (e.g. `Construction3D.tsx` and DCIM rack visualizers).
- **Playwright E2E Suite**: Automates integration tests inside the GitHub CI/CD pipeline (`auth.spec.ts`, `navigation.spec.ts`).

### 1.2 The Middleware Layer
- **NestJS API Gateway** (`/middleware`): Exposes a GraphQL endpoint utilizing `@apollo/client`.
- Handles complex business logic that cannot be resolved safely in the browser (e.g., Sentiment Analysis, OPC-UA SCADA polling, multi-table aggregate mutations).

### 1.3 The Data Layer (Supabase)
- **PostgreSQL 15**: Central state for all 16 domains. Over 200 tables separated logically by prefixes (`hr_`, `pm_`, `dcim_`, `bms_`).
- **PostgREST**: Provides an auto-generated REST API that Next.js Server Components query securely.
- **Supabase Realtime**: Powers the global `NotificationBell.tsx`, streaming `INSERT` anomalies from the database directly into the UI via WebSockets.

---

## 2. CI/CD Pipeline

The project utilizes GitHub Actions to ensure zero downtime and prevent regressions.

### 2.1 Continuous Integration (`.github/workflows/ci.yml`)
1. **Linter**: Runs ESLint across all Next.js and NestJS code.
2. **Next.js Build**: Triggers `npm run build` using Turbopack to verify zero TypeScript errors.
3. **Playwright E2E**: Spins up Chromium and Firefox to ensure core auth flows and layout navigations work.

### 2.2 Continuous Deployment (`.github/workflows/docker-publish.yml`)
1. Automatically tags semantic versions.
2. Builds optimized Docker images for the Next.js `admin` UI and the NestJS `middleware`.
3. Pushes to GHCR (GitHub Container Registry) and deployed via `scripts/deploy.sh`.

---

## 3. Notable Subsystems

### 3.1 Facility Management (3D rendering)
Located in `admin/src/app/admin/pm/construction-3d/`, this module parses Phase configuration to render sequential construction steps.
- **Engine**: Three.js mapped through React Three Fiber.
- **Clash Detection**: Calculates temporal overlaps, resource (crew) constraints, and cost (budget vs timeline) risks, rendering them as physical pulsing markers (`PulsingClashMarker`) directly onto the 3D model.
- **RFI System**: Renders glowing sonar-ring markers (`RfiMarker3D`) at specific (x, y, z) coords indicating issues logged against physical BIM objects.

### 3.2 Enterprise Command Center
- **Omni-Search** (`CommandPalette.tsx`): A global modal triggerable via `Cmd+K`. Implements a fast client-side fuzzy search combined with a debounced live GraphQL lookup to fetch currently active tasks, projects, and tickets.
- **Notification Center** (`NotificationBell.tsx`): Intercepts Supabase Realtime streams to alert the user of critical facility anomalies (e.g., chiller overheating). Also integrates browser Desktop Notifications and Web Audio API.
