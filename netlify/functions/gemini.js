// netlify/functions/gemini.js (ESM)
export const handler = async (event) => {
  try {
    const { prompt, model = "gemini-1.5-flash" } = JSON.parse(event.body || "{}");
    const key = process.env.GEMINI_API_KEY;
    if (!key) return json(500, { error: "Missing GEMINI_API_KEY" });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }]}] })
      }
    );
    if (!r.ok) return json(r.status, { error: await r.text() });
    return json(200, await r.json());
  } catch (e) { return json(500, { error: String(e) }); }
};
const json = (s, b) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
