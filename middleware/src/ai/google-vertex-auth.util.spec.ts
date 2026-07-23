import { describe, expect, it } from 'vitest';
import {
    assertGoogleServiceAccountJson,
    parseGoogleServiceAccountJson,
} from './google-vertex-auth.util';

const valid = {
    type: 'service_account',
    project_id: 'demo-proj',
    private_key: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
    client_email: 'sa@demo-proj.iam.gserviceaccount.com',
};

describe('google-vertex-auth.util', () => {
    it('parses valid service account and unescapes private_key newlines', () => {
        const out = parseGoogleServiceAccountJson(JSON.stringify(valid));
        expect(out?.client_email).toBe(valid.client_email);
        expect(out?.project_id).toBe('demo-proj');
        expect(out?.private_key).toContain('\nABC\n');
        expect(out?.private_key).not.toContain('\\n');
    });

    it('rejects missing fields / invalid JSON', () => {
        expect(parseGoogleServiceAccountJson('')).toBeNull();
        expect(parseGoogleServiceAccountJson('{')).toBeNull();
        expect(parseGoogleServiceAccountJson(JSON.stringify({ client_email: 'x' }))).toBeNull();
    });

    it('assertGoogleServiceAccountJson returns normalized JSON', () => {
        const raw = assertGoogleServiceAccountJson(JSON.stringify(valid));
        const again = JSON.parse(raw);
        expect(again.client_email).toBe(valid.client_email);
        expect(() => assertGoogleServiceAccountJson('{}')).toThrow(/invalid/i);
    });
});
