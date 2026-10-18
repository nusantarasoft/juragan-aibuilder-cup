# Deploying NusantaraSoft (`admin` + `middleware`) to Google Cloud Run

This repository is pre-configured for **Google Cloud Run** continuous deployment via **Google Cloud Build** ([`cloudbuild.yaml`](../cloudbuild.yaml)).

## Architecture on Cloud Run

```text
GitHub Repository
   │
   ▼  (Push / Trigger)
Google Cloud Build (cloudbuild.yaml)
   ├── 1. Builds & deploys `nusantarasoft-middleware` (NestJS GraphQL + AI Studio API)
   │      └── Captures live Cloud Run URL: https://nusantarasoft-middleware-<hash>.a.run.app/graphql
   └── 2. Builds & deploys `nusantarasoft-admin` (Next.js Standalone: AI Studio, Virtual Office, Agentic OS)
          └── Baked with NEXT_PUBLIC_GRAPHQL_URL pointing to `nusantarasoft-middleware`
```

### Services Deployed
| Service | Source Folder | Dockerfile | Container Port | Notes |
|---------|---------------|------------|----------------|-------|
| `nusantarasoft-middleware` | [`./middleware`](../middleware) | [`middleware/Dockerfile`](../middleware/Dockerfile) | `4001` (or Cloud Run `$PORT`) | NestJS GraphQL API, health check at `GET /health`, pre-configured CORS for `*.run.app` |
| `nusantarasoft-admin` | [`./admin`](../admin) | [`admin/Dockerfile`](../admin/Dockerfile) | `3000` (or Cloud Run `$PORT`) | Next.js standalone build with AI Studio (default `/admin/ai-studio`), Virtual Office (`/admin/virtual-office`), and Agentic OS (`/admin/agentic-os`) |

---

## Option A: Continuous Deployment from GitHub (Recommended)

1. **Push your repository to GitHub**
   Sensitive files (`.env`, `.env.production`, `volumes/google-credentials.json`, `generated_secrets.txt`, `jwt_keys.txt`) have been untracked from Git and added to [`.gitignore`](../.gitignore).

2. **Create an Artifact Registry Docker Repository**
   In Google Cloud Console → **Artifact Registry** (or via CLI):
   ```bash
   gcloud artifacts repositories create nusantarasoft \
     --repository-format=docker \
     --location=asia-southeast2
   ```

3. **Grant Cloud Build Permission to Deploy to Cloud Run**
   In Google Cloud Console → **Cloud Build** → **Settings**, enable:
   - **Cloud Run Admin** (`roles/run.admin`)
   - **Service Account User** (`roles/iam.serviceAccountUser`)

4. **Connect GitHub Repository in Cloud Build Triggers**
   - Go to **Cloud Build** → **Triggers** → **Create Trigger**
   - Select your GitHub repository and branch (e.g., `^master$` or `^main$`)
   - Configuration: **Cloud Build configuration file (yaml or json)** → Location: `cloudbuild.yaml`
   - Add **Substitution Variables**:
     | Variable | Description | Example |
     |----------|-------------|---------|
     | `_REGION` | Cloud Run & Artifact Registry region | `asia-southeast2` |
     | `_AR_REPO` | Artifact Registry repository name | `nusantarasoft` |
     | `_SUPABASE_URL` | Supabase URL for `middleware` | `https://<project>.supabase.co` |
     | `_NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for `admin` | `https://<project>.supabase.co` |
     | `_NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase `anon` public key | `eyJ...` |
     | `_SUPABASE_SERVICE_KEY` | Supabase `service_role` key | `eyJ...` |
     | `_S3_ENDPOINT` | S3-compatible storage endpoint | `https://storage.googleapis.com` |
     | `_S3_BUCKET` | Media bucket name | `cms-media` |

---

## Option B: One-Command CLI Deployment

You can also trigger the entire Cloud Build + Cloud Run pipeline directly from your terminal:

### PowerShell (Windows)
```powershell
.\scripts\deploy-cloudrun.ps1 `
  -ProjectId "your-gcp-project-id" `
  -Region "asia-southeast2" `
  -SupabaseUrl "https://your-project.supabase.co" `
  -SupabaseAnonKey "your-anon-key" `
  -SupabaseServiceKey "your-service-role-key"
```

### Bash (Linux / macOS / Cloud Shell)
```bash
SUPABASE_URL="https://your-project.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
SUPABASE_SERVICE_KEY="your-service-role-key" \
./scripts/deploy-cloudrun.sh your-gcp-project-id asia-southeast2
```

---

## Option C: Direct Cloud Run Console Deployment (Dockerfile Mode)

If you prefer to create each service directly inside **Google Cloud Run** → **Deploy Container** → **Continuously deploy from a repository** (pointing to `middleware/Dockerfile` and `admin/Dockerfile` separately without `cloudbuild.yaml`):

1. **Service 1 (`nusantarasoft-middleware`)**:
   - Build context / Dockerfile: `/middleware/Dockerfile`
   - Runtime env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `S3_ENDPOINT`, `S3_BUCKET`
   - Note: `middleware` is resilient to cold starts even before env vars are populated and exposes `GET /health` (`200 OK`) on Cloud Run's injected `$PORT`.
2. **Service 2 (`nusantarasoft-admin`)**:
   - Build context / Dockerfile: `/admin/Dockerfile`
   - Runtime env vars:
     - `GRAPHQL_API_URL=https://<your-middleware-service>.a.run.app/graphql`
     - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Note: Because Cloud Run's single-Dockerfile trigger does not pass Docker `--build-arg` flags during build, `admin` includes a runtime Next.js proxy at `/api/graphql` (`admin/src/app/api/graphql/route.ts`). When running on a non-localhost domain (`*.run.app`), the browser client automatically routes GraphQL calls through `/api/graphql`, which forwards them to `GRAPHQL_API_URL` at runtime.

