const fs = require('fs');

const idsPath = '/app/dist/core/utils/ids.js';
let ids = fs.readFileSync(idsPath, 'utf8');
if (!ids.includes('WAHA_LID_ID_PATCH')) {
  const needle = 'function parseMessageIdSerialized(messageId, soft = false) {\n    if (!messageId.includes';
  const insert = `function parseMessageIdSerialized(messageId, soft = false) {
    // WAHA_LID_ID_PATCH: WhatsApp Web moved MsgKey._serialized -> $1
    if (messageId != null && typeof messageId === 'object') {
        messageId = messageId._serialized != null ? messageId._serialized : messageId.$1;
    }
    if (messageId == null || typeof messageId !== 'string') {
        return { id: messageId };
    }
    if (!messageId.includes`;
  if (!ids.includes(needle)) {
    console.error('ids.js needle not found');
    process.exit(1);
  }
  ids = ids.replace(needle, insert);
  fs.writeFileSync(idsPath, ids);
  console.log('patched ids.js');
} else {
  console.log('ids.js already patched');
}

const sessionPath = '/app/dist/core/engines/webjs/session.webjs.core.js';
let sess = fs.readFileSync(sessionPath, 'utf8');
if (sess.includes('WAHA_LID_ID_PATCH')) {
  console.log('session already patched');
  process.exit(0);
}

const oldKey = 'const key = (0, ids_1.parseMessageIdSerialized)(message.id._serialized);';
const newKey =
  '/* WAHA_LID_ID_PATCH */ const __sid = (message.id && (message.id._serialized || message.id.$1)); const key = (0, ids_1.parseMessageIdSerialized)(__sid, true);';
if (!sess.includes(oldKey)) {
  console.error('session toWAMessage key pattern not found');
  process.exit(1);
}
sess = sess.replace(oldKey, newKey);
sess = sess.replace(
  'id: message.id._serialized,\n            timestamp: message.timestamp',
  'id: (message.id && (message.id._serialized || message.id.$1)),\n            timestamp: message.timestamp',
);
fs.writeFileSync(sessionPath, sess);
console.log('patched session.webjs.core.js');
