# MinIO / S3 Bucket Access Policies Guide

## Core Concepts

Understanding access policies is critical for security and functionality.

### 1. "Public" vs "Public Read"
The term **"Public"** is often ambiguous. In MinIO/S3, we distinguish between:

*   **Public Read (Recommended for Web Assets)**:
    *   **Effect**: Anyone on the internet can **VIEW** (download) files if they have the URL.
    *   **Restriction**: They CANNOT list all files in the bucket. They CANNOT upload or delete files.
    *   **Use Case**: Images for a website, user avatars, public documents.
    *   **Action**: `s3:GetObject`
    *   **Resource**: `arn:aws:s3:::bucket-name/*`

*   **Public Read + List (Open Directory)**:
    *   **Effect**: Anyone can view files AND see a list of all files.
    *   **Risk**: Exposes your entire file structure.
    *   **Use Case**: Opendata repositories.
    *   **Actions**: `s3:GetObject`, `s3:ListBucket`

*   **Full Public (Dangerous)**:
    *   **Effect**: Anyone can View, Upload, and Delete files.
    *   **Risk**: High. Malicious users can fill your storage or delete data.
    *   **Actions**: `s3:*`

## Common Policy JSON Examples

### 1. Public Read (Safe for Websites)
Allows readable access to specific files.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "*"
                ]
            },
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR-BUCKET-NAME/*"
            ]
        }
    ]
}
```

### 2. Private (Default)
No access allowed without explicit credentials. To make a bucket private, simply **delete** the policy.

## Troubleshooting "Policy Not Saved"

If you encounter errors saving a policy:

1.  **Check Syntax**: JSON must be valid. No trailing commas, strict double quotes.
2.  **Check Resource Name**: Ensure the bucket name in `Resource` matches exactly: `arn:aws:s3:::my-bucket/*`.
3.  **Conflict**: Existing ACLs might conflict with Bucket Policies (though modern S3 focuses on Policies).
4.  **Backend Validation**: MinIO validates the policy structure strictly.

## How to Apply
1.  Go to **Media Library**.
2.  Click the **Settings (Gear)** icon on a bucket.
3.  Go to **Access Policy** tab.
4.  Use the **"Public Read"** preset or paste the JSON above (replacing `YOUR-BUCKET-NAME`).
5.  Click **Save**.
