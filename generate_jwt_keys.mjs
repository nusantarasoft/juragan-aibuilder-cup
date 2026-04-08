// Generate new ANON_KEY and SERVICE_ROLE_KEY JWTs
// Signed with the new JWT_SECRET from .env

import crypto from 'crypto';

const JWT_SECRET = 'bTv2VJhq4HPcA8YoNgl9RZw5DMx3CBt6Q0OkmzyUaSedjKr1WGiIfpu7LEFXsn';

function base64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  return `${headerB64}.${payloadB64}.${base64url(signature)}`;
}

// Set expiry to Jan 1, 2037 (10+ years from now)
const iat = Math.floor(Date.now() / 1000);
const exp = 2114380800; // 2037-01-01T00:00:00Z

const anonKey = createJWT({
  role: 'anon',
  iss: 'supabase',
  iat,
  exp,
});

const serviceRoleKey = createJWT({
  role: 'service_role',
  iss: 'supabase',
  iat,
  exp,
});

console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceRoleKey}`);
