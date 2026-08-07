# QA Report: AI Studio — UMKM Penjualan WA

| Field | Value |
|-------|-------|
| **Date** | 2026-08-07 |
| **URL** | http://localhost:3003/admin/ai-studio/umkm |
| **Branch** | development-akbar |
| **Commit** | bc441ee (after fixes; baseline feature 5d9bff6) |
| **PR** | — |
| **Tier** | Standard |
| **Scope** | AI Studio UMKM (list, edit drawer, intent preview, Try in Sim) |
| **Duration** | ~25 min |
| **Pages visited** | 2 (login, /admin/ai-studio/umkm) |
| **Screenshots** | 6+ |
| **Framework** | Next.js 16 (admin) + NestJS GraphQL |
| **Index** | [All QA runs](./index.md) |

## Health Score: 78 → 88 /100

| Category | Before | After |
|----------|--------|-------|
| Console | 70 | 70 |
| Links | 100 | 100 |
| Visual | 92 | 92 |
| Functional | 78 | 92 |
| UX | 70 | 90 |
| Performance | 90 | 90 |
| Content | 95 | 95 |
| Accessibility | 72 | 85 |

## Top 3 Things to Fix

1. **ISSUE-001: Nama toko kosong saat Edit** — table tampil `tenant_id`, form label kosong → **verified**
2. **ISSUE-003: Validasi Try/Save tanpa toast jelas** — errorFields Ant Design tidak di-toast → **verified**
3. **ISSUE-002: Simulasi disabled tanpa penjelasan** — tidak ada tooltip → **verified**

## Console Health

| Error | Count | First seen |
|-------|-------|------------|
| `[antd: message] Static function can not consume context...` | intermittent | /admin/ai-studio/umkm |
| Unhandled rejection `[object Object]` | 1 (transient) | during Try automation |

## Summary

| Severity | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 3 | 3 | 0 |
| Low | 1 | 0 | 1 |
| **Total** | **4** | **3** | **1** |

**PR Summary:** QA found 4 issues on UMKM, fixed 3 medium UX gaps, health score 78 → 88.

## Happy path (verified)

- Keyword **Cek stok** ada di editor
- Preview `cek stok gula` → `Cek stok (check_stock)`
- Digit `5` → Tambah penjualan / `record_sale`
- `ya` → Konfirmasi
- Blank / `xyzzy` → Tidak cocok / unknown
- Coba di Simulasi (Toko Mie Ayam) → Save + Sim prefill + Kirim → guided stock reply

## Issues

### ISSUE-001: Nama toko kosong di Edit meski tabel menampilkan nama

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | /admin/ai-studio/umkm |
| **Fix Status** | verified |
| **Commit** | bc441ee |
| **Files Changed** | `admin/src/app/admin/ai-studio/umkm/page.tsx` |

**Repro:** Buka Edit pada row `default` (label kosong, tenant_id `default`). Tabel menampilkan "default"; field Nama toko kosong.

**Fix:** Prefill `label: row.label \|\| row.tenant_id \|\| ''`.

**Evidence:** `screenshots/issue-001-before.png`, `screenshots/issue-001-after.png` (re-test: `namaPrefill=default`).

---

### ISSUE-002: Tombol Simulasi chat disabled tanpa tooltip

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | accessibility / ux |
| **URL** | /admin/ai-studio/umkm |
| **Fix Status** | verified |
| **Commit** | bc441ee |
| **Files Changed** | `admin/src/app/admin/ai-studio/umkm/page.tsx` |

**Repro:** Hover Simulasi chat pada row WA off — tidak ada penjelasan.

**Fix:** Tooltip "Aktifkan WhatsApp dan set notebook dulu" + span wrapper agar tooltip jalan pada disabled button.

---

### ISSUE-003: Coba di Simulasi gagal validasi tanpa toast berguna

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | functional / ux |
| **URL** | /admin/ai-studio/umkm (Edit drawer → Preview) |
| **Fix Status** | verified |
| **Commit** | bc441ee |
| **Files Changed** | `admin/src/app/admin/ai-studio/umkm/page.tsx` |

**Repro:** Di row incomplete, isi preview lalu Coba di Simulasi. Error hanya inline di atas drawer; user di section Preview tidak lihat toast (Ant `errorFields` tidak punya `.message`).

**Fix:** Parse `errorFields`, `message.error(first)`, `form.scrollToField`.

**Re-test:** toast `Minimal satu nomor pemilik`.

---

### ISSUE-004: Ant Design static `message` warning (deferred)

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | console |
| **Fix Status** | deferred |

App-wide pattern; needs `App` provider wrapper. Outside UMKM-only scope.

## Deferred

- ISSUE-004 antd message App context
- Legacy row `tenant_id=default` data hygiene (ops cleanup, not code)
- Next.js issues dock overlapping click targets in narrow automation viewport (env)

## Fixes applied

| Issue | Status | Commit |
|-------|--------|--------|
| ISSUE-001 | verified | bc441ee |
| ISSUE-002 | verified | bc441ee |
| ISSUE-003 | verified | bc441ee |

Health score delta: **78 → 88**.
