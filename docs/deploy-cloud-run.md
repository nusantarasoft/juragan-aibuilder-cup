# Deploying Juragan to Google Cloud Run (multi-service)

Project: **`juragan-aibuilder-cup`** · Region: **`asia-southeast2`**

This repository deploys **three** HTTP services via [`cloudbuild.yaml`](../cloudbuild.yaml). Manual `gcloud builds submit` / console deploy is fine for v1 — GitHub→GCP auto-deploy is optional later.

**Out of scope:** `juragan-landing` / `landing-page/` is **not** deployed to Cloud Run (Akbar decision).

Hermes / WhatsApp, Supabase (Kong), and S3 stay on the **VPS nusantarasoft**. Cloud Run only receives public URLs + Secret Manager refs that point at that VPS. Do not provision GCP replacements for those deps in v1.

## Architecture on Cloud Run

```text
                    [VPS nusantarasoft]
                 Supabase/Kong · S3 · Hermes
                           │
                           ▼ (env URLs + Secret Manager)
GitHub / local ──► Cloud Build (cloudbuild.yaml) ──► Artifact Registry
                                                         │
                    ┌────────────────────────────────────┼────────┐
                    ▼                                    ▼        ▼
              juragan-api                          juragan   juragan-showcase
              (middleware/)                        (admin/)  (brochure-gallery/)
```

Deploy order in `cloudbuild.yaml`: **API → admin → showcase**. Each `gcloud run deploy` targets the **existing** service name (revision update) — do not delete/recreate live services.

### Services

| Cloud Run service | Source | Dockerfile | Port | Notes |
|-------------------|--------|------------|------|-------|
| `juragan-api` | [`./middleware`](../middleware) | [`middleware/Dockerfile`](../middleware/Dockerfile) | `4001` | NestJS GraphQL; `GET /health`; CORS `*.run.app` |
| `juragan` | [`./admin`](../admin) | [`admin/Dockerfile`](../admin/Dockerfile) | `3000` | Product entry / FE; bakes `NEXT_PUBLIC_GRAPHQL_URL` from API URL |
| `juragan-showcase` | [`./brochure-gallery`](../brochure-gallery) | [`brochure-gallery/Dockerfile`](../brochure-gallery/Dockerfile) | `3000` | Bakes admin URL + optional `_NEXT_PUBLIC_LANDING_URL`; Supabase/S3 public |

**Not on Cloud Run (v1):** Hermes / WA transport (VPS); **`landing-page/`** (out of scope).

### Artifact Registry

Default substitution `_AR_REPO=nusantarasoft` keeps the **legacy** Artifact Registry repository name. Image paths stay folder-based (`…/middleware`, `…/admin`, `…/brochure-gallery`). Renaming AR to `juragan` is optional ops work, not required for this align.

---

## Secrets (Secret Manager + `--set-secrets`)

Do **not** put service-role keys, S3 credentials, anon keys, or webhook HMAC in Cloud Build substitution variables (they show in build history).

### Exact secret ids (must match `cloudbuild.yaml`)

| Secret Manager id | Injected env var(s) | Used by |
|-------------------|---------------------|---------|
| `supabase-anon-key` | `SUPABASE_ANON_KEY` (api); `NEXT_PUBLIC_SUPABASE_ANON_KEY` (admin + showcase bake + runtime) | all three |
| `supabase-service-key` | `SUPABASE_SERVICE_KEY` | `juragan-api`, `juragan-showcase` |
| `s3-access-key` | `S3_ACCESS_KEY` | all three |
| `s3-secret-key` | `S3_SECRET_KEY` | all three |
| `whatsapp-webhook-hmac-key` | `WHATSAPP_WEBHOOK_HMAC_KEY` | `juragan-api` only (optional) |

Fill values from the **live VPS / dashboards** — do not invent secrets.

### Ops: create secrets (Akbar)

```bash
PROJECT=juragan-aibuilder-cup
# Values from VPS — paste once; never commit.
printf '%s' "$SUPABASE_ANON_KEY" | gcloud secrets create supabase-anon-key \
  --project="$PROJECT" --replication-policy=automatic --data-file=-
printf '%s' "$SUPABASE_SERVICE_KEY" | gcloud secrets create supabase-service-key \
  --project="$PROJECT" --replication-policy=automatic --data-file=-
printf '%s' "$S3_ACCESS_KEY" | gcloud secrets create s3-access-key \
  --project="$PROJECT" --replication-policy=automatic --data-file=-
printf '%s' "$S3_SECRET_KEY" | gcloud secrets create s3-secret-key \
  --project="$PROJECT" --replication-policy=automatic --data-file=-

# Optional WA HMAC (Hermes bridge):
printf '%s' "$WHATSAPP_WEBHOOK_HMAC_KEY" | gcloud secrets create whatsapp-webhook-hmac-key \
  --project="$PROJECT" --replication-policy=automatic --data-file=-

# Add a new version later (secret already exists):
# printf '%s' "$NEW_VALUE" | gcloud secrets versions add SECRET_ID --data-file=-
```

If a secret already exists, use `gcloud secrets versions add <id> --data-file=-` instead of `create`.

### Ops: IAM (Cloud Build + Cloud Run)

Cloud Build needs **Secret Manager Secret Accessor** to bake the anon key and to deploy with `--set-secrets`. Cloud Run runtime SAs also need accessor on the secrets they mount.

