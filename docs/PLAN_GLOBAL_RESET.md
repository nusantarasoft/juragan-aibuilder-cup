# Plan: Global System Cleanup

## Objective
Perform a "Factory Reset" of the storage and database layer. This involves identifying and removing ALL S3 buckets (not just `cms-media`) and ensuring the database is completely consistent with this empty state.

## Phase 1: Assessment & Discovery (Agent: `explorer-agent`)
*   **DONE**: Confirmed only `cms-media` exists currently in MinIO.
*   **DONE**: Confirmed `media` and `media_embeddings` tables exist in Postgres.

## Phase 2: Execution (Agent: `devops-engineer` + `database-architect`)
1.  **Global S3 Purge**:
    *   Command: `mc ls myminio` (Loop through all results).
    *   Action: `mc rb --force myminio/<bucket_name>` for EACH bucket found.
    *   Action: Recreate *only* the required `cms-media` bucket (empty).
2.  **Database Purge**:
    *   Command: `TRUNCATE TABLE public.media CASCADE;` (Clears media and embeddings).
    *   *Verification*: Count rows to ensure 0.

## Phase 3: Validation (Agent: `test-engineer`)
1.  **State Check**:
    *   MinIO should have exactly 1 bucket: `cms-media` (empty).
    *   Postgres should have 0 rows in `media`.
2.  **Upload Readiness**:
    *   Verify `media.service.ts` still uses root path (Already done in previous step, but quick verify).

---
**User Approval Required**:
Please confirm to wipe EVERYTHING.
