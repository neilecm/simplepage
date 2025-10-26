export function ok(body, status = 200) {
  return { statusCode: status, body: JSON.stringify(body) };
}

export function badRequest(message, code = 'bad_request') {
  return ok({ error: { code, message } }, 400);
}

export function serverError(message, code = 'server_error') {
  return ok({ error: { code, message } }, 500);
}

export function gatewayError(message, code = 'gateway_error') {
  return ok({ error: { code, message } }, 502);
}

