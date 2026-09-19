# Design: UMKM daftar via WhatsApp + admin approve

Date: 2026-09-12  
Branch context: `master` / `master-production`  
Status: IMPLEMENTED (code) — lihat jalur trial CEO di [umkm-wa-register-trial.md](./umkm-wa-register-trial.md)  
Related: Hermes kasir-pipe allowlist, Admin AI Studio UMKM page  

**Trial / AIDLC / keputusan REDUCTION (2026-09-19):** [umkm-wa-register-trial.md](./umkm-wa-register-trial.md) — diagram bisnis, state machine, checklist E2E, tasks T1–T7.

## Context

Hari ini pemilik toko **tidak bisa daftar sendiri**. Admin harus isi form di `/admin/ai-studio/umkm`. Nomor yang belum di `studio_whatsapp_config` di-skip Hermes (`kasir-pipe` → `action: skip`) tanpa balasan berguna.

Keputusan produk: owner chat ke nomor admin → funnel **DAFTAR** → **admin approve** di CMS → baru aktif sebagai kasir.

OTP / bayar: out of scope v1.

## Current State (verified 2026-09-12)

| Piece | Behavior |
|-------|----------|
| Shared WA inbox | Satu nomor Hermes (pair di AI Gateway) |
| Allowlist | `studio_whatsapp_config.business_phone ∪ allowlist_phones` |
| Non-allowlisted | `kasir-pipe` `_on_pre_gateway_dispatch` → `skip` (no agent, no reply) |
| Kasir chat | Hermes agent + `kasir-tools` → Supabase (bukan middleware) |
| Admin create UMKM | `admin/.../ai-studio/umkm/page.tsx` → notebook + `updateStudioWhatsAppConfig` |

## Goals / Non-goals

**Goals**
- Nomor asing bisa mulai daftar lewat chat (`DAFTAR`)
- Draft tersimpan sampai admin approve/reject
- Setelah approve: tenant + notebook + allowlist aktif; owner langsung bisa kasir
- Admin melihat antrian pending di halaman UMKM

**Non-goals (v1)**
- OTP / payment gate
- Multi-toko per nomor
- Self-serve katalog seed besar
- Forward inbound ke middleware Studio webhook

## User flows

### Owner (WhatsApp)

```
[belum allowlist]
  "halo" / apa saja → bot: "Ketuk *DAFTAR* untuk daftar kasir UMKM, atau hubungi admin."
  DAFTAR → tanya nama toko → konfirmasi nomor → "Draft terkirim. Tunggu approve admin. Ketik *STATUS*."
  STATUS → pending | rejected | (kalau sudah aktif: "Toko aktif. Coba: cek stok")
  jual/stok/... → ditolak lembut: "Belum aktif. Ketik STATUS atau tunggu approve."

[sudah allowlist]
  → kasir agent seperti sekarang (SOUL + kasir-tools)
```

### Admin (CMS)

```
/admin/ai-studio/umkm
  Tab/section "Menunggu approve"
  Row: waktu, nomor WA, nama toko, tombol Approve | Tolak
  Approve → create tenant+notebook+config (reuse logic Tambah UMKM)
           → kirim WA: "Toko X aktif. Coba: cek stok"
  Tolak → status rejected + optional alasan → WA notifikasi
```

## Architecture

```
WA message
  → kasir-pipe pre_gateway_dispatch
       ├─ allowlisted → agent (kasir-tools) [unchanged]
       └─ not allowlisted → registration mini-handler (NOT full LLM)
              ├─ keyword DAFTAR / STATUS / answers wizard
              ├─ write studio_umkm_registrations
              └─ outbound reply via bridge
Admin Approve (GraphQL)
  → middleware mutation
  → create notebook + setupUmkm + upsert studio_whatsapp_config
  → update registration status=approved
  → optional notify WA via Hermes outbound
```

**Kenapa non-allowlisted tidak pakai LLM agent dulu:** hemat biaya, hindari tool_search/jailbreak, state machine jelas. Setelah approve baru LLM kasir.

## Data model

New table `studio_umkm_registrations`:

```sql
create table public.studio_umkm_registrations (
  id uuid primary key default gen_random_uuid(),
  phone text not null,                 -- digits only, e.g. 628xxx
  store_name text,
  owner_name text,
  status text not null default 'draft'
    check (status in ('draft','pending','approved','rejected','expired')),
  tenant_id text,                      -- set on approve
  notebook_id uuid,
  reject_reason text,
  wizard_step text,                    -- ask_store_name | confirm_phone | done
  session_name text not null default 'hermes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  approved_at timestamptz,
  approved_by uuid                     -- admin user id if available
);

create unique index studio_umkm_registrations_phone_open_uidx
  on public.studio_umkm_registrations (phone)
  where status in ('draft','pending');

create index studio_umkm_registrations_status_idx
  on public.studio_umkm_registrations (status, created_at desc);
```

## Implementation details

