import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '../../..');
const MIGRATION = path.join(REPO, 'supabase/migrations/20261017210000_d40_one_wa_number_per_store.sql');
const DOCKER = process.env.QA_DOCKER || 'sudo docker';

function dockerOk(): boolean {
    try {
        execSync(`${DOCKER} info`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

describe('D-40 migration SQL', () => {
    it('migration file exists and mentions skip-on-duplicate', () => {
        const sql = fs.readFileSync(MIGRATION, 'utf-8');
        expect(sql).toContain('RAISE NOTICE');
        expect(sql).toContain('tenant_wa_whitelist_one_per_store');
        expect(sql).toContain('studio_whatsapp_config_allowlist_max_one');
    });

    it('applies cleanly on QA postgres when docker is available', () => {
        if (!dockerOk()) return;
        execSync(
            `${DOCKER} exec -i postgres psql -U postgres -d nusantarasoft -v ON_ERROR_STOP=1`,
            {
                input: fs.readFileSync(MIGRATION),
                stdio: ['pipe', 'pipe', 'pipe'],
            },
        );
        execSync(
            `${DOCKER} exec -i postgres psql -U postgres -d nusantarasoft -v ON_ERROR_STOP=1`,
            {
                input: fs.readFileSync(MIGRATION),
                stdio: ['pipe', 'pipe', 'pipe'],
            },
        );
        expect(true).toBe(true);
    });
});
