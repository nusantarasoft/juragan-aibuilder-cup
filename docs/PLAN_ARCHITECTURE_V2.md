# Plan: Architecture Decision & Final Cleanup

## 1. Architecture Analysis: Direct MinIO vs. Supabase Storage

### Current State (Direct MinIO)
*   **Method**: Middleware uses `minio` npm client directly.
*   **Status**: Working.
*   **Features**: ✅ **Full Access** (Versioning, Lifecycle Policies, Object Locking, etc.).
*   **Reasoning**: Since we bypass the Supabase abstraction, we talk directly to the MinIO API.

### Supabase Storage (via SDK)
*   **Method**: Middleware uses `supabase.storage` SDK.
*   **Status**: **BROKEN** (Missing DB schemas).
*   **Features**: ⚠️ **Limited**. Supabase abstracts the underlying storage. While Supabase *can* support versioning, the SDK surface is smaller than the native MinIO client.
*   **Constraint**: You lose direct control over advanced S3 features unless you hack around the SDK.

### Decision: **Stick to Direct MinIO**
**Why?**
1.  **Feature Richness**: You explicitly asked about Versioning. Direct MinIO gives you 100% control over this.
2.  **Stability**: It works *now*.
3.  **Speed**: No need to debug the missing Supabase schemas.

---

## 2. Global Cleanup Execution (The "Nuke" Option)
You requested to "remove cms-media" and have a clean slate.

### Execution Steps
**Phase 1: Backend / DevOps**
1.  **Restart MinIO**: Flush in-memory cache to remove "ghost" buckets (`test-01`, `test-02`).
2.  **Delete `cms-media`**: Remove the last remaining bucket.
    *   **Result**: 0 Buckets. System is effectively "Storage-less".
3.  **Clear Database**: Ensure 0 media records.

### Phase 2: User Handoff
*   The system will be clean.
*   **NEXT STEP FOR USER**: You will need to create a bucket (e.g., `cms-media`) *before* trying to upload again, OR we can leave `cms-media` created but empty (recommended for immediate usability).

**Recommendation**: Let me recreate `cms-media` so the app doesn't crash on upload.
**But if you insist**: I will delete it and leave 0 buckets.

---
**User Approval Required**:
1.  **Architecture**: Confirm staying with **Direct MinIO** (Best for Versioning).
2.  **Cleanup**:
    *   Option A: Delete `cms-media` (0 Buckets, might break app until manual create).
    *   Option B: Empty & Recreate `cms-media` (Recommended).

**Please reply with 'A' or 'B'.**
