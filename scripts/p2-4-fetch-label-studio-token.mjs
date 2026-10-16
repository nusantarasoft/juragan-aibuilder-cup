#!/usr/bin/env node
/**
 * Print a Label Studio API token for QA (uses LABEL_STUDIO_USERNAME/PASSWORD or defaults).
 * Requires Label Studio on LABELSTUDIO_URL (default http://127.0.0.1:8080).
 */
const base = (process.env.LABELSTUDIO_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const email = process.env.LABEL_STUDIO_USERNAME || 'admin@nusantarasoft.local';
const pass = process.env.LABEL_STUDIO_PASSWORD || 'Nusantarasoft123!';

async function main() {
    const auth = Buffer.from(`${email}:${pass}`).toString('base64');
    const res = await fetch(`${base}/api/current-user/token`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
    if (!res.ok) {
        const body = await res.text();
        console.error(`Token fetch failed HTTP ${res.status}: ${body.slice(0, 200)}`);
        process.exit(1);
    }
    const json = await res.json();
    const token = json.token || json.detail;
    if (!token || typeof token !== 'string') {
        console.error('Unexpected token response', json);
        process.exit(1);
    }
    process.stdout.write(token);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
