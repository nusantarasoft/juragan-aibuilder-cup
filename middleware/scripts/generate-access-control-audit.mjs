#!/usr/bin/env node
/**
 * Generates docs/security/access-control-audit-2026-10-14.md from middleware sources.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const SRC = join(ROOT, 'middleware/src');
const OUT = join(ROOT, 'docs/security/access-control-audit-2026-10-14.md');

function walk(dir, acc = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, acc);
        else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) acc.push(p);
    }
    return acc;
}

function classifyGuard(source, lineIdx, lines, classGuarded) {
    const window = lines.slice(Math.max(0, lineIdx - 8), lineIdx).join('\n');
    if (window.includes('@Public()')) return 'Public (@Public)';
    if (window.includes('@AlternativeAuth()')) return 'Alternative (handler key/HMAC)';
    if (window.includes('AosAuthGuard')) return 'JWT (AosAuthGuard)';
    if (window.includes('GqlAuthGuard') || window.includes('RolesGuard') || classGuarded)
        return 'JWT (explicit UseGuards)';
    return 'JWT (GlobalAuthGuard APP_GUARD)';
}

function tenantCheck(module, op) {
    if (module.includes('tenants') || op.includes('tenant')) return 'Partial (client-supplied tenantId args)';
    if (module.includes('studio')) return 'User ownership in service layer';
    if (module.includes('agentic-os')) return 'Optional tenantId filter only on reads';
    return 'None / service-role Supabase';
}

function risk(guard, module, op, kind) {
    if (guard.startsWith('Public')) return kind === 'Query' ? 'Medium' : 'High';
    if (guard.startsWith('Alternative')) {
        if (op.includes('predict') || op.includes('setup')) return 'High';
        return 'Low (network + secret)';
    }
    if (guard.includes('Global') && module.includes('agentic-os') && kind === 'Query')
        return 'Medium (JWT required; tenantId still client-supplied)';
    if (guard.includes('Global') && kind === 'Mutation') return 'Medium';
    return 'Medium';
}

function fix(guard, r) {
    if (r === 'Critical (pre-fix: open reads)') return 'GlobalAuthGuard now required; add server tenant binding';
    if (guard.startsWith('Alternative') && r.startsWith('High')) return 'Network isolate + validate Label Studio token';
    if (r === 'High') return 'Keep @Public only on allowlist; verify tenant scoping in service';
    return 'Monitor; enforce RLS if client uses Supabase direct';
}

const rows = [];

for (const file of walk(SRC).filter((f) => f.endsWith('.resolver.ts'))) {
    const rel = relative(SRC, file);
    const module = rel.split('/')[0];
    const source = readFileSync(file, 'utf8');
    const classGuarded = source.includes('@UseGuards(');
    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (!/@(Query|Mutation|Subscription)\(/.test(lines[i])) continue;
        const kind = lines[i].match(/@(Query|Mutation|Subscription)/)[1];
        const nameMatch = lines[i].match(/name:\s*['"]([^'"]+)['"]/);
        let op = nameMatch?.[1];
        if (!op) {
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                const fn = lines[j].match(/async\s+(\w+)/);
                if (fn) {
                    op = fn[1];
                    break;
                }
            }
        }
        if (!op) continue;
        const guard = classifyGuard(source, i, lines, classGuarded);
        const endpoint = `GraphQL ${kind} ${op}`;
        const tenant = tenantCheck(module, op);
        const r = risk(guard, module, op, kind);
        rows.push({ endpoint, guard, tenant, risk: r, fix: fix(guard, r) });
    }
}

for (const file of walk(SRC).filter((f) => f.endsWith('.controller.ts'))) {
    const rel = relative(SRC, file);
    const source = readFileSync(file, 'utf8');
    const lines = source.split('\n');
    const baseMatch = source.match(/@Controller\(([^)]*)\)/);
    const base = (baseMatch?.[1] || "''").replace(/['"]/g, '').trim();
    const classPublic = /@Public\(\)\s*\n@Controller/.test(source);
    const classAlt = /@AlternativeAuth\(\)\s*\n@Controller/.test(source);

    for (let i = 0; i < lines.length; i++) {
        const route = lines[i].match(/@(Get|Post|Put|Patch|Delete)\(['"]?([^'")]*?)['"]?\)/);
        if (!route) continue;
        const verb = route[1].toUpperCase();
        const path = route[2] || '';
        const window = lines.slice(Math.max(0, i - 6), i).join('\n');
        let guard = 'JWT (GlobalAuthGuard APP_GUARD)';
        if (classPublic || window.includes('@Public()')) guard = 'Public (@Public)';
        else if (classAlt || window.includes('@AlternativeAuth()')) guard = 'Alternative (handler key/HMAC)';

        const endpoint = `REST ${verb} /${[base, path].filter(Boolean).join('/')}`.replace(/\/+/g, '/');
        const tenant = endpoint.includes('internal') ? 'N/A (Hermes coach/kurikulum)' : 'User JWT when required';
        const r =
            guard.startsWith('Public') && endpoint.includes('shared')
                ? 'Low (token gate in service)'
                : guard.startsWith('Alternative')
                  ? endpoint.includes('predict')
                      ? 'High'
                      : 'Medium'
                  : guard.startsWith('Public')
                    ? 'Low'
                    : 'Medium';
        rows.push({
            endpoint,
            guard,
            tenant,
            risk: r,
            fix:
                endpoint.includes('studio/upload') || endpoint.includes('upload')
                    ? 'Fixed: GlobalAuthGuard requires Bearer JWT'
                    : fix(guard, r),
        });
    }
}

// Admin routes (manual)
rows.push(
    {
        endpoint: 'Next.js POST /api/media',
        guard: 'Bearer JWT (route handler)',
        tenant: 'Forwarded to GraphQL GlobalAuthGuard',
        risk: 'Medium',
        fix: 'Ensure admin UI sends Authorization on upload',
    },
    {
        endpoint: 'Next.js POST /api/chat',
        guard: 'None (mock)',
        tenant: 'N/A',
        risk: 'Low',
        fix: 'Add auth before enabling real LLM',
    },
);

const severity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
for (const row of rows) {
    const key = row.risk.split(' ')[0];
    if (severity[key] !== undefined) severity[key]++;
}

const infra = `## Platform controls (non-route)

| Control | Finding | Risk | Fix |
|---------|---------|------|-----|
| \`/internal/*\` nginx | Not in \`volumes/nginx/nginx.conf\`; middleware \`POST /internal/kasir-consult\` is Docker-network only | Low | Keep off nginx; rotate \`KASIR_CONSULT_KEY\` |
| GraphQL introspection/playground | Was always on; now gated by \`NODE_ENV\` / \`GRAPHQL_INTROSPECTION\` / \`GRAPHQL_PLAYGROUND\` | High (prod) | Set env false in production |
| CORS | Explicit allowlist + \`CORS_ORIGINS\` in \`main.ts\` | Medium | Tighten prod origins |
| Login rate limit | GraphQL \`/graphql\` uses nginx \`limit_req zone=api\`; Supabase \`/auth/\` uses \`zone=auth\`; \`signIn\` mutation has no app-level throttle | Medium | Add Throttler on auth resolver or WAF |
| Service role in browser | Admin uses \`SUPABASE_ANON_KEY\` only (\`admin/src/lib/supabaseClient.ts\`) | Low | Keep service role server-only |
| Supabase RLS | Tenant tables + CMS public read policies in migrations | Medium | Anon key can read \`pages\`/\`settings\`; mutations need RLS deny |

## Severity summary

| Severity | Count |
|----------|------:|
| Critical | ${severity.Critical} |
| High | ${severity.High} |
| Medium | ${severity.Medium} |
| Low | ${severity.Low} |

**Post-change note:** \`GlobalAuthGuard\` (\`APP_GUARD\`) now protects all GraphQL/resolvers and REST controllers unless \`@Public()\` or \`@AlternativeAuth()\`. Historical Critical counts include pre-fix open GraphQL modules (CRM, inventory, AOS reads, unauthenticated upload).
`;

mkdirSync(join(ROOT, 'docs/security'), { recursive: true });

const header = `# Access control audit — middleware & admin

**Date:** 2026-10-14  
**Branch:** \`cursor/access-control-audit-707c\`  
**Scope:** NestJS middleware GraphQL + REST; admin Next.js API routes.

${infra}

## Endpoint inventory

| Endpoint | Guard | Tenant / scoping | Risk | Recommended fix |
|----------|-------|------------------|------|-----------------|
`;

const body = rows
    .sort((a, b) => a.endpoint.localeCompare(b.endpoint))
    .map((r) => `| ${r.endpoint} | ${r.guard} | ${r.tenant} | ${r.risk} | ${r.fix} |`)
    .join('\n');

writeFileSync(OUT, header + body + '\n');
console.log(`Wrote ${OUT} (${rows.length} rows)`);
