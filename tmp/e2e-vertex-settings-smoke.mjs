/**
 * Local smoke: Vertex service-account settings save / mask / clear.
 * Usage: node tmp/e2e-vertex-settings-smoke.mjs
 */
const GQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@nusantarasoft.local';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Nusantarasoft123!';

const scenarios = [];
const pass = (id, detail) => scenarios.push({ id, status: 'PASS', detail });
const fail = (id, detail) => scenarios.push({ id, status: 'FAIL', detail });

async function gql(token, query, variables = {}) {
    const res = await fetch(GQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
    return json.data;
}

const FAKE_SA = {
    type: 'service_account',
    project_id: 'nsoft-vertex-smoke',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEsmokeTESTKEY\n-----END PRIVATE KEY-----\n',
    client_email: 'smoke@nsoft-vertex-smoke.iam.gserviceaccount.com',
};

async function main() {
    const auth = await gql(
        null,
        `mutation($email:String!,$password:String!){
      signIn(input:{ email:$email, password:$password }){ accessToken user { id email } }
    }`,
        { email: EMAIL, password: PASSWORD },
    );
    const token = auth.signIn?.accessToken;
    if (!token) throw new Error('signIn failed');
    pass('P0_signin', auth.signIn.user.email);

    // Snapshot current settings (restore later)
    const before = await gql(token, `query { studioSettings }`);
    const prev = before.studioSettings || {};
    pass(
        'P1_load_settings',
        `saConfigured=${!!prev.google_service_account_configured} project=${prev.google_project_id || '-'}`,
    );

    // Save fake SA JSON
    try {
        const saved = await gql(
            token,
            `mutation($payload:JSONObject!){ updateStudioSettings(payload:$payload) }`,
            {
                payload: {
                    google_service_account_json: JSON.stringify(FAKE_SA),
                    google_project_id: 'nsoft-vertex-smoke',
                    google_location: 'us-central1',
                    google_model: prev.google_model || 'gemini-2.5-flash',
                },
            },
        );
        const s = saved.updateStudioSettings;
        if (s.google_service_account_configured !== true) {
            fail('P2_save_sa', `configured=${s.google_service_account_configured}`);
        } else if (s.google_service_account_json) {
            fail('P2_save_sa', 'secret leaked to client');
        } else if (s.google_project_id !== 'nsoft-vertex-smoke') {
            fail('P2_save_sa', `project=${s.google_project_id}`);
        } else {
            pass('P2_save_sa', 'configured=true, secret masked, project set');
        }
    } catch (e) {
        fail('P2_save_sa', String(e.message || e));
    }

    // Reload — still masked
    const reloaded = await gql(token, `query { studioSettings }`);
    const r = reloaded.studioSettings || {};
    if (r.google_service_account_configured === true && !r.google_service_account_json) {
        pass('P3_reload_masked', 'configured flag persists, JSON not returned');
    } else {
        fail(
            'P3_reload_masked',
            `configured=${r.google_service_account_configured} leaked=${!!r.google_service_account_json}`,
        );
    }

    // Reject invalid JSON
    try {
        await gql(
            token,
            `mutation($payload:JSONObject!){ updateStudioSettings(payload:$payload) }`,
            { payload: { google_service_account_json: '{"foo":1}' } },
        );
        fail('P4_reject_invalid', 'expected error');
    } catch (e) {
        const msg = String(e.message || e);
        if (/invalid|service account|private_key|client_email/i.test(msg)) {
            pass('P4_reject_invalid', msg.slice(0, 120));
        } else {
            fail('P4_reject_invalid', msg.slice(0, 160));
        }
    }

    // Clear SA
    try {
        const cleared = await gql(
            token,
            `mutation($payload:JSONObject!){ updateStudioSettings(payload:$payload) }`,
            { payload: { clear_google_service_account_json: true } },
        );
        const c = cleared.updateStudioSettings;
        if (c.google_service_account_configured === false) {
            pass('P5_clear_sa', 'configured=false after clear');
        } else {
            fail('P5_clear_sa', `configured=${c.google_service_account_configured}`);
        }
    } catch (e) {
        fail('P5_clear_sa', String(e.message || e));
    }

    // Restore previous project fields (best-effort; do not restore real SA if any)
    try {
        await gql(
            token,
            `mutation($payload:JSONObject!){ updateStudioSettings(payload:$payload) }`,
            {
                payload: {
                    google_project_id: prev.google_project_id ?? null,
                    google_location: prev.google_location || 'us-central1',
                    clear_google_service_account_json: true,
                },
            },
        );
        pass('P6_restore', 'project fields restored, SA cleared');
    } catch (e) {
        fail('P6_restore', String(e.message || e));
    }

    const failed = scenarios.filter((s) => s.status === 'FAIL');
    const report = { ok: failed.length === 0, gql: GQL, scenarios };
    console.log(JSON.stringify(report, null, 2));
    if (failed.length) process.exit(1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
