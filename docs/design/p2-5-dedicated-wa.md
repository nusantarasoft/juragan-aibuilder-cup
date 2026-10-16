# P2-5 — Per-tenant dedicated WhatsApp business number (design + v1 slice)

**Status:** Implementing on `master` · **Backlog:** P2-5 · **Owner:** PO-NS3  
**Updated:** 2026-10-15  
**Builds on:** [F2-3 shared inbox v1](f2-3-tenant-wa-connection.md) (default remains **shared NS WA** + sender whitelist).

---

## 1. Target outcome

Trial **`tenant_owner`** may **opt in** to a **dedicated business WhatsApp number** (separate Hermes session per store). **Shared inbox stays the default**; no change for stores that never opt in.

| Concern | v1 behavior |
|---------|-------------|
| Default | `wa_inbox_mode=shared` — F2-3 flow unchanged |
| Opt-in | Owner enables dedicated on `/admin/connect-wa` after owner phone verified |
| Pair | Demo: `WA_DEDICATED_PAIR_MOCK=1` simulates pair; Live: `WA_TENANT_DEDICATED_PAIR=1` + Hermes `/pair/*?session=` |
| Routing inbound (Nest sim / legacy webhook) | Dedicated → match `session_name` + `business_phone`; Shared → sender ∈ whitelist |
| Outbound / “WA connected” | **Fail closed** if dedicated opted in but not paired (`wa_dedicated_paired_at` + phone) |
| Hermes prod kasir-pipe | Still one platform session until ops registers extra sessions — mapping persisted for bridge rollout |

---

## 2. Smallest safe v1 (this PR)

1. **DB:** `tenant_stores.wa_inbox_mode`, `wa_dedicated_session_name`, `wa_dedicated_business_phone`, `wa_dedicated_paired_at`; sync `studio_whatsapp_config.session_name` on opt-in/out.
2. **GraphQL (tenant-scoped):** `optInDedicatedWaInbox`, `disconnectDedicatedWaInbox`, `startDedicatedWaPair`, `syncDedicatedWaPair`, `dedicatedWaAuthQr`; extended `waConnectionStatus`.
3. **Admin UI:** Connect WA page section with **Live/Demo** banner (mock pair vs live QR).
4. **Routing:** `resolveInboundWaConfig` in middleware webhook resolver.
5. **Hermes bridge:** kasir-pipe `pair.py` accepts `?session=` for isolated session dirs under `platforms/whatsapp/sessions/{id}`.

**Not in v1:** Automatic Hermes gateway multi-profile in production compose (ops follow-up); outbound `/send` per-session on live Baileys bridge (still shared send path — document in ops).

---

## 3. Decisions

| # | Decision | Choice |
|---|----------|--------|
| D1 | Default | **Shared** NS inbox (F2-3) |
| D2 | Session name | `umkm-{studio_slug}` sanitized, max 48 chars |
| D3 | Pairing UX | Tenant `/admin/connect-wa` (not platform gateway only) when `WA_TENANT_DEDICATED_PAIR=1` |
| D4 | QA / Demo | `WA_DEDICATED_PAIR_MOCK=1` — no real QR; label **Demo** in UI |
| D5 | Fail closed | Dedicated + not paired → block **Aktifkan** and outbound gate |
| D6 | Disconnect | Logout session (live), revert `session_name` to `hermes`, clear dedicated columns |

---

## 4. References

- [docs/aistudio/umkm-wa/system/hermes-architecture.md](../aistudio/umkm-wa/system/hermes-architecture.md)
- `middleware/src/onboarding/wa-dedicated.service.ts`
- `middleware/src/studio/studio-whatsapp.util.ts` — `resolveInboundWaConfig`