```bash
PROJECT=juragan-aibuilder-cup
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
# Default Compute SA used by Cloud Run unless customized:
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SECRET in supabase-anon-key supabase-service-key s3-access-key s3-secret-key; do
  gcloud secrets add-iam-policy-binding "$SECRET" --project="$PROJECT" \
    --member="serviceAccount:${CB_SA}" --role="roles/secretmanager.secretAccessor"
  gcloud secrets add-iam-policy-binding "$SECRET" --project="$PROJECT" \
    --member="serviceAccount:${RUN_SA}" --role="roles/secretmanager.secretAccessor"
done
# If using optional WA HMAC, repeat for whatsapp-webhook-hmac-key.
```

Also grant the Cloud Build SA **Cloud Run Admin** + **Service Account User** (Cloud Build → Settings).

### How `cloudbuild.yaml` wires them

- **Runtime:** each `gcloud run deploy` uses `--set-secrets=ENV=secret-id:latest` (revision update, migration-safe).
- **Build (Next.js):** `availableSecrets` exposes `supabase-anon-key` as `SM_SUPABASE_ANON_KEY` for admin/showcase `--build-arg`.
- **Optional WA:** set substitution `_SECRET_WA_HMAC=whatsapp-webhook-hmac-key` on submit to attach HMAC on `juragan-api`.

### Non-secret env (URLs / names — substitutions OK)

| Var | Service | Notes |
|-----|---------|-------|
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | api / FE | VPS Kong or public Supabase URL |
| `S3_ENDPOINT` / `NEXT_PUBLIC_S3_*` | all | VPS MinIO/S3 endpoint |
| `S3_BUCKET` / `S3_REGION` | all | bucket + region names |
| `HERMES_BASE_URL` | api | Hermes on VPS |
| `NEXT_PUBLIC_GRAPHQL_URL` / `GRAPHQL_API_URL` | admin | filled from `juragan-api` URL after deploy |
| `NEXT_PUBLIC_ADMIN_URL` | showcase | filled from `juragan` URL after deploy |

Template: [`.env.cloudrun.example`](../.env.cloudrun.example).

---

## Option A: Manual Cloud Build submit (recommended for v1)

**Before first deploy:** create the four required secrets + IAM above.

```bash
# From repo root — VPS URLs only (no keys on the CLI)
export SUPABASE_URL="https://<vps-or-supabase-public>"
export S3_ENDPOINT="https://<vps-s3>"
export S3_BUCKET="cms-media"
export HERMES_BASE_URL="https://<vps-hermes>"
# Optional WA HMAC on api:
# export SECRET_WA_HMAC=whatsapp-webhook-hmac-key

./scripts/deploy-cloudrun.sh juragan-aibuilder-cup asia-southeast2
```

PowerShell:

```powershell
.\scripts\deploy-cloudrun.ps1 `
  -ProjectId "juragan-aibuilder-cup" `
  -Region "asia-southeast2" `
  -SupabaseUrl "https://<vps-or-supabase-public>" `
  -S3Endpoint "https://<vps-s3>" `
  -HermesBaseUrl "https://<vps-hermes>"
```

Or raw submit (URLs only — keys already in Secret Manager):

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --project=juragan-aibuilder-cup \
  --substitutions=_REGION=asia-southeast2,_SUPABASE_URL=https://…,_NEXT_PUBLIC_SUPABASE_URL=https://…,_S3_ENDPOINT=https://…,_S3_BUCKET=cms-media,_HERMES_BASE_URL=https://…
# Optional: ,_SECRET_WA_HMAC=whatsapp-webhook-hmac-key
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
2. Create secrets + IAM (section above).
3. Grant Cloud Build SA **Cloud Run Admin** + **Service Account User** + Secret Accessor.
4. Create a trigger on branch `juragan-aibuilder-cup` (or agreed branch) → config file `cloudbuild.yaml`.
5. Substitutions: `_REGION`, `_AR_REPO`, VPS **URL** placeholders only — **never** plaintext keys.

---

## Option C: Console deploy (per service, migration-safe)

In **Cloud Run** → open the **existing** service → **Edit & deploy new revision** (do not delete the service):

1. **`juragan-api`**: context `middleware/Dockerfile`, port `4001`, env URLs at VPS; **References → Secret** for the four required secrets (+ optional WA HMAC); smoke `GET /health`.
2. **`juragan`**: context `admin/Dockerfile`, port `3000`, `GRAPHQL_API_URL=https://<juragan-api>.run.app/graphql`; mount anon + S3 secrets. Runtime GraphQL proxy: `admin/src/app/api/graphql/route.ts`.
3. **`juragan-showcase`**: context `brochure-gallery/Dockerfile`, port `3000`, admin public URL; mount anon + service + S3 secrets.

Do **not** create a `juragan-landing` Cloud Run service for v1.

---

## Smoke checklist (after a real deploy — not part of repo config PRs)

1. `curl -sS https://<juragan-api>…/health`
2. Open `juragan` and `juragan-showcase` `*.run.app`
3. GraphQL login from `juragan` against `juragan-api`
4. Confirm Hermes WA still answered from **VPS**, not Cloud Run

---

## Related

- Master VM path (full compose): [`deploy-master-production.md`](./deploy-master-production.md)
- AI Studio index link: [`aistudio/README.md`](./aistudio/README.md)
