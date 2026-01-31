# Plan: Architecture Decision & Final Cleanup

## 1. Architecture Analysis: Direct MinIO vs. Supabase Storage

### Current State
*   **Method**: Direct MinIO (`media.service.ts` uses `minio` npm package).
*   **Status**: Working (Middleware talks directly to Storage).
*   **Pros**: Full control, no dependency on Supabase Storage service health.
*   **Cons**: No built-in RLS (Row Level Security), must handle auth manually.

### Supabase Storage
*   **Method**: Use `supabase-js` to upload/manage files.
*   **Status**: **BROKEN/INCOMPLETE**. The `storage` schema is missing from the database, meaning Supabase Storage service is likely not functioning correctly or hasn't initialized its tables.
*   **Pros**: Integration with Auth, RLS, Image Transformations.
*   **Cons**: Requires fixing the Supabase infrastructure first.

### Decision: **Stick to Direct MinIO**
**Why?** The Supabase Storage infrastructure is currently unhealthy (missing schemas). Switching now would require debugging Supabase internals (migrations/docker-init). Since `MediaService` is already written for MinIO, it is more stable and faster to proceed with the current architecture.

---

## 2. The Mystery of `test-01` / `test-02`
*   **Observation**: You see these buckets in the UI.
*   **Fact**: They are deleted from MinIO Disk.
*   **Fact**: The `storage` database schema doesn't exist, so they aren't DB ghosts.
*   **Hypothesis**: The `minio` process might have cached metadata in memory or `.minio.sys` directory which wasn't fully cleared by the manual `rm -rf /data/bucket`.
*   **Fix**: Restart `minio` container to flush any in-memory state.

## 3. Execution Plan

### Phase 1: Deep Clean (Agent: `devops-engineer`)
1.  **Stop MinIO**.
2.  **Prune MinIO Data**: Ensure `/data` is perfectly clean (except `.minio.sys` config, or nuke that too and let it regenerate).
3.  **Restart MinIO**.
4.  **Recreate `cms-media`**.

### Phase 2: Verify & Remove `cms-media` (Agent: `backend-specialist`)
*   You asked to "remove cms-media".
*   If we remove it, **uploads will fail** unless we create a different bucket.
*   **Decision**: I will remove `cms-media` as requested.
*   **Outcome**: The system will have **0 buckets**.
*   *Warning*: You must create a bucket before uploading again.

### Phase 3: Frontend Check (Agent: `frontend-specialist`)
*   Check if `MediaService` (Frontend) is caching bucket lists.

---
**User Approval Required**:
1. Confirm staying with **Direct MinIO** (Recommended).
2. Confirm deleting `cms-media` (leaving the system with **NO buckets**).
