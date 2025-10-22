// netlify/functions/gemini-vertex.js
// Vertex AI (Google Cloud) — CommonJS version (works with Netlify CLI/Lambda runtime)
// Env needed (set locally and on Netlify Site settings):
//   VERTEX_PROJECT_ID=genesis-473705
//   VERTEX_LOCATION=us-central1
//   GEMINI_MODEL=gemini-1.5-pro      # or gemini-2.0-flash / gemini-2.5-pro
//   GOOGLE_APPLICATION_CREDENTIALS_JSON=<service-account JSON contents>
//   # (or) GOOGLE_APPLICATION_CREDENTIALS_B64=<base64 of the same JSON>
//
// Optional:
//   FETCH_TIMEOUT_MS=20000            # request timeout in ms

const { GoogleAuth } = require('google-auth-library');

const ALLOWED_MODELS = new Set([
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
]);

const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || '20000', 10);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .finally(() => clearTimeout(t));
}

async function getClient() {
  // Prefer explicit creds from env (works on Netlify)
  const raw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS_B64
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_B64, 'base64').toString('utf8')
      : null);

  if (raw) {
    const creds = JSON.parse(raw);
    const auth = new GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    return auth.getClient();
  }

  // Local fallback: ADC (after `gcloud auth application-default login`)
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  return auth.getClient();
}

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};

    const projectId = process.env.VERTEX_PROJECT_ID;
    const location  = process.env.VERTEX_LOCATION || 'us-central1';
    if (!projectId) return json(500, { error: 'Missing VERTEX_PROJECT_ID' });

    const envModel = process.env.GEMINI_MODEL && ALLOWED_MODELS.has(process.env.GEMINI_MODEL)
      ? process.env.GEMINI_MODEL
      : null;
    const reqModel = body.model && ALLOWED_MODELS.has(body.model) ? body.model : null;
    const model    = reqModel || envModel || 'gemini-1.5-pro';

    const prompt = typeof body.prompt === 'string' && body.prompt.trim()
      ? body.prompt
      : 'Hello from Vertex';

    const client = await getClient();
    const tokenObj = await client.getAccessToken();
    const token = tokenObj && tokenObj.token;
    if (!token) return json(500, { error: 'Failed to obtain GCP access token' });

    const url =
      `https://${location}-aiplatform.googleapis.com/v1` +
      `/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return json(res.status, { error: text });
    }

    return json(200, JSON.parse(text));
  } catch (e) {
    return json(500, { error: String(e && e.message ? e.message : e) });
  }
};
