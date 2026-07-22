const GQL = 'http://127.0.0.1:4001/graphql';
async function gql(token, query, variables = {}) {
    const r = await fetch(GQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    const j = await r.json();
    if (j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
}

const s = await gql(
    null,
    `mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken user{id} } }`,
    { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
);
const token = s.signIn.accessToken;
const userId = s.signIn.user.id;
const nb = 'ca9ba8f7-9064-4cd5-af7b-ad857d001e4c';
const sid = 'fbbf538f-9926-46de-8050-e1e41a84faaa';

async function ask(question, sourceIds) {
    const c = await gql(
        token,
        `mutation($notebookId:String!,$question:String!,$userId:String,$sourceIds:[String!]){
      studioChat(notebookId:$notebookId,question:$question,userId:$userId,sourceIds:$sourceIds)
    }`,
        { notebookId: nb, question, userId, sourceIds },
    );
    const chat = c.studioChat;
    return {
        question,
        refs: (chat.references || []).length,
        scores: (chat.references || []).map((r) => Number(r.score?.toFixed?.(3) ?? r.score)),
        answer: String(chat.answer || '').slice(0, 420),
    };
}

const cases = [
    ['in-domain', 'Apa fondasi utama agar UMKM tumbuh menurut sumber?', [sid]],
    ['ood', 'Siapa juara Piala Dunia 2022?', [sid]],
    ['no-sources', 'Apa fondasi utama agar UMKM tumbuh menurut sumber?', []],
];

const out = [];
for (const [name, q, sources] of cases) {
    try {
        const r = await ask(q, sources);
        out.push({ name, ok: true, ...r });
    } catch (e) {
        out.push({ name, ok: false, error: String(e.message || e).slice(0, 200) });
    }
}

const checks = {
    inDomain:
        out[0]?.ok &&
        out[0].refs > 0 &&
        /fondasi|pencatatan|kas|UMKM|sumber/i.test(out[0].answer) &&
        !/pendapatan dasar yang diperlukan/i.test(out[0].answer),
    oodRefuse:
        out[1]?.ok &&
        out[1].refs === 0 &&
        /tidak menemukan|tidak relevan|cuplikan yang relevan/i.test(out[1].answer) &&
        !/Argentina|juara/i.test(out[1].answer),
    noSources:
        out[2]?.ok &&
        out[2].refs === 0 &&
        /centang|Select at least one/i.test(out[2].answer),
};

console.log(JSON.stringify({ checks, out }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
