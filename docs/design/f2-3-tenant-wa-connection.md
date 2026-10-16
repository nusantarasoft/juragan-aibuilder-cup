# F2-3 — Tenant WhatsApp channel connect (design draft)

**Status:** Design locked (Akbar approved #47) · **Backlog:** F2-3 · **Owner:** PO-NS3  
**Updated:** 2026-10-15  
**Scope:** Productize **self-serve WA connect** for trial **`tenant_owner`** after F2-1 signup and F2-2 Kasir recruit. Builds on locked F2-1 whitelist (D13) and F2-2 ordering (D10: recruit → then connect WA).

Related: [docs/design/f2-1-tenant-onboarding.md](f2-1-tenant-onboarding.md), [docs/design/f2-2-agent-catalog-recruit.md](f2-2-agent-catalog-recruit.md), [middleware/STUDIO_WHATSAPP.md](../../middleware/STUDIO_WHATSAPP.md), [docs/aistudio/umkm-wa/system/hermes-architecture.md](../aistudio/umkm-wa/system/hermes-architecture.md).

---

## 1. Target outcome (Fase 2)

After email-verified login and **first Kasir recruit** (F2-2), a **`tenant_owner`** can:

1. **Connect** the store’s WhatsApp channel without platform-admin handholding (no manual AI Studio UMKM form for wedge tenants).
2. **Verify owner phone** on the F2-1 per-store whitelist so only approved numbers can drive the Kasir agent via WA.
3. Reach **“WA connected”** state so F2-2 outbound guardrails unlock customer-facing sends (cron push, future agent tools).
4. See honest status in Virtual Office / recruit follow-up (“Kasir aktif — WA belum terhubung” vs “WA terhubung”).

Out of scope for minimal F2-3: multi-agent per-channel routing (F3-1), billing, replacing Hermes/kasir-pipe architecture, per-tenant Baileys session (unless Akbar chooses it in §5).

---

## 2. How it works today

### 2.1 F2-1 provisioning & whitelist (web vs WA DAFTAR)

| Step | Behavior | Evidence |
|------|----------|----------|
| Single provisioner | Web `/register` and WA **DAFTAR** both call `TenantProvisioningService.provisionStore`. | `middleware/src/onboarding/tenant-provisioning.service.ts:53-178` |
| UUID + studio slug | Creates `tenants`, `tenant_slug_aliases`, `tenant_stores` (`studio_slug`). | `tenant-provisioning.service.ts:83-124` |
| Notebook + WA config stub | Creates notebook + `setupUmkmNotebook`; upserts `studio_whatsapp_config` keyed by **string** `studio_slug`. | `tenant-provisioning.service.ts:142-164` |
| Web signup WA state | **`enabled: false`** until owner connects; notebook id set; owner phone optional at signup. | `tenant-provisioning.service.ts:156-157` |
| WA DAFTAR state | **`enabled: true`** when owner phone present on provision. | `tenant-provisioning.service.ts:156-157` |
| F2-1 whitelist table | `tenant_wa_whitelist` (owner + staff); syncs to `studio_whatsapp_config.business_phone` + `allowlist_phones`. | `middleware/src/onboarding/wa-whitelist.service.ts:27-38`, `supabase/migrations/20261015120000_f2_1_tenant_onboarding.sql:27-35` |
| Owner UI (partial) | `/admin/onboarding/wa-whitelist` — link owner phone, add staff, GraphQL `linkOwnerWhatsApp` / `addWaWhitelistStaff`. | `admin/src/app/admin/onboarding/wa-whitelist/page.tsx:63-69`, `middleware/src/onboarding/onboarding.resolver.ts:138-167` |
| F2-1 decision D13 | Only **whitelisted** numbers may use store agents on WA paths. | `docs/design/f2-1-tenant-onboarding.md` §4 D13 |

### 2.2 Hermes / middleware WA paths (production inbound)

| Layer | Behavior | Evidence |
|-------|----------|----------|
| Production inbound | **Hermes** (kasir-pipe) handles live WA; middleware webhook **410** by default. | `middleware/STUDIO_WHATSAPP.md:3-4`, `:46` |
| Outbound | Middleware `HermesProvider` → `HERMES_BRIDGE_URL` `/send`. | `middleware/src/whatsapp/hermes.provider.ts:11-16`, `:71-76` |
| Nest sim / admin | `simulateInboundMessage` + legacy webhook path for **Simulasi chat** only. | `middleware/src/studio/studio-whatsapp.service.ts:428-455` |
| Inbound mapping (Nest) | Requires `studio_whatsapp_config.enabled` + `notebook_id`; sender must map to a tenant config. | `studio-whatsapp.service.ts:393-400` |
| Owner phone → tenant | `resolveUmkmContextByOwnerPhone` scans `studio_whatsapp_config` allowlist fields. | `middleware/src/studio/studio-umkm.service.ts:2418-2428` |
| Kasir consult hop | Hermes → `POST /internal/kasir-consult` (Docker-internal, `X-Kasir-Consult-Key`). | `middleware/src/studio/internal-kasir-consult.controller.ts:38-61` |
| AOS task mirror | Each consult hop → `aos_tasks` (`source: kasir_wa`). | `middleware/src/studio/kasir-consult-aos-task.service.ts` (see `docs/aistudio/umkm-wa/business/ops/consult-kurikulum.md`) |

### 2.3 Manual ops path (pre–F2-3 product)

| Step | Manual? | Evidence |
|------|---------|----------|
| Pair business WhatsApp (QR) | **Manual** — Admin **WhatsApp Gateway** (`/admin/ai-studio/ai-gateway`) | `middleware/STUDIO_WHATSAPP.md:31-33`, `admin/src/app/admin/ai-studio/ai-gateway/page.tsx:288+` |
| Enable UMKM + allowlist | **Manual** — AI Studio UMKM admin or gateway form | `middleware/STUDIO_WHATSAPP.md:37-38`, `admin/src/app/admin/ai-studio/umkm/page.tsx:568+` |
| WA DAFTAR auto-provision | Cron provisions pending registrations (F2-1 instant trial). | `middleware/src/studio/studio-umkm.cron.ts:30-49` |

### 2.4 F2-2 outbound block until WA connected

| Concern | Behavior | Evidence |
|---------|----------|----------|
| Agent guardrail flag | Recruited Kasir sets `guardrails.blockCustomerOutboundUntilWa: true`. | `middleware/src/agentic-os/aos-recruit.catalog.ts:73-79` |
| Server gate | `isTenantWaChannelConnected`: `studio_whatsapp_config.enabled` **and** `notebook_id`. | `middleware/src/agentic-os/aos-wa-outbound-gate.ts:4-15` |
| Outbound send | `sendOutboundText` skips when gate throws `WaOutboundBlockedError`. | `middleware/src/studio/studio-whatsapp.service.ts:92-110` |
| Cron daily report | Passes **studio string** `cfg.tenant_id` into gate (same column as slug). | `middleware/src/studio/studio-umkm.cron.ts:131-135` |
| Product order | F2-2 **D10**: recruit Kasir **before** WA connect in happy path. | `docs/design/f2-2-agent-catalog-recruit.md` §5 D10 |
| Recruit UI gap | `/admin/recruit` shows “Aktif di kantor virtual” but **no** connect-WA CTA yet. | `admin/src/app/admin/recruit/page.tsx:128-132` |

### 2.5 Tenant ID bridge (implementation debt)

| Concern | Today |
|---------|--------|
| AOS / JWT | Canonical **`public.tenants.id` (UUID)**. |
| `studio_whatsapp_config.tenant_id` | Legacy **studio slug** string (e.g. `umkm-warung-bu-ani`). |
| Outbound gate lookup | Queries `studio_whatsapp_config` by passed id — works when caller passes **slug** (cron); **may miss** if caller passes UUID without alias resolution. | `aos-wa-outbound-gate.ts:8-11` vs `aos-kasir-live.service.ts:130-150` (slug fallback chain) |

F2-3 implementation should **resolve UUID → `tenant_stores.studio_slug`** (or store alias) before any WA config read/write.

---

## 3. Gaps vs target (Akbar F2-3 backlog)

Target: **Connect channel (WA) per agent/tenant, without manual setup** — after recruit, owner completes WA in-product.

| Gap | Impact |
|-----|--------|
| QR pairing lives in **platform** AI Studio gateway, not owner onboarding | Trial owners need admin/ops to pair |
| No guided **post-recruit** funnel | Recruited Kasir cannot message customers; owner may not discover `/admin/onboarding/wa-whitelist` |
| **“Connected”** is implicit (`enabled` + notebook) | Hermes session health / business number not surfaced to owner |
| **Shared Hermes inbox** vs per-store | All UMKM share kasir-pipe session; routing relies on allowlist + config rows (ops complexity) |
| Whitelist UI disconnected from recruit / VO | F2-1 page exists but is not the primary “hubungkan WA” story |
| UUID ↔ slug not unified in WA gate | Risk of false “not connected” or wrong tenant row updates |
| Tenant_owner may still see **AI Studio UMKM** admin patterns | Confusing duplicate surfaces (F2-2 hid enterprise Agent Studio, not Studio admin) |
| Abuse | No product rate limits on pairing / whitelist mutations (F2-1 limits signup only) |

---

## 4. Proposed minimal flow (locked — implement on `master`)

Design goal: **smallest vertical slice** — owner with recruited Kasir verifies phone on the **shared NS WhatsApp** inbox (Hermes/kasir session already paired by platform ops), whitelists staff, then **explicitly activates** Kasir WA. **No tenant QR pairing in v1.**

### 4.1 Happy path (post F2-2 recruit)

```mermaid
sequenceDiagram
    participant Owner
    participant Admin as Admin/Next
    participant GQL as Middleware GraphQL
    participant DB as Postgres
    participant Hermes as Hermes (shared NS WA)

    Owner->>Admin: After recruit → "Hubungkan WhatsApp"
    Admin->>GQL: myTenantStore + waConnectionStatus
    Owner->>Admin: Enter owner phone (web signup path)
    Admin->>GQL: requestOwnerWaOtp
    Hermes-->>Owner: OTP code (prod); QA uses mock/test hook — no real customer blast
    Owner->>Admin: Enter OTP
    Admin->>GQL: verifyOwnerWaOtp → tenant_wa_whitelist (owner) + verified flag
    Owner->>Admin: Manage staff whitelist (max 5)
    Owner->>Admin: Tap "Aktifkan" (explicit — not auto on verify)
    Admin->>GQL: activateWaKasirChannel → studio_whatsapp_config.enabled=true
    GQL->>DB: notebook_id + slug row; resolve UUID↔studio_slug
    Admin-->>Owner: "WA terhubung"; F2-2 outbound gate lifts
```

**Logical steps:**

1. **Entry:** CTA immediately after Kasir recruit (`/admin/recruit` → `/admin/connect-wa`); VO Kasir HUD secondary.
2. **Phone (web signup):** Capture owner phone on this step if missing at register.
3. **Verify:** OTP delivered **over WA** to owner phone on the shared line; QA/tests use `WA_OTP_MOCK` / dev mint — **never** send marketing to real customers in CI.
4. **Whitelist:** `tenant_wa_whitelist` is routing source of truth; sync to `studio_whatsapp_config.allowlist_phones` + `business_phone`. Inbound Kasir resolves store by **sender ∈ whitelist** on shared number.
5. **Pair Hermes:** **Platform admin only** (`/admin/ai-studio/ai-gateway`) — unchanged; tenants never see QR.
6. **Activate:** Owner taps **"Aktifkan"** after verify; sets `enabled: true` only when notebook + verified owner + explicit activation recorded.
7. **Unlock:** `isTenantWaChannelConnected` = owner verified **and** Kasir WA activated **and** `notebook_id` → lifts F2-2 outbound gate.

### 4.2 Data model (v1 — mostly existing tables)

| Entity | Role in F2-3 |
|--------|----------------|
| `tenant_stores` | Links UUID tenant ↔ `studio_slug` |
| `tenant_slug_aliases` | Slug dedup / legacy migration |
| `tenant_wa_whitelist` | Source of truth for owner/staff phones (F2-1) |
| `studio_whatsapp_config` | Channel row per slug: `enabled`, `notebook_id`, `business_phone`, `allowlist_phones`, `session_name` |
| `studio_notebooks` | Kasir RAG / UMKM context (created at F2-1 provision) |
| `aos_agents` | Recruited Kasir (`umkm-kasir`); guardrail `blockCustomerOutboundUntilWa` |
| *(optional new)* `tenant_wa_connection_events` | Audit: paired, enabled, disabled, failed pair — **Akbar** |

No new Hermes table required for minimal slice if status is derived from bridge `/status` + config flags.

### 4.3 Security & abuse

| Requirement | Approach |
|-------------|----------|
| Tenant isolation | All mutations via JWT + `TenantMembershipService.assertTenantAccess`; resolve `storeId` only within caller’s tenant |
| Who can pair / enable | **Platform `admin` only** pairs Hermes; **`tenant_owner`** verifies phone, manages whitelist, **Aktifkan** |
| Whitelist integrity | Normalize phones (`normalizePhoneDigits`); **max 5 staff** numbers per store (owner separate) |
| OTP abuse | Rate-limit `requestOwnerWaOtp` / verify per store, phone, and IP (mirror F2-1 onboarding limits) |
| Pairing abuse | Tenants have no pair UI; Hermes bridge stays Docker-internal |
| Outbound | Keep `assertTenantOutboundCustomerSendAllowed` until connected; do not bypass for trial |
| Inbound (Hermes) | Continue service-role / plugin allowlist; optional: sync Hermes allowlist read from `tenant_wa_whitelist` |
| Secrets | Hermes bridge stays Docker-internal; no QR tokens in browser logs |

---

## 5. Decisions (approved — Akbar #47)

| # | Decision | **Locked choice** |
|---|----------|-------------------|
| D1 | Primary UX | **`/admin/connect-wa` wizard** (phone → OTP → whitelist → Aktifkan). `/admin/onboarding/wa-whitelist` remains advanced staff management. |
| D2 | Hermes QR / pair | **Platform admin only** — existing AI Studio gateway. Tenants **no QR pair** in v1. |
| D3 | Hermes topology | **One shared NS WhatsApp** (existing Hermes/kasir session). Tenant isolation = **sender on `tenant_wa_whitelist`** + `tenant_stores.studio_slug` config row. **Backlog:** per-tenant business numbers → [docs/backlog.md](../backlog.md) P2-5. |
| D4 | “WA connected” (lifts F2-2 outbound) | **Owner phone verified (OTP)** **AND** **Kasir WA explicitly activated (“Aktifkan”)** **AND** `notebook_id` present. Resolve tenant UUID → `studio_slug` before config reads. |
| D5 | Owner phone verification | **OTP over WhatsApp** to owner phone. Production sends via Hermes outbound to owner only; **QA/CI: mock/simulate** — no real customer messages. |
| D6 | Channel scope | **One WA channel per store**, **Kasir agent only** in v1. |
| D7 | Post-recruit CTA | **Immediately after Kasir recruit** — recruit success → connect wizard (banner on `/admin/recruit` when Kasir recruited but not connected). |
| D8 | AI Studio UMKM for `tenant_owner` | **Hide / redirect to connect wizard** — wedge owners must not land on enterprise UMKM CMS. Platform `admin`/`super_admin` keep full `/admin/ai-studio/umkm`. Implementation: layout guard or route middleware redirect to `/admin/connect-wa` with one-line status. |
| D9 | Staff whitelist | **Owner self-serve**, **max 5** staff numbers (+ owner). Enforced in GraphQL + DB check. |
| D10 | Enable timing | **Explicit “Aktifkan”** — **not** auto-enable on OTP verify or Hermes status alone. |
| D11 | Web signup without phone | **Capture phone at connect step**; block Aktifkan until OTP verified. |
| D12 | Legacy Klontong | **`tenant_slug_aliases` + `tenant_stores.studio_slug`** (`umkm-warung-klontong-bahagia`); single `studio_whatsapp_config` row — no duplicate config / data loss. |

### 5.1 Future (not v1)

| Backlog | Item |
|---------|------|
| **P2-5** | Per-tenant dedicated WhatsApp business number + optional tenant-scoped Hermes session (isolation, billing hook). |
| **P3-5** | Multi-agent per-channel routing (F3-1 adjacency). |

---

## 6. Implementation notes (for eng PR)

| Area | Rule |
|------|------|
| Outbound gate | Update `isTenantWaChannelConnected` — slug resolution + verified + activated flags on `tenant_stores` (or equivalent). |
| Inbound / consult | Prefer `tenant_wa_whitelist` when resolving sender → store on shared inbox; keep `studio_whatsapp_config` sync via `WaWhitelistService`. |
| GlobalAuthGuard | All connect mutations require JWT; `tenant_owner` scoped to own `storeId` / `tenantId`. |
| OTP | `WA_OTP_MOCK=true` or test-only GraphQL mint returns code; rate limits shared pattern with `onboarding-rate-limit.ts`. |

---

## 7. References

| Doc / code | Relevance |
|------------|-----------|
| [docs/backlog.md](../backlog.md) | F2-3 item |
| [docs/ops/f2-2-recruit-flow.md](../ops/f2-2-recruit-flow.md) | Outbound blocked until F2-3 |
| [docs/ops/f2-1-prod-readiness.md](../ops/f2-1-prod-readiness.md) | `/admin/onboarding/wa-whitelist` |
| [docs/aistudio/umkm-wa/business/ops/register-admin-approve.md](../aistudio/umkm-wa/business/ops/register-admin-approve.md) | WA DAFTAR pipeline |
| `middleware/src/agentic-os/aos-wa-outbound-gate.ts` | Connected predicate |
| `middleware/src/onboarding/wa-whitelist.service.ts` | Whitelist sync |
| `admin/src/app/admin/ai-studio/ai-gateway/page.tsx` | QR pair UI today |

---

*Implementation PR(s) on `master` follow locked decisions in §5. No deploy from this design doc alone.*