### 1. `kasir-pipe` — non-allowlist path

File: `scripts/master-production/hermes-plugins/kasir-pipe/__init__.py`

Today (~L343–360): deny → `skip` silent.

Change:
- If not allowlisted → call `_handle_registration(event)` which:
  - Parses text
  - Updates/creates registration row via Supabase REST (same env as kasir-tools)
  - Sends reply through WhatsApp bridge (reuse pair/outbound path or Hermes send API)
  - Returns `skip` so LLM agent **tidak** jalan
- Keywords (case-insensitive): `daftar`, `status`, `batal`
- Wizard:
  1. `DAFTAR` → set step `ask_store_name`, reply tanya nama toko
  2. Free text (step ask_store_name) → save `store_name`, step `confirm_phone`, reply "Nomor ini jadi pemilik *{store}*? Ketik *YA*"
  3. `YA` → status `pending`, notify… (optional admin ping later), reply tunggu approve
  4. `STATUS` → baca row open/latest

TTL: expired after 7 days; draft without confirm also expires.

### 2. Middleware GraphQL — approve/reject

Extend studio WhatsApp / UMKM resolvers (pattern from existing `updateStudioWhatsAppConfig` + `studioSetupUmkmNotebook`):

- `studioUmkmRegistrations(status: pending)` list
- `studioApproveUmkmRegistration(id)`:
  1. Load pending row
  2. Slug tenant from `store_name` (same as UMKM page)
  3. Create notebook + `setupUmkmNotebook`
  4. Upsert `studio_whatsapp_config` (`business_phone` + `allowlist_phones` = phone, `enabled=true`, `session_name=hermes`)
  5. Mark registration approved + tenant_id/notebook_id
  6. Best-effort WA notify via Hermes bridge
- `studioRejectUmkmRegistration(id, reason?)`

### 3. Admin UI

File: `admin/src/app/admin/ai-studio/umkm/page.tsx`

- Section **Menunggu approve** above daftar UMKM
- Approve / Tolak actions
- After approve, row moves to active list (existing configs)

### 4. SOUL / tools

- Update `hermes-home/SOUL.md`: nomor belum aktif → arahkan *DAFTAR* / *STATUS* (agent biasanya tidak lihat mereka, tapi jaga-jaga kalau allowlist miss)
- Jangan expose write-registration tools ke agent allowlisted (wizard tetap di pipe)

## Acceptance Criteria

1. Nomor **tidak** di allowlist yang kirim `halo` mendapat balasan yang menyebut *DAFTAR* (bukan silent drop).
2. Alur `DAFTAR` → nama toko → `YA` menghasilkan row `studio_umkm_registrations` dengan `status=pending`.
3. `STATUS` pada pending membalas bahwa menunggu approve admin.
4. Admin di `/admin/ai-studio/umkm` melihat pending dan bisa **Approve**.
5. Setelah Approve: row `studio_whatsapp_config` exists, `enabled=true`, phone di allowlist; registration `approved`.
6. Nomor yang sama setelah approve bisa `cek stok` / tool kasir (agent path).
7. **Tolak** set `rejected` + user dapat balasan jika kirim `STATUS` atau notifikasi reject.
8. Nomor yang sudah punya open `draft|pending` tidak membuat duplikat (unique partial index).
9. Registration `draft|pending` > 7 hari di-treat expired (query/STATUS).
10. Allowlisted sender behavior tidak berubah (regresi kasir tools).
11. Unit tests: wizard transitions + approve creates config; pipe deny path replies.
12. Tidak ada forward webhook ke middleware untuk chat kasir (tetap Hermes-direct).

## Testing Plan

| Layer | What | Count |
|-------|------|-------|
| Unit | Registration wizard state machine (DAFTAR/YA/STATUS) | +4 |
| Unit | Approve builds tenant slug + config payload | +2 |
| Integration | Insert pending → approve → allowlist match `_sender_allowed` | +2 |
| E2E / remote smoke | Unlisted phone DAFTAR…; admin approve; cek stok | +1 |

## Effort Estimate

- Schema + RLS/service-role access: ~2h  
- kasir-pipe registration handler + outbound reply: ~4–6h  
- GraphQL approve/reject + reuse setup notebook: ~3–4h  
- Admin UMKM pending UI: ~3h  
- Tests + prod smoke script: ~3h  
**Total ~15–18h** (CC+gstack compressed; human review gate penting di approve path)

## Rollback Plan

- Feature flag env `KASIR_REGISTRATION=0` → restore silent skip for non-allowlist
- Drop/ignore `studio_umkm_registrations` (no impact on existing configs)
- Revert admin UI section independently

## Open questions (non-blocking for v1)

1. Apakah admin dapat WA ping saat ada pending baru? (nice-to-have: cron/notify ke `KASIR_AGENT_PHONES`)
2. Nama toko duplikat → suffix `-2` pada tenant slug (ikuti logic existing UMKM page)
