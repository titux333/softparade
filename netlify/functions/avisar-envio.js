// Lo llama el panel admin al marcar un pedido como enviado: avisa al cliente por email.
const mail = require('./_mail');
exports.handler = async e => {
  try {
    const { SUPABASE_URL: U, SUPABASE_SERVICE_KEY: K } = process.env;
    const token = (e.headers.authorization || '').replace('Bearer ', '');
    const adm = await fetch(U + '/rest/v1/rpc/es_admin', { method: 'POST', headers: { apikey: K, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' });
    if ((await adm.json()) !== true) return { statusCode: 403, body: 'No autorizado' };
    const { id } = JSON.parse(e.body);
    if (!/^[0-9a-f-]{36}$/.test(id)) return { statusCode: 400, body: 'Pedido inválido' };
    const [o] = await (await fetch(`${U}/rest/v1/pedidos?id=eq.${id}`, { headers: { apikey: K, Authorization: 'Bearer ' + K } })).json();
    if (o) await mail(o.email, 'Tu pedido fue enviado - softparade cells', `<p>¡Buenas noticias! Tu pedido ya está en camino.</p><p>Dirección: ${String(o.direccion).replace(/[<>&]/g, '')}</p>`);
    return { statusCode: 200, body: 'ok' };
  } catch (_) { return { statusCode: 500, body: 'Error' }; }
};
