import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    ALTERNATIVE_AUTH_GRAPHQL_OPERATIONS,
    ALTERNATIVE_AUTH_HTTP_ROUTES,
    PUBLIC_GRAPHQL_OPERATIONS,
    PUBLIC_HTTP_ROUTES,
} from './public-endpoints.registry';

const SRC = join(__dirname, '..');

function walk(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            walk(p, acc);
        } else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) {
            acc.push(p);
        }
    }
    return acc;
}

describe('access-control metadata registry', () => {
    it('documents every @Public / @AlternativeAuth GraphQL operation', () => {
        const foundPublic = new Set<string>();
        const foundAlt = new Set<string>();

        for (const file of walk(SRC).filter((f) => f.endsWith('.resolver.ts'))) {
            const source = readFileSync(file, 'utf8');
            const lines = source.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (!/@(Query|Mutation|Subscription)\(/.test(lines[i])) continue;
                const window = lines.slice(Math.max(0, i - 6), i).join('\n');
                const opMatch = lines[i].match(/name:\s*['"]([^'"]+)['"]/);
                let opName = opMatch?.[1];
                if (!opName) {
                    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                        const fn = lines[j].match(/(?:async\s+)?(\w+)\s*\(/);
                        if (fn && fn[1] !== 'if') {
                            opName = fn[1];
                            break;
                        }
                    }
                }
                if (!opName) continue;
                if (window.includes('@Public()')) foundPublic.add(opName);
                if (window.includes('@AlternativeAuth()')) foundAlt.add(opName);
            }
        }

        expect([...foundPublic].sort()).toEqual([...PUBLIC_GRAPHQL_OPERATIONS].sort());
        expect([...foundAlt].sort()).toEqual([...ALTERNATIVE_AUTH_GRAPHQL_OPERATIONS].sort());
    });

    it('documents every @Public / @AlternativeAuth REST route', () => {
        const foundPublic: string[] = [];
        const foundAlt: string[] = [];

        for (const file of walk(SRC).filter((f) => f.endsWith('.controller.ts'))) {
            const source = readFileSync(file, 'utf8');
            const lines = source.split('\n');
            const classPublic = /@Public\(\)\s*\n@Controller/.test(source);
            const classAlt = /@AlternativeAuth\(\)\s*\n@Controller/.test(source);
            const controllerMatch = source.match(/@Controller\(([^)]*)\)/);
            const base = (controllerMatch?.[1] || "''")
                .replace(/['"]/g, '')
                .trim();

            for (let i = 0; i < lines.length; i++) {
                const route = lines[i].match(/@(Get|Post|Put|Patch|Delete)\(['"]?([^'")]*?)['"]?\)/);
                if (!route) continue;
                const window = lines.slice(Math.max(0, i - 6), i).join('\n');
                const verb = route[1].toUpperCase();
                const path = route[2] || '';
                const full = `${verb} /${[base, path].filter(Boolean).join('/')}`.replace(/\/+/g, '/');

                const isPublic = classPublic || window.includes('@Public()');
                const isAlt = classAlt || window.includes('@AlternativeAuth()');
                if (isPublic) foundPublic.push(full);
                if (isAlt) foundAlt.push(full);
            }
        }

        expect(foundPublic.sort()).toEqual([...PUBLIC_HTTP_ROUTES].sort());
        expect(foundAlt.sort()).toEqual([...ALTERNATIVE_AUTH_HTTP_ROUTES].sort());
    });

    it('registers GlobalAuthGuard as APP_GUARD', () => {
        const authModule = readFileSync(join(__dirname, 'auth.module.ts'), 'utf8');
        expect(authModule).toContain('APP_GUARD');
        expect(authModule).toContain('GlobalAuthGuard');
    });
});
