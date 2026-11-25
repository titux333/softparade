const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = d => new Date(d).toLocaleString('es-AR');

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: ok } = await sb.rpc('es_admin');
  if (!ok) { $('#logMsg').textContent = 'Esta cuenta no es de administrador.'; return; }
  $('#login').hidden = true; $('#panel').hidden = false; $('#out').hidden = false;
  loadPedidos(); loadProds(); loadReps();
}
$('#fLog').onsubmit = async e => {
  e.preventDefault(); const f = new FormData(e.target);
  const { error } = await sb.auth.signInWithPassword({ email: f.get('email'), password: f.get('pass') });
  if (error) $('#logMsg').textContent = 'Datos incorrectos.'; else init();
};
$('#out').onclick = async () => { await sb.auth.signOut(); location.reload(); };
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-t]').forEach(x => { x.classList.toggle('btn--g', x !== b); $('#' + x.dataset.t).hidden = x !== b; });
});

async function loadPedidos() {
  const { data } = await sb.from('pedidos').select('*').order('creado', { ascending: false });
  $('#pedidos').innerHTML = `<table><tr><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Pago</th><th>Enviado</th></tr>` +
    (data || []).map(p => `<tr><td>${fecha(p.creado)}</td>
    <td>${esc(p.nombre)}<br>${esc(p.telefono)}<br>${esc(p.email)}<br>${esc(p.direccion)}</td>
    <td>${(p.items || []).map(i => `${i.qty} x ${esc(i.nombre)}`).join('<br>')}</td><td>${money(p.total)}</td>
    <td>${p.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}</td>
    <td><input type="checkbox" ${p.enviado ? 'checked' : ''} data-env="${p.id}"></td></tr>`).join('') + '</table>';
}
$('#pedidos').onchange = async e => {
  const id = e.target.dataset.env; if (!id) return;
  await sb.from('pedidos').update({ enviado: e.target.checked }).eq('id', id);
  if (e.target.checked) {
    const { data: { session } } = await sb.auth.getSession();
    fetch('/.netlify/functions/avisar-envio', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  }
};

async function loadProds() {
  const { data } = await sb.from('productos').select('*').order('creado', { ascending: false });
  $('#listaProd').innerHTML = (data || []).map(p => `<div class="row"><span>${p.activo ? '' : '🙈 '}${esc(p.nombre)} · ${money(p.precio)} · stock ${p.stock}</span>
    <span><button class="btn btn--g btn--s" data-ed="${p.id}" data-pr="${p.precio}" data-st="${p.stock}">Precio/stock</button>
    <button class="btn btn--g btn--s" data-vis="${p.id}" data-a="${p.activo}">${p.activo ? 'Ocultar' : 'Mostrar'}</button>
    <button class="btn btn--g btn--s" data-del="${p.id}">Borrar</button></span></div>`).join('') || '<p>Todavía no cargaste productos.</p>';
}
$('#listaProd').onclick = async e => {
  const d = e.target.dataset;
  if (d.ed) {
    const pr = prompt('Precio', d.pr); if (pr === null) return; const st = prompt('Stock', d.st); if (st === null) return;
    await sb.from('productos').update({ precio: Number(pr), stock: Number(st) }).eq('id', d.ed);
  } else if (d.vis) await sb.from('productos').update({ activo: d.a !== 'true' }).eq('id', d.vis);
  else if (d.del && confirm('¿Borrar este producto?')) await sb.from('productos').delete().eq('id', d.del);
  else return;
  loadProds();
};
$('#fProd').onsubmit = async e => {
  e.preventDefault(); const f = new FormData(e.target), file = f.get('foto'); let imagen = null; $('#prodMsg').textContent = 'Guardando...';
  if (file && file.size) {
    const path = Date.now() + '-' + file.name.replace(/[^a-z0-9.]/gi, '_');
    const up = await sb.storage.from('productos').upload(path, file);
    if (up.error) { $('#prodMsg').textContent = 'Error al subir la foto.'; return; }
    imagen = sb.storage.from('productos').getPublicUrl(path).data.publicUrl;
  }
  const { error } = await sb.from('productos').insert({ nombre: f.get('nombre'), categoria: f.get('categoria'), precio: Number(f.get('precio')),
    stock: Number(f.get('stock')), caracteristicas: f.get('caracteristicas'), imagen });
  $('#prodMsg').textContent = error ? 'Error: ' + error.message : 'Producto guardado.';
  if (!error) { e.target.reset(); loadProds(); }
};

async function loadReps() {
  const { data } = await sb.from('reparaciones').select('*').order('creado', { ascending: false });
  const est = ['nueva', 'en revisión', 'presupuestada', 'reparada', 'entregada'];
  $('#reparaciones').innerHTML = `<table><tr><th>Fecha</th><th>Cliente</th><th>Equipo</th><th>Problema</th><th>Estado</th></tr>` +
    (data || []).map(r => `<tr><td>${fecha(r.creado)}</td><td>${esc(r.nombre)}<br>${esc(r.telefono)}</td><td>${esc(r.equipo)}</td><td>${esc(r.problema)}</td>
    <td><select data-rep="${r.id}">${est.map(s => `<option ${s === r.estado ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('') + '</table>';
}
$('#reparaciones').onchange = async e => { const id = e.target.dataset.rep; if (id) await sb.from('reparaciones').update({ estado: e.target.value }).eq('id', id); };
init();
