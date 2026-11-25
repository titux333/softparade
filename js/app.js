const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let prods = [], cart = JSON.parse(localStorage.getItem('cart') || '[]'), cat = '', session = null;

$('#yr').textContent = new Date().getFullYear();
$('#wa').href = 'https://wa.me/' + CFG.WHATSAPP;

// ----- Productos -----
async function loadProds() {
  const { data, error } = await sb.from('productos').select('*').eq('activo', true).order('creado', { ascending: false });
  prods = data || [];
  if (error) $('#grid').innerHTML = '<p>No se pudieron cargar los productos.</p>';
  else renderGrid();
}
function renderGrid() {
  const list = prods.filter(p => !cat || p.categoria === cat);
  $('#grid').innerHTML = list.length ? list.map(p => `
    <article class="card"><div class="ph">${p.imagen ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">` : 'Sin foto'}</div>
    <div class="bd"><h3>${esc(p.nombre)}</h3>
    <ul>${(p.caracteristicas || '').split('\n').filter(Boolean).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="price">${money(p.precio)}</div>
    ${p.stock > 0 ? `<button class="btn" data-add="${p.id}">Agregar al carrito</button>` : '<span class="out">Sin stock</span>'}</div></article>`).join('')
    : '<p>Pronto sumaremos productos.</p>';
}
document.querySelectorAll('.filt button').forEach(b => b.onclick = () => {
  cat = b.dataset.c; document.querySelectorAll('.filt button').forEach(x => x.classList.toggle('on', x === b)); renderGrid();
});
$('#grid').onclick = e => { const id = e.target.dataset.add; if (id) add(id, 1); };

// ----- Carrito -----
function save() { localStorage.setItem('cart', JSON.stringify(cart)); $('#cnt').textContent = cart.reduce((s, i) => s + i.qty, 0); }
function add(id, n) {
  const p = prods.find(x => x.id === id), it = cart.find(i => i.id === id);
  if (it) it.qty = Math.min(p ? p.stock : 99, it.qty + n); else cart.push({ id, qty: 1 });
  cart = cart.filter(i => i.qty > 0); save(); renderCart(); if (n > 0) $('#dCart').showModal();
}
function renderCart() {
  let t = 0;
  $('#cartList').innerHTML = cart.length ? cart.map(i => {
    const p = prods.find(x => x.id === i.id); if (!p) return ''; t += p.precio * i.qty;
    return `<div class="row"><span>${esc(p.nombre)}<br>${money(p.precio)}</span>
    <span><button class="btn btn--g btn--s" data-m="${i.id}">−</button> ${i.qty} <button class="btn btn--g btn--s" data-p="${i.id}">+</button></span></div>`;
  }).join('') : '<p>Tu carrito está vacío.</p>';
  $('#tot').textContent = money(t);
}
$('#cartList').onclick = e => { if (e.target.dataset.m) add(e.target.dataset.m, -1); if (e.target.dataset.p) add(e.target.dataset.p, 1); };
$('#btnCart').onclick = () => { renderCart(); $('#dCart').showModal(); };
$('#btnBuy').onclick = () => {
  if (!cart.length) return;
  $('#dCart').close(); session ? $('#dPay').showModal() : $('#dAuth').showModal();
};

// ----- Cuenta -----
const setUser = s => { session = s; $('#btnUser').textContent = s ? 'Salir' : 'Ingresar'; $('#btnOrders').hidden = !s; };
sb.auth.onAuthStateChange((_e, s) => setUser(s));
sb.auth.getSession().then(({ data }) => setUser(data.session));
$('#btnUser').onclick = () => session ? sb.auth.signOut() : $('#dAuth').showModal();
$('#fAuth').onsubmit = async e => {
  e.preventDefault(); const f = new FormData(e.target);
  const { error } = await sb.auth.signInWithPassword({ email: f.get('email'), password: f.get('pass') });
  $('#authMsg').textContent = error ? 'Email o contraseña incorrectos.' : '';
  if (!error) $('#dAuth').close();
};
$('#btnReg').onclick = async () => {
  const f = new FormData($('#fAuth'));
  const { error } = await sb.auth.signUp({ email: f.get('email'), password: f.get('pass') });
  $('#authMsg').textContent = error ? error.message : 'Cuenta creada. Si pide confirmar el email, revisá tu casilla; luego ingresá.';
};

// ----- Mis pedidos -----
$('#btnOrders').onclick = async () => {
  const { data } = await sb.from('pedidos').select('*').order('creado', { ascending: false });
  $('#ordList').innerHTML = (data || []).map(p => `<div class="row"><span>${new Date(p.creado).toLocaleDateString('es-AR')} · ${(p.items || []).map(i => `${i.qty} x ${esc(i.nombre)}`).join(', ')}<br>${p.estado === 'pagado' ? (p.enviado ? '📦 Enviado' : '✅ Pagado, en preparación') : '⏳ Pago pendiente'}</span><strong>${money(p.total)}</strong></div>`).join('') || '<p>Todavía no hiciste compras.</p>';
  $('#dOrders').showModal();
};

// ----- Pago -----
$('#fPay').onsubmit = async e => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); $('#payMsg').textContent = 'Creando pago...';
  try {
    const r = await fetch('/.netlify/functions/crear-pago', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({ items: cart, ...f }) });
    const d = await r.json();
    if (!d.url) throw new Error(d.error || 'Error');
    cart = []; save(); location.href = d.url;
  } catch (err) { $('#payMsg').textContent = err.message; }
};

// ----- Reparaciones -----
$('#fRep').onsubmit = async e => {
  e.preventDefault();
  const { error } = await sb.from('reparaciones').insert(Object.fromEntries(new FormData(e.target)));
  $('#repMsg').textContent = error ? 'No se pudo enviar. Probá por WhatsApp.': '¡Recibimos tu solicitud! Te contactamos pronto.';
  if (!error) e.target.reset();
};

if (new URLSearchParams(location.search).get('pago') === 'ok') { cart = []; alert('¡Gracias por tu compra! Recibimos tu pedido.'); }
save(); loadProds();
