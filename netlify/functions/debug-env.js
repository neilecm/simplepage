exports.handler = async () => {
  const hasJSON = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length > 100);
  const hasB64  = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS_B64 && process.env.GOOGLE_APPLICATION_CREDENTIALS_B64.length > 100);
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      project: process.env.VERTEX_PROJECT_ID,
      location: process.env.VERTEX_LOCATION,
      hasJSON, hasB64,
      model: process.env.GEMINI_MODEL || null
    })
  };
};
