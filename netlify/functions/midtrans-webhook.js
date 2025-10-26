// netlify/functions/midtrans-webhook.js
const crypto = require('crypto');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const body = JSON.parse(event.body || '{}');

  const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;
  const sig = crypto.createHash('sha512')
    .update(order_id + status_code + gross_amount + process.env.MIDTRANS_SERVER_KEY)
    .digest('hex');

  if (sig !== signature_key) return { statusCode: 401, body: 'Invalid signature' };

  // TODO: update orders table status, link address.order_id if you saved address first
  // e.g., supabase.from('orders').update({ status: transaction_status }).eq('order_id', order_id)

  return { statusCode: 200, body: 'OK' };
};
