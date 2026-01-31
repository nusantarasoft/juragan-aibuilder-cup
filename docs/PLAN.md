# Plan: Media Library Reset & Upload Refactor

## Objective
Reset the Media Library to a pristine state (empty S3, empty DB) and simplify the upload logic by removing the mandatory default `uploads/` folder structure, allowing files to be stored at the bucket root.

## Phase 1: Deep Clean (Infrastructure)
**Agent**: `backend-specialist` / `database-architect`
1.  **S3 Reset**:
    *   Delete the `cms-media` bucket and any other artifacts in MinIO.
    *   Recreate the `cms-media` bucket as empty.
    *   Set bucket policy to public (if required for viewing).
2.  **Database Reset**:
    *   Truncate `public.media` and `public.media_embeddings` tables to remove any orphaned records.

## Phase 2: Refactor Upload Logic (Backend)
**Agent**: `backend-specialist`
1.  **Modify `MediaService.uploadMedia`**:
    *   Target: `middleware/src/media/media.service.ts`
    *   Change default folder from `'uploads/'` to `''` (root).
    *   Ensure proper key generation (no leading slashes for root files).

## Phase 3: Verification (QA)
**Agent**: `test-engineer`
1.  **Upload Test**:
    *   Upload an image without specifying a folder.
    *   Verify `s3_key` is just `filename.ext` (not `uploads/filename.ext`).
    *   Verify file exists in MinIO at root.
    *   Verify DB record exists.
2.  **Display Test**:
    *   Ensure the frontend can properly display the image using the new `s3_key` (which is now just a filename). *Note: The previous fix for `s3_key` lookup should handle this natively.*

## Phase 4: Frontend Check (Optional)
**Agent**: `frontend-specialist`
*   Verify that the Media Library UI doesn't hardcode `uploads/` anywhere when listing or displaying files. (Based on previous review, it seems dynamic, but good to check).

---
**User Approval Required**:
Please confirm if you want to proceed with this destructive reset and logic change.
