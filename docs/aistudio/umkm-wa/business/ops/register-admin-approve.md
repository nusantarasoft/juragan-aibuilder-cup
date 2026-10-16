# UMKM daftar via WhatsApp + admin approve (ops / produk internal)

Date: 2026-09-12 · Status: **IMPLEMENTED**  
Trial / checklist: [register-trial.md](./register-trial.md)  
Pitch sales/tenant: [../pitch.md](../pitch.md)  
Sistem: [../../system/hermes-architecture.md](../../system/hermes-architecture.md)

Dokumen **ops internal** (bukan pintu sales). Sales mulai dari [pitch.md](../pitch.md).

---

## Context

Dulu pemilik toko **tidak bisa daftar sendiri**. Admin harus isi form di `/admin/ai-studio/umkm`. Nomor yang belum terdaftar diabaikan bot (tidak ada balasan berguna).

Keputusan produk: owner chat ke nomor bisnis → funnel **DAFTAR** → **admin approve** di CMS → baru aktif sebagai kasir.

OTP / bayar: out of scope v1.

---

## Goals / Non-goals

**Goals**

- Nomor asing bisa mulai daftar lewat chat (`DAFTAR`)
- Draft tersimpan sampai admin approve/reject
- Setelah approve: toko aktif; owner langsung bisa kasir
- Admin melihat antrian pending di halaman UMKM

**Non-goals (v1)**

- OTP / payment gate
- Multi-toko per nomor
- Self-serve katalog seed besar
- Chat kasir lewat jalur webhook lama

---

## User flows

### Owner (WhatsApp)

```
[belum terdaftar]
  "halo" / apa saja → bot: arahkan *DAFTAR*
  DAFTAR → tanya nama toko → konfirmasi → tunggu approve / *STATUS*
  jual/stok/... → ditolak lembut: belum aktif

[sudah terdaftar]
  → kasir seperti biasa (stok, jual, laporan, tutup toko — chat teks)
```

### Admin (CMS)

```
/admin/ai-studio/umkm
  "Menunggu approve"
  Row: waktu, nomor WA, nama toko → Approve | Tolak
  Approve → toko aktif + (best-effort) WA "Toko X aktif. Coba: cek stok"
  Tolak → rejected + optional alasan
```

---

## Acceptance Criteria (produk)

1. Nomor belum terdaftar yang kirim `halo` mendapat balasan yang menyebut *DAFTAR* (bukan diam).
2. Alur `DAFTAR` → nama toko → `YA` menghasilkan antrian pending di CMS.
3. `STATUS` pada pending menjelaskan menunggu approve.
4. Admin di `/admin/ai-studio/umkm` bisa **Approve** / **Tolak**.
5. Setelah Approve, nomor itu bisa `cek stok` (kasir hidup).
6. Tolak: owner mendapat kejelasan (STATUS / notifikasi).
7. Satu nomor tidak punya dua pendaftaran terbuka sekaligus.
8. Draft/pending > 7 hari dianggap kedaluwarsa.
9. Perilaku nomor yang sudah terdaftar tidak berubah (regresi kasir).

Checklist trial lengkap: [register-trial.md §8](./register-trial.md).

---

## Related

- Pitch sales: [../pitch.md](../pitch.md)
- Arsitektur: [hermes-architecture.md](../../system/hermes-architecture.md)
- Ops / smoke: [hermes-local.md](../../system/hermes-local.md)
- Gaps: [hermes-gaps.md](../../system/hermes-gaps.md)
- Diagram: [`diagrams/aistudio/umkm-wa/business/`](../../../../../diagrams/aistudio/umkm-wa/business/)
