// netlify/functions/payment.js (optional proxy)
export async function handler(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const url = (process.env.NETLIFY ? '' : process.env.URL) + '/.netlify/functions/create-transaction';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json().catch(() => ({}));
    return { statusCode: resp.status, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
