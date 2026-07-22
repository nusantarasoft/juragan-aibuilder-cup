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

const c = await gql(
    token,
    `mutation($notebookId:String!,$question:String!,$userId:String,$sourceIds:[String!]){
    studioChat(notebookId:$notebookId,question:$question,userId:$userId,sourceIds:$sourceIds)
  }`,
    {
        notebookId: nb,
        question: 'Siapa juara Piala Dunia 2022?',
        userId,
        sourceIds: [sid],
    },
);
const chat = c.studioChat;
console.log(
    JSON.stringify(
        {
            refs: (chat.references || []).length,
            answer: chat.answer,
            keys: Object.keys(chat || {}),
        },
        null,
        2,
    ),
);
