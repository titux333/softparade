// Crea el pedido y el link de pago de Mercado Pago. Los precios se leen de la base, nunca del navegador.
const hdr = k => ({ apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' });
const out = (c, b) => ({ statusCode: c, body: JSON.stringify(b) });
exports.handler = async e => {
  try {
    if (e.httpMethod !== 'POST') return out(405, { error: 'Método no permitido' });
    const { SUPABASE_URL: U, SUPABASE_SERVICE_KEY: K, MP_ACCESS_TOKEN: MP, SITE_URL: S } = process.env;
    const token = (e.headers.authorization || '').replace('Bearer ', '');
    const ur = await fetch(U + '/auth/v1/user', { headers: { apikey: K, Authorization: 'Bearer ' + token } });
    if (!ur.ok) return out(401, { error: 'Iniciá sesión para comprar' });
    const user = await ur.json();
    const { items, nombre, telefono, direccion } = JSON.parse(e.body);
    const ok = /^[0-9a-f-]{36}$/;
    if (!Array.isArray(items) || !items.length || !items.every(i => ok.test(i.id) && i.qty > 0)) return out(400, { error: 'Carrito inválido' });
    const pr = await fetch(`${U}/rest/v1/productos?activo=eq.true&id=in.(${items.map(i => i.id).join(',')})`, { headers: hdr(K) });
    const prods = await pr.json();
    const lines = [];
    for (const i of items) {
      const p = prods.find(x => x.id === i.id);
      if (!p || p.stock < i.qty) return out(400, { error: 'Sin stock suficiente: ' + (p ? p.nombre : 'producto') });
      lines.push({ id: p.id, nombre: p.nombre, precio: Number(p.precio), qty: Number(i.qty) });
    }
    const total = lines.reduce((s, l) => s + l.precio * l.qty, 0);
    const or = await fetch(U + '/rest/v1/pedidos', { method: 'POST', headers: { ...hdr(K), Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: user.id, email: user.email, nombre, telefono, direccion, items: lines, total }) });
    const pedido = (await or.json())[0];
    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST',
      headers: { Authorization: 'Bearer ' + MP, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: lines.map(l => ({ title: l.nombre, quantity: l.qty, unit_price: l.precio, currency_id: 'ARS' })),
        external_reference: pedido.id,
        notification_url: S + '/.netlify/functions/webhook-mp',
        back_urls: { success: S + '/?pago=ok', failure: S + '/?pago=error', pending: S + '/?pago=ok' },
        auto_return: 'approved'
      }) });
    const pref = await mp.json();
    if (!pref.init_point) return out(500, { error: 'No se pudo crear el pago' });
    return out(200, { url: pref.init_point });
  } catch (err) { return out(500, { error: 'Error del servidor' }); }
};
