// Vertex AI — CommonJS; robust creds detection (JSON, B64, or path for local dev)
const { GoogleAuth } = require('google-auth-library');

const ALLOWED = new Set(['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-2.5-pro']);
const TIMEOUT = parseInt(process.env.FETCH_TIMEOUT_MS || '20000', 10);

function json(status, body) {
  return { statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

function fetchWithTimeout(url, opts = {}, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function readCreds() {
  // Prefer explicit envs (safe for Netlify)
  const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const rawB64  = process.env.GOOGLE_APPLICATION_CREDENTIALS_B64;
  if (rawJson && rawJson.trim()) {
    try {
      const s = rawJson.trim();
      // if someone pasted base64 into *_JSON, decode then parse
      if (!s.startsWith('{')) return JSON.parse(Buffer.from(s, 'base64').toString('utf8'));
      return JSON.parse(s);
    } catch {}
  }
  if (rawB64 && rawB64.trim()) {
    try {
      return JSON.parse(Buffer.from(rawB64.trim(), 'base64').toString('utf8'));
    } catch {}
  }
  // Local dev: support GOOGLE_APPLICATION_CREDENTIALS as a **file path**
  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (filePath) {
    try {
      const fs = require('fs');
      const s = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(s);
    } catch {}
  }
  return null; // fall back to ADC
}

async function getClient() {
  const creds = readCreds();
  const auth = creds
    ? new GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
    : new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }); // ADC if configured
  return auth.getClient();
}

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const project = process.env.VERTEX_PROJECT_ID;
    const loc     = process.env.VERTEX_LOCATION || 'us-central1';
    if (!project) return json(500, { error: 'Missing VERTEX_PROJECT_ID' });

    const model =
      (typeof body.model === 'string' && ALLOWED.has(body.model) && body.model) ||
      (ALLOWED.has(process.env.GEMINI_MODEL || '') && process.env.GEMINI_MODEL) ||
      'gemini-2.0-flash';

    const prompt = (body.prompt && String(body.prompt).trim()) || 'Hello from Vertex';

    const client = await getClient();
    const { token } = await client.getAccessToken();
    if (!token) return json(500, { error: 'Failed to obtain GCP access token (check creds env)' });

    const url =
      `https://${loc}-aiplatform.googleapis.com/v1/projects/${project}/locations/${loc}` +
      `/publishers/google/models/${model}:generateContent`;

    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }]}] }),
    });

    const text = await r.text();
    if (!r.ok) return json(r.status, { error: text });
    return json(200, JSON.parse(text));
  } catch (e) {
    return json(500, { error: String(e && e.message ? e.message : e) });
  }
};
