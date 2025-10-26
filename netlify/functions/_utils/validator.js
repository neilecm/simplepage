export function requireString(value, name) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) throw new Error(`${name} required`);
  return v;
}

export function normalizeAmount(input) {
  let n = Number(
    input?.total ??
    input?.amount ??
    input?.gross_amount ??
    (input?.transaction_details && input.transaction_details.gross_amount) ??
    0
  );
  if (!Number.isFinite(n)) n = 0;
  if (n <= 0) throw new Error('gross_amount must be a positive number');
  return n;
}

export function ensureArray(value, name) {
  if (value == null) return undefined;
  if (!Array.isArray(value)) throw new Error(`${name} must be an array when provided`);
  return value;
}

export function ensureObject(value, name) {
  if (value == null) return undefined;
  if (typeof value !== 'object') throw new Error(`${name} must be an object when provided`);
  return value;
}

export function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it, idx) => ({
    id: String(it.id ?? idx + 1),
    price: Number(it.price ?? 0),
    quantity: Number(it.quantity ?? 1),
    name: String(it.name ?? 'Item')
  })).filter(it => Number.isFinite(it.price) && it.price >= 0 && Number.isFinite(it.quantity) && it.quantity > 0);
}

