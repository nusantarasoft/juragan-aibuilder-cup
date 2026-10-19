# Deploying Juragan to Google Cloud Run (multi-service)

Project: **`juragan-aibuilder-cup`** · Region: **`asia-southeast2`**

This repository deploys **four** HTTP services via [`cloudbuild.yaml`](../cloudbuild.yaml). Manual `gcloud builds submit` / console deploy is fine for v1 — GitHub→GCP auto-deploy is optional later.

Hermes / WhatsApp, Supabase (Kong), and S3 stay on the **VPS nusantarasoft**. Cloud Run only receives public URLs + secrets that point at that VPS. Do not provision GCP replacements for those deps in v1.

## Architecture on Cloud Run

```text
                    [VPS nusantarasoft]
                 Supabase/Kong · S3 · Hermes
                           │
                           ▼ (env URLs + secrets)
GitHub / local ──► Cloud Build (cloudbuild.yaml) ──► Artifact Registry
                                                         │
                    ┌────────────────────────────────────┼────────────────┐
                    ▼                                    ▼                ▼
              juragan-api                          juragan          juragan-landing
              (middleware/)                        (admin/)         (landing-page/)
                    │                                    │
                    └──────────────┬─────────────────────┘
                                   ▼
                           juragan-showcase
                           (brochure-gallery/)
```

Deploy order in `cloudbuild.yaml`: **API → (admin ∥ landing) → showcase**. Each `gcloud run deploy` targets the **existing** service name (revision update) — do not delete/recreate live services.

### Services

| Cloud Run service | Source | Dockerfile | Port | Notes |
|-------------------|--------|------------|------|-------|
| `juragan-api` | [`./middleware`](../middleware) | [`middleware/Dockerfile`](../middleware/Dockerfile) | `4001` | NestJS GraphQL; `GET /health`; CORS `*.run.app` |
| `juragan` | [`./admin`](../admin) | [`admin/Dockerfile`](../admin/Dockerfile) | `3000` | Product entry / FE; bakes `NEXT_PUBLIC_GRAPHQL_URL` from API URL |
| `juragan-landing` | [`./landing-page`](../landing-page) | [`landing-page/Dockerfile`](../landing-page/Dockerfile) | `3000` | Optional `NEXT_PUBLIC_CMS_API_URL`, `NEXT_PUBLIC_KASIR_WA_URL` |
| `juragan-showcase` | [`./brochure-gallery`](../brochure-gallery) | [`brochure-gallery/Dockerfile`](../brochure-gallery/Dockerfile) | `3000` | Bakes admin + landing URLs; Supabase/S3 public |

**Not on Cloud Run (v1):** Hermes / WA transport — Docker Compose on VPS.

### Artifact Registry

Default substitution `_AR_REPO=nusantarasoft` keeps the **legacy** Artifact Registry repository name. Image paths stay folder-based (`…/middleware`, `…/admin`, `…/landing-page`, `…/brochure-gallery`). Renaming AR to `juragan` is optional ops work, not required for this align.

---

## Secrets (prefer Secret Manager)

Do **not** put service-role keys, S3 credentials, or webhook HMAC in Cloud Build substitution variables (they show in build history).

Suggested secret names (create in project `juragan-aibuilder-cup`):

| Secret Manager name | Injected env | Services |
|---------------------|--------------|----------|
| `supabase-anon-key` | `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API (+ FE bake if needed) |
| `supabase-service-key` | `SUPABASE_SERVICE_KEY` | `juragan-api` |
| `s3-access-key` | `S3_ACCESS_KEY` | `juragan-api` |
| `s3-secret-key` | `S3_SECRET_KEY` | `juragan-api` |
| `whatsapp-webhook-hmac` | `WHATSAPP_WEBHOOK_HMAC_KEY` | API / Hermes bridge (VPS side often owns this) |

Example create + attach:

```bash
# Create (pipe real value once; never commit it)
printf '%s' "$SUPABASE_SERVICE_KEY" | gcloud secrets create supabase-service-key \
  --project=juragan-aibuilder-cup --data-file=-

