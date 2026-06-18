# Security Assessment Module Implementation Walkthrough

## Overview
We have successfully implemented the new **Security Assessment (Pentest) Module** for NusantaraSoft. This module allows you to perform automated, passive security scans on target websites to identify potential vulnerabilities, assess compliance, and monitor the overall attack surface.

## What Was Built

### 1. Database Schema
Created 6 new tables in PostgreSQL (via Supabase migrations) to support the module:
- `pentest_targets`: Stores target URLs, metadata, and latest grades.
- `pentest_scans`: Tracks scan history, overall scores, and execution times.
- `pentest_findings`: Detailed individual security findings with severities, CWEs, and recommendations.
- `pentest_domains`: For tracking discovered subdomains (attack surface).
- `pentest_compliance`: Compliance mappings (e.g., PCI DSS, HIPAA).
- `pentest_reports`: Stored generated PDF/JSON reports.

### 2. Backend Module (`middleware/src/pentest`)
Built a NestJS GraphQL module (`PentestModule`) that integrates `HttpService` and native Node.js libraries (`dns`, `tls`, `net`) to perform 11 categories of passive security checks:
1. **HTTP Headers**: Validates CSP, HSTS, X-Frame-Options, etc.
2. **SSL/TLS**: Analyzes certificate validity, cipher suites, and protocol versions.
3. **DNS Records**: Checks A, AAAA, MX, NS, TXT, and CAA records.
4. **Cookie Security**: Verifies Secure, HttpOnly, and SameSite attributes.
5. **Technology Detection**: Identifies server software, frameworks, WAFs, and CDNs via headers and meta tags.
6. **Performance**: Analyzes TTFB, compression, and redirect chains.
7. **CORS**: Tests for wildcard origins and insecure credential passing.
8. **Information Disclosure**: Checks for `robots.txt`, `security.txt`, `.env`, exposed `.git` directories, and more.
9. **Subdomains**: Discovers subdomains via Certificate Transparency logs (`crt.sh`).
10. **Open Ports**: Scans common ports (21, 22, 80, 443, 3306, etc.) using `net.Socket`.
11. **Email Security**: Deep analysis of SPF, DMARC, DKIM, and MTA-STS records.

The backend calculates an overall **Security Score (0-100)** and a **Grade (A+ to F)** based on the findings.

### 3. Frontend Pages (`admin/src/app/admin/security/pentest`)
- **Dashboard (`/page.tsx`)**: Displays a high-level summary of all targets, average scores, and recent scans. You can add new targets here and trigger scans directly.
- **Detail Page (`/[id]/page.tsx`)**: A detailed view of a specific target. It features a circular gauge for the score, a breakdown of findings by category (with custom icons), and an expandable data table for deep-diving into individual vulnerabilities and recommended fixes.

## Validation Results
- Code successfully compiled with TypeScript in strict mode.
- Docker containers (`admin` and `middleware`) successfully built and started.
- All dependencies (`@nestjs/axios`, `axios`) installed and configured.

## How to Test
1. Navigate to the **Security > Pentest** menu in the admin dashboard.
2. Click **Add Target** and enter a domain (e.g., `https://tenos.id`).
3. Click **Scan Now** on the target card.
4. Wait for the background scan to complete.
5. Click **Results** to view the comprehensive security report, including grade, score, and all identified vulnerabilities.

> [!WARNING]
> This tool performs active reconnaissance (like connecting to open ports). Ensure you only scan websites you have explicit permission to test, such as `tenos.id` as requested. All checks are strictly informational/passive and do not exploit vulnerabilities.
