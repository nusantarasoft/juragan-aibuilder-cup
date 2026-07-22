/**
 * E2E: create notebook → upload UMKM txt → index → chat RAG (pos + neg)
 * Usage: node tmp/e2e-studio-umkm-rag.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const API = GQL.replace(/\/graphql\/?$/, '');
const EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@nusantarasoft.local';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Nusantarasoft123!';
const TXT = path.join(__dirname, 'umkm-tumbuh-berkembang.txt');

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
    if (json.errors?.length) {
        throw new Error(json.errors.map((e) => e.message).join('; '));
    }
    return json.data;
}

function preview(s, n = 240) {
    return String(s || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, n);
}

async function main() {
    const out = { ok: true, scenarios, gql: GQL };

    // Auth
    const auth = await gql(
        null,
        `mutation($email:String!,$password:String!){
      signIn(input:{ email:$email, password:$password }){ accessToken user { id email } }
    }`,
        { email: EMAIL, password: PASSWORD },
    );
    const token = auth.signIn?.accessToken;
    const userId = auth.signIn?.user?.id;
    if (!token || !userId) throw new Error('signIn failed');
    out.userEmail = auth.signIn.user.email;
    pass('P0_signin', out.userEmail);

    // Create notebook
    const nbData = await gql(
        token,
        `mutation($name:String!,$description:String,$userId:String!,$audience:String){
      createStudioNotebook(name:$name,description:$description,userId:$userId,audience:$audience)
    }`,
        {
            name: 'UMKM Tumbuh & Berkembang',
            description: 'Uji E2E: panduan pertumbuhan UMKM',
            userId,
            audience: 'admin',
        },
    );
    const nb = nbData.createStudioNotebook;
    if (!nb?.id) throw new Error('createStudioNotebook returned empty');
    out.notebookId = nb.id;
    pass('P1_create_notebook', nb.name || nb.id);

    // Upload txt
    const fileBuf = fs.readFileSync(TXT);
    const fd = new FormData();
    fd.append('file', new Blob([fileBuf], { type: 'text/plain' }), 'umkm-tumbuh-berkembang.txt');
    fd.append('notebookId', nb.id);
    const upRes = await fetch(`${API}/studio/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
    });
    const upJson = await upRes.json().catch(() => ({}));
    if (!upRes.ok) throw new Error(`upload failed: ${upJson.message || upRes.status}`);
    out.sourceId = upJson.id;
    pass('P2_upload_txt', upJson.filename || 'umkm-tumbuh-berkembang.txt');

    // Wait index
    let sources = [];
    let indexed = null;
    for (let i = 0; i < 45; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const st = await gql(
            token,
            `query($notebookId:String!){ studioSourceStatus(notebookId:$notebookId) }`,
            { notebookId: nb.id },
        );
        sources = st.studioSourceStatus || [];
        indexed = sources.find(
            (s) =>
                (s.parse_status === 'done' || s.parse_status === 'ready') &&
                (s.chunk_count || 0) > 0,
        );
        if (indexed) break;
        const errored = sources.find((s) => s.parse_status === 'error');
        if (errored) {
            throw new Error(`index error: ${errored.parse_error || 'unknown'}`);
        }
    }
    if (!indexed) {
        throw new Error(
            `timeout indexing: ${JSON.stringify(
                sources.map((s) => ({
                    id: s.id,
                    status: s.parse_status,
                    chunks: s.chunk_count,
                    err: s.parse_error,
                })),
            )}`,
        );
    }
    out.chunkCount = indexed.chunk_count;
    out.sourceId = indexed.id;
    pass('P3_index_ready', `chunks=${indexed.chunk_count} status=${indexed.parse_status}`);

    const chat = async (question, opts = {}) => {
        await new Promise((r) => setTimeout(r, 800));
        const data = await gql(
            token,
            `mutation($notebookId:String!,$question:String!,$userId:String,$sourceIds:[String!],$language:String){
        studioChat(notebookId:$notebookId,question:$question,userId:$userId,sourceIds:$sourceIds,language:$language)
      }`,
            {
                notebookId: nb.id,
                question,
                userId,
                sourceIds: opts.sourceIds === undefined ? [indexed.id] : opts.sourceIds,
                language: opts.language || null,
            },
        );
        return data.studioChat;
    };

    const groundedOk = (c, re) => {
        const a = (c.answer || '').toLowerCase();
        const refs = c.references?.length || 0;
        const refused = /tidak menemukan|tidak ditemukan cuplikan|tidak ada potongan|maaf.*tidak/.test(a);
        return refs > 0 && re.test(a) && !refused;
    };

    // Positive
    {
        const c = await chat('Menurut sumber, apa fondasi utama agar UMKM bisa tumbuh?');
        (groundedOk(c, /fondasi|pencatatan|produk|pelanggan|kas/) ? pass : fail)('P4_rag_fondasi', {
            answer: preview(c.answer),
            refs: c.references?.length || 0,
            status: c.documentRetrievalStatus,
        });
    }
    {
        const c = await chat(
            'Sebutkan indikator yang harus dipantau untuk mengukur pertumbuhan UMKM.',
        );
        (groundedOk(c, /omzet|margin|pelanggan|akuisisi/) ? pass : fail)('P5_rag_indikator', {
            answer: preview(c.answer),
            refs: c.references?.length || 0,
            status: c.documentRetrievalStatus,
        });
    }
    {
        const c = await chat(
            'Bagaimana UMKM memanfaatkan digitalisasi pemasaran menurut dokumen?',
        );
        (groundedOk(c, /whatsapp|marketplace|media sosial|iklan|katalog/) ? pass : fail)(
            'P6_rag_digital',
            {
                answer: preview(c.answer),
                refs: c.references?.length || 0,
                status: c.documentRetrievalStatus,
            },
        );
    }
    {
        const c = await chat(
            'Apa yang dimaksud modal kerja dan buffer kas untuk UMKM di dokumen ini?',
        );
        (groundedOk(c, /modal kerja|buffer|kas|1–3|1-3|bulan|rekening/) ? pass : fail)('P7_rag_kas', {
            answer: preview(c.answer),
            refs: c.references?.length || 0,
            status: c.documentRetrievalStatus,
        });
    }

    // Negative
    {
        const c = await chat(
            'Siapa pemain bola terbaik di Piala Dunia 2022 dan berapa skor finalnya?',
        );
        const a = (c.answer || '').toLowerCase();
        const halluc = /messi|mbappe|argentina|prancis|2-0|3-3/.test(a);
        const refused =
            !halluc &&
            (/tidak|bukan|sumber|dokumen|di luar|tidak ada|tidak disebutkan|tidak tersedia|maaf|tidak menemukan|cuplikan/.test(
                a,
            ) ||
                (c.references?.length || 0) === 0);
        (refused ? pass : fail)('N1_out_of_domain', {
            answer: preview(c.answer),
            refs: c.references?.length || 0,
            status: c.documentRetrievalStatus,
        });
    }
    {
        const c = await chat('Apa ringkasan dokumen UMKM?', { sourceIds: [] });
        const a = (c.answer || '').toLowerCase();
        const ok =
            c.documentRetrievalStatus === 'no_sources_selected' ||
            /centang|pilih|tidak ada sumber|no_sources|belum memilih|tidak memilih|sumber dipilih|tanpa sumber|tidak ada dokumen|sources/.test(
                a,
            );
        (ok ? pass : fail)('N2_no_sources_selected', {
            answer: preview(c.answer),
            status: c.documentRetrievalStatus,
        });
    }
    {
        const c = await chat('Jelaskan tentang modal kerja UMKM.', {
            sourceIds: ['00000000-0000-4000-8000-000000000000'],
        });
        const a = (c.answer || '').toLowerCase();
        const refs = c.references?.length || 0;
        const ok =
            refs === 0 &&
            (/tidak|sumber|dokumen|tidak ditemukan|tidak tersedia|belum|tidak ada|cuplikan|maaf/.test(a) ||
                c.documentRetrievalStatus === 'not_indexed' ||
                c.documentRetrievalStatus === 'no_match');
        (ok ? pass : fail)('N3_invalid_source_ids', {
            answer: preview(c.answer),
            refs,
            status: c.documentRetrievalStatus,
        });
    }
    {
        try {
            const c = await chat('   ');
            const a = preview(c.answer);
            const ok = !a || /kosong|invalid|pertanyaan|tidak melihat pertanyaan|maaf/.test(a.toLowerCase());
            (ok ? pass : fail)('N4_empty_question', {
                answer: a,
                note: ok ? undefined : 'accepted empty question',
            });
        } catch (e) {
            pass('N4_empty_question', { error: String(e.message || e).slice(0, 160) });
        }
    }
    {
        // Fake notebook id should fail auth/ownership
        try {
            await gql(
                token,
                `mutation($notebookId:String!,$question:String!,$userId:String){
          studioChat(notebookId:$notebookId,question:$question,userId:$userId)
        }`,
                {
                    notebookId: '00000000-0000-4000-8000-000000000099',
                    question: 'halo',
                    userId,
                },
            );
            fail('N5_foreign_notebook', { note: 'unexpected success' });
        } catch (e) {
            pass('N5_foreign_notebook', { error: String(e.message || e).slice(0, 160) });
        }
    }

    out.sourceStatuses = sources.map((s) => ({
        filename: s.filename,
        status: s.parse_status,
        chunks: s.chunk_count,
    }));
    out.ok = scenarios.every((s) => s.status === 'PASS');
    out.summary = {
        pass: scenarios.filter((s) => s.status === 'PASS').length,
        fail: scenarios.filter((s) => s.status === 'FAIL').length,
        total: scenarios.length,
    };

    const reportPath = path.join(__dirname, 'e2e-studio-umkm-rag-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
    console.log(`\nReport: ${reportPath}`);
    process.exit(out.ok ? 0 : 1);
}

main().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e), scenarios }, null, 2));
    process.exit(1);
});
