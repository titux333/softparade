// Mercado Pago avisa acá cuando un pago se aprueba: marca pagado, descuenta stock y envía emails.
const mail = require('./_mail');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
exports.handler = async e => {
  try {
    const { SUPABASE_URL: U, SUPABASE_SERVICE_KEY: K, MP_ACCESS_TOKEN: MP, MAIL_ADMIN } = process.env;
    const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
    const q = e.queryStringParameters || {};
    let id = q['data.id'] || q.id;
    try { const b = JSON.parse(e.body || '{}'); id = id || (b.data && b.data.id); } catch (_) {}
    if (!id) return { statusCode: 200, body: 'ok' };
    const p = await (await fetch('https://api.mercadopago.com/v1/payments/' + id, { headers: { Authorization: 'Bearer ' + MP } })).json();
    const ref = p.external_reference || '';
    if (p.status === 'approved' && /^[0-9a-f-]{36}$/.test(ref)) {
      const r = await fetch(U + '/rest/v1/rpc/marcar_pagado', { method: 'POST', headers: H, body: JSON.stringify({ p_id: ref }) });
      if ((await r.json()) === true) {
        const [o] = await (await fetch(`${U}/rest/v1/pedidos?id=eq.${ref}`, { headers: H })).json();
        const lista = (o.items || []).map(i => `${i.qty} x ${esc(i.nombre)}`).join('<br>');
        await mail(o.email, 'Recibimos tu pago - softparade cells', `<p>¡Gracias por tu compra, ${esc(o.nombre)}!</p><p>${lista}</p><p>Total: $${o.total}</p><p>Te avisamos cuando lo enviemos.</p>`);
        await mail(MAIL_ADMIN, 'Nuevo pedido pagado', `<p>${esc(o.nombre)} · ${esc(o.telefono)} · ${esc(o.email)}</p><p>${esc(o.direccion)}</p><p>${lista}</p><p>Total: $${o.total}</p>`);
      }
    }
  } catch (_) {}
  return { statusCode: 200, body: 'ok' };
};
