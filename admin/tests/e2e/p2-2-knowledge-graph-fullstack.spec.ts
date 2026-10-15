import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { loginAsAdmin } from './helpers/auth';

const MEDIA_DIR =
    process.env.P2_2_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const TENANT = '00000000-0000-0000-0000-000000000010';
const PG = process.env.P2_2_QA_PG_CONTAINER || 'postgres';
const DB = process.env.P2_2_QA_POSTGRES_DB || 'nusantarasoft';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const DOCKER = process.env.P2_2_DOCKER || 'sudo docker';
const REPO_ROOT = path.resolve(__dirname, '../../..');

function psql(sql: string) {
    execSync(`${DOCKER} exec -i ${PG} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1`, {
        input: sql,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
}

async function shot(page: import('@playwright/test').Page, name: string) {
    await page.screenshot({ path: path.join(MEDIA_DIR, name), fullPage: true });
}

test.describe.configure({ mode: 'serial', timeout: 240_000 });

test.describe('P2-2 Knowledge Graph — live GraphQL + RPC', () => {
    test.beforeAll(async () => {
        const migration = readFileSync(
            path.join(REPO_ROOT, 'supabase/migrations/20261015170000_studio_knowledge_graph_rpc.sql'),
            'utf8',
        );
        psql(migration);

        psql(`
          UPDATE aos_settings SET ui_demo_mode = false WHERE tenant_id = '${TENANT}';

          INSERT INTO studio_notebooks (id, name, icon, context_config)
          VALUES (
            'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            'P2-2 QA Notebook',
            '📓',
            jsonb_build_object('tenant_id', '${TENANT}')
          )
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, context_config = EXCLUDED.context_config;

          INSERT INTO studio_notebook_sources (id, notebook_id, filename, parse_status, chunk_count)
          VALUES (
            'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
            'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            'P2-2 QA Policy.txt',
            'completed',
            1
          )
          ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, chunk_count = 1;

          DELETE FROM studio_source_chunks WHERE source_id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

          INSERT INTO studio_source_chunks (id, notebook_id, source_id, chunk_index, content)
          VALUES (
            'cccccccc-dddd-eeee-ffff-000000000001',
            'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
            0,
            'Leave Policy: employees may take annual leave after six months.'
          );
        `);

        const res = await fetch(`${MIDDLEWARE}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken } }',
                variables: { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
            }),
        });
        const body = await res.json();
        expect(body.data?.signIn?.accessToken, JSON.stringify(body.errors ?? body)).toBeTruthy();
    });

    test('Live label, tree from API, chunk inspector', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio/knowledge-graph', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 60_000 });
        await shot(page, 'p2-2-kg-live-label.png');

        await expect(page.getByText('P2-2 QA Notebook')).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText('P2-2 QA Policy.txt')).toBeVisible({ timeout: 30_000 });
        await shot(page, 'p2-2-kg-tree.png');

        await page.getByText(/Chunk #0/i).first().click();
        await expect(page.getByText(/Leave Policy/i)).toBeVisible({ timeout: 30_000 });
        await shot(page, 'p2-2-kg-chunk-inspector.png');
    });
});
