const GQL = 'http://127.0.0.1:4001/graphql';
const nb = process.argv[2] || 'ca9ba8f7-9064-4cd5-af7b-ad857d001e4c';

async function gql(token, query, variables) {
    const res = await fetch(GQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    return res.json();
}

const sign = await gql(
    null,
    `mutation($e:String!,$p:String!){ signIn(input:{email:$e,password:$p}){ accessToken user{id} } }`,
    { e: 'admin@nusantarasoft.local', p: 'Nusantarasoft123!' },
);
const token = sign.data.signIn.accessToken;
const userId = sign.data.signIn.user.id;
const chat = await gql(
    token,
    `mutation($notebookId:String!,$question:String!,$userId:String,$sourceIds:[String!]){
    studioChat(notebookId:$notebookId,question:$question,userId:$userId,sourceIds:$sourceIds)
  }`,
    { notebookId: nb, question: 'ringkas dokumen', userId, sourceIds: [] },
);
const c = chat.data?.studioChat;
console.log(
    JSON.stringify(
        {
            status: c?.documentRetrievalStatus,
            refs: c?.references?.length || 0,
            answer: (c?.answer || '').slice(0, 200),
            errors: chat.errors,
        },
        null,
        2,
    ),
);
