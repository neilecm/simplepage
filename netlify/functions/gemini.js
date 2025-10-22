const MODEL_ALIAS = {
  "flash": "gemini-1.5-flash-latest",
  "flash-8b": "gemini-1.5-flash-8b-latest",
  "pro": "gemini-1.5-pro-latest"
};

exports.handler = async (event) => {
  try {
    const { prompt, model = "flash" } = JSON.parse(event.body || "{}");
    if (!process.env.GEMINI_API_KEY) return json(500, { error: "Missing GEMINI_API_KEY" });

    const resolvedModel = MODEL_ALIAS[model] || MODEL_ALIAS.flash; // default to flash-latest
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt || "Say hi" }]}]
      })
    });

    const text = await r.text();
    if (!r.ok) return json(r.status, { error: text });

    return json(200, JSON.parse(text));
  } catch (e) {
    return json(500, { error: String(e) });
  }
};

const json = (s, b) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(b) });