# On deploy (extend cloudbuild deploy-api step when ready):
#   --set-secrets=SUPABASE_SERVICE_KEY=supabase-service-key:latest,\
#     S3_ACCESS_KEY=s3-access-key:latest,S3_SECRET_KEY=s3-secret-key:latest
```

Non-secret URLs (Supabase/Kong host, S3 endpoint, Hermes base URL) may stay as substitutions — point them at the **VPS**. Template: [`.env.cloudrun.example`](../.env.cloudrun.example).

---

## Option A: Manual Cloud Build submit (recommended for v1)

```bash
# From repo root — after filling VPS URLs (not inventing GCP deps)
export SUPABASE_URL="https://<vps-or-supabase-public>"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon>"   # or use Secret Manager
export S3_ENDPOINT="https://<vps-s3>"
export HERMES_BASE_URL="https://<vps-hermes>"

./scripts/deploy-cloudrun.sh juragan-aibuilder-cup asia-southeast2
```

PowerShell:

```powershell
.\scripts\deploy-cloudrun.ps1 `
  -ProjectId "juragan-aibuilder-cup" `
  -Region "asia-southeast2" `
  -SupabaseUrl "https://<vps-or-supabase-public>" `
  -SupabaseAnonKey "<anon>" `
  -S3Endpoint "https://<vps-s3>" `
  -HermesBaseUrl "https://<vps-hermes>"
```

Or:

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --project=juragan-aibuilder-cup \
  --substitutions=_REGION=asia-southeast2,_SUPABASE_URL=…,_NEXT_PUBLIC_SUPABASE_URL=…,_S3_ENDPOINT=…,_HERMES_BASE_URL=…
```

---

## Option B: Cloud Build trigger from GitHub (optional later)

1. Ensure Artifact Registry repo exists (name may be `nusantarasoft`):
   ```bash
   gcloud artifacts repositories create nusantarasoft \
     --repository-format=docker \
     --location=asia-southeast2 \
     --project=juragan-aibuilder-cup
   ```
2. Grant Cloud Build SA **Cloud Run Admin** + **Service Account User** (+ Secret Manager accessor if using `--set-secrets`).
3. Create a trigger on branch `juragan-aibuilder-cup` (or agreed branch) → config file `cloudbuild.yaml`.
4. Substitutions: `_REGION`, `_AR_REPO`, VPS URL placeholders — **not** plaintext service keys.

---

## Option C: Console deploy (per service, migration-safe)

In **Cloud Run** → open the **existing** service → **Edit & deploy new revision** (do not delete the service):

1. **`juragan-api`**: context `middleware/Dockerfile`, port `4001`, env pointing at VPS Supabase/S3/Hermes; prefer `--set-secrets` for keys; smoke `GET /health`.
2. **`juragan`**: context `admin/Dockerfile`, port `3000`, `GRAPHQL_API_URL=https://<juragan-api>.run.app/graphql`. Runtime GraphQL proxy: `admin/src/app/api/graphql/route.ts`.
3. **`juragan-landing`**: context `landing-page/Dockerfile`, port `3000`.
4. **`juragan-showcase`**: context `brochure-gallery/Dockerfile`, port `3000`, admin + landing public URLs.

---

## Smoke checklist (after a real deploy — not part of repo-align PRs)

1. `curl -sS https://<juragan-api>…/health`
2. Open `juragan`, `juragan-landing`, `juragan-showcase` `*.run.app`
3. GraphQL login from `juragan` against `juragan-api`
4. Confirm Hermes WA still answered from **VPS**, not Cloud Run

---

## Related

- Master VM path (full compose): [`deploy-master-production.md`](./deploy-master-production.md)
- AI Studio index link: [`aistudio/README.md`](./aistudio/README.md)
