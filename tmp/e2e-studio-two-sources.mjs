/**
 * Upload PDF to existing UMKM notebook + chat with both sources.
 * Usage: node tmp/e2e-studio-two-sources.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const API = GQL.replace(/\/graphql\/?$/, '');
const EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@nusantarasoft.local';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Nusantarasoft123!';
const NB = process.env.NOTEBOOK_ID || 'ca9ba8f7-9064-4cd5-af7b-ad857d001e4c';
const PDF = path.join(__dirname, 'umkm-go-global-2025.pdf');

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

function preview(s, n = 320) {
    return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

async function main() {
    // Ensure PDF exists
    if (!fs.existsSync(PDF)) {
        const built = spawnSync(process.execPath, [path.join(__dirname, 'build-umkm-pdf.mjs')], {
            cwd: path.join(__dirname, '..'),
            encoding: 'utf8',
        });
        if (built.status !== 0) throw new Error(built.stderr || built.stdout || 'pdf build failed');
    }

    const auth = await gql(
        null,
        `mutation($email:String!,$password:String!){
      signIn(input:{ email:$email, password:$password }){ accessToken user { id email } }
    }`,
        { email: EMAIL, password: PASSWORD },
    );
    const token = auth.signIn.accessToken;
    const userId = auth.signIn.user.id;
    pass('P0_signin', auth.signIn.user.email);

    // Existing sources
    let st = await gql(
        token,
        `query($notebookId:String!){ studioSourceStatus(notebookId:$notebookId) }`,
        { notebookId: NB },
    );
    let sources = st.studioSourceStatus || [];
    let txt = sources.find((s) => /\.txt$/i.test(s.filename || ''));
    let pdf = sources.find((s) => /\.pdf$/i.test(s.filename || ''));

    if (!txt) {
        fail('P1_txt_exists', `no txt in notebook; sources=${sources.map((s) => s.filename).join(',')}`);
    } else {
        pass('P1_txt_exists', `${txt.filename} chunks=${txt.chunk_count} status=${txt.parse_status}`);
    }

    if (!pdf) {
        const buf = fs.readFileSync(PDF);
        const fd = new FormData();
        fd.append('file', new Blob([buf], { type: 'application/pdf' }), 'umkm-go-global-2025.pdf');
        fd.append('notebookId', NB);
        const upRes = await fetch(`${API}/studio/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
        });
        const upJson = await upRes.json().catch(() => ({}));
        if (!upRes.ok) throw new Error(`upload failed: ${JSON.stringify(upJson)} status=${upRes.status}`);
        pass('P2_upload_pdf', `${upJson.filename || 'pdf'} id=${upJson.id}`);
        pdf = { id: upJson.id, filename: upJson.filename };
    } else {
        pass('P2_pdf_already', `${pdf.filename} id=${pdf.id}`);
    }

    // Wait until both indexed
    let readyTxt = null;
    let readyPdf = null;
    for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        st = await gql(
            token,
            `query($notebookId:String!){ studioSourceStatus(notebookId:$notebookId) }`,
            { notebookId: NB },
        );
        sources = st.studioSourceStatus || [];
        readyTxt = sources.find(
            (s) =>
                /\.txt$/i.test(s.filename || '') &&
                (s.parse_status === 'done' || s.parse_status === 'ready') &&
                (s.chunk_count || 0) > 0,
        );
        readyPdf = sources.find(
            (s) =>
                /\.pdf$/i.test(s.filename || '') &&
                (s.parse_status === 'done' || s.parse_status === 'ready') &&
                (s.chunk_count || 0) > 0,
        );
        if (readyTxt && readyPdf) break;
        const errored = sources.find((s) => s.parse_status === 'error');
        if (errored) throw new Error(`index error: ${errored.filename} ${errored.parse_error || ''}`);
    }
    if (!readyTxt || !readyPdf) {
        throw new Error(
            `timeout indexing: ${JSON.stringify(
                sources.map((s) => ({
                    f: s.filename,
                    st: s.parse_status,
                    n: s.chunk_count,
                    err: s.parse_error,
                })),
            )}`,
        );
    }
    pass(
        'P3_both_indexed',
        `txt=${readyTxt.chunk_count} pdf=${readyPdf.chunk_count} totalSources=${sources.length}`,
    );

    const sourceIds = [readyTxt.id, readyPdf.id];

    async function ask(question) {
        const data = await gql(
            token,
            `mutation($notebookId:String!,$question:String!,$userId:String,$sourceIds:[String!]){
        studioChat(notebookId:$notebookId,question:$question,userId:$userId,sourceIds:$sourceIds)
      }`,
            { notebookId: NB, question, userId, sourceIds },
        );
        return data.studioChat;
    }

    // Q1: TXT-only fact
    const q1 = await ask('Apa fondasi usaha yang sehat menurut sumber?');
    const a1 = String(q1.answer || '');
    const refs1 = q1.references || [];
    const q1ok =
        /pencatatan|kas|produk|harga/i.test(a1) &&
        refs1.length > 0 &&
        refs1.some((r) => /\.txt/i.test(r.docName || ''));
    (q1ok ? pass : fail)(
        'P4_txt_fact',
        `refs=${refs1.length} docs=${[...new Set(refs1.map((r) => r.docName))].join('|')} | ${preview(a1)}`,
    );

    // Q2: PDF-only fact
    const q2 = await ask(
        'Menurut sumber, berapa target ekspor awal UMKM Go Global 2025 dan berapa margin marketplace minimum?',
    );
    const a2 = String(q2.answer || '');
    const refs2 = q2.references || [];
    const q2ok =
        /15\s*persen|15%/i.test(a2) &&
        /25\s*persen|25%/i.test(a2) &&
        refs2.some((r) => /\.pdf/i.test(r.docName || ''));
    (q2ok ? pass : fail)(
        'P5_pdf_fact',
        `refs=${refs2.length} docs=${[...new Set(refs2.map((r) => r.docName))].join('|')} | ${preview(a2)}`,
    );

    // Q3: Combined fact from both files
    const q3 = await ask(
        'Gabungkan dari semua sumber: sebutkan satu fondasi tumbuh dari panduan umum dan satu syarat ekspor dari checklist Go Global.',
    );
    const a3 = String(q3.answer || '');
    const refs3 = q3.references || [];
    const docs3 = [...new Set(refs3.map((r) => r.docName || ''))];
    const hasTxtRef = docs3.some((d) => /\.txt/i.test(d));
    const hasPdfRef = docs3.some((d) => /\.pdf/i.test(d));
    const mentionsTxtTopic = /fondasi|pencatatan|pelanggan|kas|digitalisasi/i.test(a3);
    const mentionsPdfTopic = /ekspor|15|NIB|OSS|marketplace|25|NusaCraft|stok mati|8/i.test(a3);
    const q3ok = mentionsTxtTopic && mentionsPdfTopic && (hasTxtRef || hasPdfRef) && refs3.length >= 2;
    (q3ok ? pass : fail)(
        'P6_combined_context',
        `docs=${docs3.join('|')} hasTxt=${hasTxtRef} hasPdf=${hasPdfRef} refs=${refs3.length} | ${preview(a3)}`,
    );

    const failed = scenarios.filter((s) => s.status === 'FAIL');
    const report = {
        ok: failed.length === 0,
        notebookId: NB,
        sourceIds,
        sources: sources.map((s) => ({
            id: s.id,
            filename: s.filename,
            status: s.parse_status,
            chunks: s.chunk_count,
        })),
        scenarios,
    };
    const reportPath = path.join(__dirname, 'e2e-studio-two-sources-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (failed.length) process.exit(1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
