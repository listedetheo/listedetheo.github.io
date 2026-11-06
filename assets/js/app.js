import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { buildScene } from './scene.js';
import { initDecor } from './decor.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Outils ---------- */
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* stockage indisponible */ } }
};
const NB = ' ';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => {
  const v = Math.round(Number(n) * 100) / 100;
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
  return s + NB + '€';
};
const joinFr = (a) => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]);
const q = (t) => '«' + NB + t + NB + '»';
const $ = (sel) => document.querySelector(sel);
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PRIO = { reve: 'Le rêve', grande: 'Grande envie', envie: 'Envie' };
const STAR = '<path fill="#A07C3A" d="M6 0l1.8 3.9 4.2.5-3.1 2.9.8 4.2L6 9.4 2.3 11.5l.8-4.2L0 4.4l4.2-.5z"></path>';
const stars = (n) => `<svg width="${n * 14 - 2}" height="12" viewBox="0 0 ${n * 14 - 2} 12" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<g transform="translate(${i * 14} 0)">${STAR}</g>`).join('')}</svg>`;
const I = {
  gift: (s = 20) => `<svg class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"></path></svg>`,
  ext: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>',
  arrow: '<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"></path><path d="M7 7h10v10"></path></svg>',
  share: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 13.5 6.8 4"></path><path d="m15.4 6.5-6.8 4"></path></svg>',
  close: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
  tick: '<svg class="icon tick" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F3A2E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
  key: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A5A22" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:1px"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>',
  people: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A5A22" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:1px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  info: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D2B072" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:2px"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>'
};

/* ---------- État ---------- */
const state = {
  board: null,
  token: LS.get('ldn_token'),
  filter: 'all',
  loading: true,
  error: false,
  confirmCancel: null,
  justDone: null,
  sheet: null,
  recover: null,
  done: null
};

const gifts = () => (state.board && state.board.gifts) || [];
const giftById = (id) => gifts().find((g) => g.id === id);
const isOwner = () => !!(state.board && state.board.owner);
const me = () => (state.board && state.board.me) || null;
const isOpen = (g) => g.status === 'free' || g.status === 'part' || g.status === 'hidden';
const remainOf = (g) => Math.max(0, Math.round((Number(g.price) - Number(g.raised || 0)) * 100) / 100);
const giftLink = (g) => `${location.origin}${location.pathname}#cadeau-${g.id}`;

/* ---------- Chargement ---------- */
async function load() {
  const { data, error } = await sb.rpc('get_board', { p_token: state.token || null });
  state.loading = false;
  if (error) {
    state.error = true;
    render();
    return;
  }
  state.error = false;
  state.board = data;
  if (state.token && !data.me) {
    state.token = null;
    LS.del('ldn_token');
  }
  render();
}

/* ---------- Rendu ---------- */
function nightsLeft() {
  const now = new Date();
  let xmas = new Date(now.getFullYear(), 11, 25);
  if (now > xmas) xmas = new Date(now.getFullYear() + 1, 11, 25);
  return Math.max(0, Math.ceil((xmas - now) / 86400000));
}

function renderCountdown() {
  const n = nightsLeft();
  $('#countdown').innerHTML = n === 0
    ? '<span class="l">C’est Noël !</span>'
    : `<span class="n">${n}</span><span class="l">${n === 1 ? 'nuit avant Noël' : 'nuits avant Noël'}</span>`;
}

function render() {
  renderOwnerBanner();
  renderTabs();
  renderHello();
  renderGrid();
  renderFooterExtra();
}

function renderOwnerBanner() {
  $('#owner-banner').innerHTML = isOwner()
    ? '<div class="owner-banner">Mode Théo : sur cet appareil, les réservations sont masquées. Pour modifier la liste, va dans l’<a href="admin.html">espace Théo</a>.</div>'
    : '';
}

function renderTabs() {
  const all = gifts();
  if (!all.length || isOwner()) { $('#tabs').innerHTML = ''; return; }
  const free = all.filter(isOpen).length;
  const t = (key, label) => `<button class="tab" type="button" data-action="filter" data-filter="${key}" aria-pressed="${state.filter === key}">${label}</button>`;
  $('#tabs').innerHTML = t('all', `Tous · ${all.length}`) + t('free', `Disponibles · ${free}`) + t('taken', `Réservés · ${all.length - free}`);
}

function renderHello() {
  const m = me();
  if (!m || isOwner()) { $('#hello').innerHTML = ''; return; }
  const mine = gifts().filter((g) => g.mine).length;
  const count = mine === 0 ? 'rien de réservé pour l’instant' : `${mine} ${mine > 1 ? 'cadeaux à toi' : 'cadeau à toi'}`;
  $('#hello').innerHTML = `<div class="hello">
    <div><div class="hello-name">Bon retour, ${esc(m.name)}</div><div class="hello-sub">Cet appareil te reconnaît · ${count}</div></div>
    <div class="hello-actions">
      ${mine ? `<button class="pill-btn" type="button" data-action="filter" data-filter="${state.filter === 'mine' ? 'all' : 'mine'}" aria-pressed="${state.filter === 'mine'}">${state.filter === 'mine' ? 'Voir tout' : 'Mes cadeaux'}</button>` : ''}
      <button class="link-light" type="button" data-action="forget-me">Ce n’est pas moi</button>
    </div>
  </div>`;
}

/* Regroupe les cadeaux par catégorie, dans l'ordre choisi par Théo ; les cadeaux sans catégorie vont à la fin. */
function groupByCategory(list) {
  const order = (state.board && state.board.categories) || [];
  const map = new Map();
  list.forEach((g) => {
    const key = g.category && order.includes(g.category) ? g.category : null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(g);
  });
  const groups = order.filter((c) => map.has(c)).map((c) => ({ name: c, items: map.get(c) }));
  if (map.has(null)) groups.push({ name: null, items: map.get(null) });
  return groups;
}

function visible(g) {
  const open = isOpen(g);
  switch (state.filter) {
    case 'free': return open;
    case 'taken': return !open;
    case 'mine': return !!g.mine;
    default: return true;
  }
}

function photo(g, thumb) {
  const img = g.image_url ? `<img src="${esc(g.image_url)}" alt="" loading="lazy">` : (thumb ? I.gift(18) : `${I.gift()}<span>Photo à venir</span>`);
  const cls = `ph${thumb ? ' thumb' : ''}${g.image_url ? ' has-img' : ''}`;
  if (!g.url) return `<div class="${cls}">${img}</div>`;
  const chip = thumb ? '' : `<span class="ph-chip">Voir chez ${esc(g.merchant || 'le vendeur')}${I.arrow}</span>`;
  return `<a class="${cls}" href="${esc(g.url)}" target="_blank" rel="noopener" aria-label="Voir le produit exact : ${esc(g.name)}">${img}${chip}</a>`;
}

function prioLabel(g) {
  const n = g.priority === 'reve' ? 3 : g.priority === 'grande' ? 2 : 0;
  return `<span class="prio">${n ? stars(n) : ''}${esc(PRIO[g.priority] || 'Envie')}</span>`;
}

function namesFor(g) {
  const m = me();
  return (g.participants || []).map((n) => (g.mine && m && n === m.name ? 'toi' : n));
}

function cancelBlock(g) {
  if (!g.mine) return '';
  const label = g.mine.kind === 'part' ? `Annuler ma participation (${euro(g.mine.amount)})` : 'Annuler ma réservation';
  if (state.confirmCancel === g.id) {
    return `<div class="confirm-box"><p>${g.mine.kind === 'part' ? 'Retirer ta participation ?' : 'Annuler ta réservation ?'} Le cadeau redeviendra disponible pour les autres.</p>
      <div class="acts"><button class="b b-main" type="button" data-action="cancel-yes" data-id="${g.id}">Oui, annuler</button><button class="b b-line" type="button" data-action="cancel-no">Non, garder</button></div></div>`;
  }
  return `<button class="b-text" type="button" data-action="cancel-ask" data-id="${g.id}">${label}</button>`;
}

function openCard(g, i) {
  const hidden = g.status === 'hidden';
  const part = g.status === 'part';
  const remain = remainOf(g);
  const specs = (g.specs || []).map((s) => `<span class="spec">${esc(s)}</span>`).join('');
  let actions = '';
  if (!hidden) {
    if (g.status === 'free') {
      actions = `<div class="acts"><button class="b b-main" type="button" data-action="reserve" data-id="${g.id}">Réserver</button>${g.allow_group ? `<button class="b b-line" type="button" data-action="participate" data-id="${g.id}">Participer</button>` : ''}</div>`;
    } else if (part) {
      actions = `<div class="acts"><button class="b b-main" type="button" data-action="participate" data-id="${g.id}">Participer · reste ${euro(remain)}</button></div>`;
    }
  }
  const names = namesFor(g);
  return `<article class="tag">
    <span class="hole" aria-hidden="true"></span>
    <div class="tag-top"><span class="num">N° ${i}</span>${prioLabel(g)}</div>
    ${photo(g, false)}
    <div class="title-row"><h2 class="gname">${esc(g.name)}</h2><span class="gprice">${euro(g.price)}</span></div>
    ${specs ? `<div class="specs">${specs}</div>` : ''}
    ${part ? `<div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
        <div class="bar"><div class="bar-fill" style="width:${Math.min(100, Math.round(Number(g.raised) / Number(g.price) * 100))}%"></div></div>
        <div class="bar-meta"><span>${euro(g.raised)} réunis sur ${euro(g.price)}</span><span>${names.length} ${names.length > 1 ? 'participants' : 'participant'}</span></div>
        <span class="with">Avec ${esc(joinFr(names))}</span></div>` : ''}
    ${g.note ? `<div><span class="k note-k">Le mot de Théo</span><p class="hand">${esc(g.note)}</p></div>` : ''}
    <div class="row">
      ${g.url ? `<a class="b b-product" href="${esc(g.url)}" target="_blank" rel="noopener">${I.ext}Voir le produit</a>` : ''}
      <button class="b b-share" type="button" data-action="share" data-id="${g.id}">${I.share}Partager</button>
    </div>
    ${actions ? `<hr class="rule">${actions}` : ''}
    ${cancelBlock(g)}
  </article>`;
}

function closedCard(g, i) {
  const m = me();
  let label;
  if (g.status === 'full') {
    label = `Offert par ${esc(joinFr(namesFor(g)))}`;
  } else if (g.mine) {
    label = g.mine.anonymous ? `Réservé par toi · les autres voient ${q('un lutin anonyme')}` : 'Réservé par toi';
  } else {
    label = g.taken_anonymous ? 'Réservé par un lutin anonyme' : `Réservé par ${esc(g.taken_by || 'quelqu’un')}`;
  }
  return `<article class="tag compact">
    <span class="hole" aria-hidden="true"></span>
    <div class="seal${state.justDone === g.id ? ' stamp-in' : ''}" aria-hidden="true">${g.status === 'full' ? 'Complet' : 'Réservé'}</div>
    <span class="num">N° ${i}</span>
    <div class="row" style="gap:14px">
      ${photo(g, true)}
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1">
        <h2 class="gname">${esc(g.name)}</h2>
        <span class="sub">${euro(g.price)}${(g.specs || []).length ? ' · ' + esc(g.specs.join(' · ')) : ''}</span>
      </div>
    </div>
    <p class="taken">${label}</p>
    <div class="row-between">
      ${g.url ? `<a class="b-text" href="${esc(g.url)}" target="_blank" rel="noopener">Voir le produit</a>` : '<span></span>'}
      ${state.confirmCancel === g.id ? '' : cancelBlock(g)}
    </div>
    ${state.confirmCancel === g.id ? cancelBlock(g) : ''}
  </article>`;
}

function renderGrid() {
  const grid = $('#grid');
  const st = $('#state');
  if (state.loading) { grid.innerHTML = ''; st.innerHTML = '<p class="state-msg">Chargement de la liste…</p>'; return; }
  if (state.error) {
    grid.innerHTML = '';
    st.innerHTML = '<div class="state-msg"><p>Impossible de charger la liste. Vérifie ta connexion et réessaie.</p><button class="pill-btn" type="button" data-action="retry">Réessayer</button></div>';
    return;
  }
  const all = gifts();
  if (!all.length) { grid.innerHTML = ''; st.innerHTML = '<p class="state-msg">La liste arrive bientôt…</p>'; return; }
  const delays = [-1, -4, -2.5, -5.5, -3, -6.5];
  const groups = groupByCategory(all);
  const withHeads = groups.length > 1 || (groups.length === 1 && groups[0].name !== null);
  let n = 0;
  grid.innerHTML = groups.map((grp) => {
    const cards = grp.items.map((g) => {
      n += 1;
      if (!visible(g)) return '';
      const card = isOpen(g) ? openCard(g, n) : closedCard(g, n);
      return `<div class="hang" id="cadeau-${g.id}" style="animation-delay:${delays[n % delays.length]}s"><span class="pin" aria-hidden="true"></span><span class="string" aria-hidden="true"></span>${card}</div>`;
    }).join('');
    if (!cards) return '';
    const count = grp.items.filter(visible).length;
    const head = withHeads ? `<h2 class="cat-head"><span class="cat-name">${esc(grp.name || 'Autres envies')}</span><span class="cat-count">${count}</span></h2>` : '';
    return head + cards;
  }).join('');
  const shown = all.filter(visible).length;
  st.innerHTML = shown ? '' : `<p class="state-msg">${state.filter === 'mine' ? 'Tu n’as encore rien réservé.' : 'Rien ici pour l’instant.'}</p>`;
}

function renderFooterExtra() {
  $('#footer-extra').innerHTML = (!me() && !isOwner())
    ? '<button class="link-light" type="button" data-action="open-recover">Nouvel appareil ? Retrouver mes cadeaux</button>'
    : '';
}

/* ---------- Message flottant ---------- */
let toastTimer = null;
function toast(msg) {
  $('#toast-root').innerHTML = `<div class="toast" role="status">${I.info}<span>${esc(msg)}</span></div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast-root').innerHTML = ''; }, 3800);
}

/* ---------- Fenêtre de réservation ---------- */
function openSheet(giftId, mode) {
  const g = giftById(giftId);
  if (!g || isOwner()) return;
  state.sheet = {
    giftId, mode: g.status === 'free' ? mode : 'part', amount: '', anon: false,
    name: me() ? me().name : '', step: 'form', code: '', error: '', busy: false
  };
  renderSheet();
}

function sheetCalc() {
  const s = state.sheet;
  const g = giftById(s.giftId);
  const remain = g ? remainOf(g) : 0;
  const amt = Number(String(s.amount).replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
  const nameOk = !!me() || s.name.trim().length > 0;
  const amtOk = s.mode === 'full' || (amt >= 1 && amt <= remain);
  let hint = '';
  if (!nameOk) hint = 'Indique ton prénom pour continuer.';
  else if (s.mode === 'part' && amt === 0) hint = 'Choisis un montant.';
  const amtErr = s.mode === 'part' && amt > remain ? `Il ne reste que ${euro(remain)} à réunir : ta participation ne peut pas dépasser ce montant.` : '';
  return { g, remain, amt, ok: nameOk && amtOk && !s.busy, hint, amtErr };
}

function renderSheet() {
  const s = state.sheet;
  const root = $('#sheet-root');
  if (!s) { root.innerHTML = ''; document.body.classList.remove('locked'); return; }
  const g = giftById(s.giftId);
  if (!g) { closeSheet(); return; }
  document.body.classList.add('locked');
  const c = sheetCalc();
  const m = me();
  const head = `<div class="grabber" aria-hidden="true"></div>
    <div class="sheet-head">
      <div style="display:flex;flex-direction:column;gap:6px"><span class="k">${s.mode === 'part' ? 'Participer' : 'Réserver'}</span><h2 id="sheet-title">${esc(g.name)}</h2><span class="sub">${euro(g.price)}${(g.specs || []).length ? ' · ' + esc(g.specs.join(' · ')) : ''}</span></div>
      <button class="close" type="button" data-action="close-sheet" aria-label="Fermer">${I.close}</button>
    </div><hr class="rule">`;

  if (s.step === 'name_taken') {
    root.innerHTML = `<div class="veil" data-action="close-sheet"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${head}
      <p style="margin:0;font-size:16px">Le prénom ${q(esc(s.name.trim()))} est déjà utilisé sur la liste.</p>
      <div class="field"><label class="k" for="taken-code">C’est toi ? Entre ton code perso</label>
        <input id="taken-code" class="line-in" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" placeholder="····" style="letter-spacing:.3em" value="${esc(s.code)}" data-input="code"></div>
      ${s.error ? `<p class="err">${esc(s.error)}</p>` : ''}
      <button class="b b-main b-wide b-big" type="button" data-action="taken-me" ${s.busy ? 'disabled' : ''}>C’est moi, continuer</button>
      <button class="b b-line b-wide" type="button" data-action="taken-other">Ce n’est pas moi : changer de prénom</button>
      <p class="sub" style="margin:0">Astuce : si deux personnes portent le même prénom, ajoutez une initiale (ex. Marie L.).</p>
    </section>`;
    focusFirst('#taken-code');
    return;
  }

  const modeChoice = (g.status === 'free' && g.allow_group) ? `<fieldset><legend class="k">Comment veux-tu l’offrir ?</legend>
      <button class="opt" type="button" data-action="mode" data-mode="full" aria-pressed="${s.mode === 'full'}"><span><span class="t">Je l’offre en entier</span><span class="s">Le cadeau est à toi</span></span>${I.tick}</button>
      <button class="opt" type="button" data-action="mode" data-mode="part" aria-pressed="${s.mode === 'part'}"><span><span class="t">Je participe à plusieurs</span><span class="s">Tu choisis ton montant</span></span>${I.tick}</button>
    </fieldset>` : '';

  const who = m
    ? `<div class="me-line"><span>Tu ${s.mode === 'part' ? 'participes' : 'réserves'} en tant que <strong>${esc(m.name)}</strong></span><button class="b-text" type="button" data-action="forget-me">Ce n’est pas moi</button></div>`
    : `<div class="field"><label class="k" for="sheet-name">Ton prénom</label><input id="sheet-name" class="line-in" type="text" maxlength="40" autocomplete="given-name" placeholder="Ex. Tata Sophie" value="${esc(s.name)}" data-input="name"></div>`;

  const anon = s.mode === 'full' ? `<div class="switch-row"><div style="display:flex;flex-direction:column;gap:2px"><span class="t">Signer en lutin anonyme</span><span class="s">Les autres verront ${q('un lutin anonyme')}. Ton prénom sert seulement à te reconnaître.</span></div>
      <button class="switch" type="button" data-action="toggle-anon" aria-pressed="${s.anon}" aria-label="Signer en lutin anonyme"><span class="knob"></span></button></div>` : '';

  let part = '';
  if (s.mode === 'part') {
    const vals = [20, 50].filter((v) => v < c.remain);
    const chip = (v, label) => `<button class="amt" type="button" data-action="amount" data-v="${v}" aria-pressed="${c.amt === v}">${label}</button>`;
    const names = g.participants || [];
    part = `<div class="info">${I.people}<span>Ton prénom sera visible des autres participants, pour que vous puissiez vous organiser. Théo, lui, ne verra rien.</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <span class="k">Ta participation</span>
        <span class="sub">${Number(g.raised) > 0 ? `Déjà ${euro(g.raised)} réunis avec ${esc(joinFr(names))} · il reste ${euro(c.remain)}` : `Prix : ${euro(g.price)} · personne n’a encore participé`}</span>
        <div class="chips" id="amt-chips">${vals.map((v) => chip(v, euro(v))).join('')}${c.remain > 0 ? chip(c.remain, 'Tout le reste · ' + euro(c.remain)) : ''}</div>
        <label class="sub" for="sheet-amount">Ou un autre montant, en euros</label>
        <input id="sheet-amount" class="line-in" type="text" inputmode="decimal" placeholder="Montant en €" value="${esc(s.amount)}" data-input="amount">
        <p class="err" id="amt-err"${c.amtErr ? '' : ' hidden'}>${esc(c.amtErr)}</p>
      </div>`;
  }

  root.innerHTML = `<div class="veil" data-action="close-sheet"></div>
  <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${head}
    ${modeChoice}${who}${anon}${part}
    <div class="info">${I.key}<span>${m ? 'Cet appareil te reconnaît : tu pourras annuler d’ici, ou d’un autre appareil avec ton code perso.' : 'Après confirmation, tu reçois ton code perso à 4 chiffres : il te retrouve sur n’importe quel appareil.'}</span></div>
    ${s.error ? `<p class="err" style="text-align:center">${esc(s.error)}</p>` : ''}
    <p class="err" id="sheet-hint" style="text-align:center"${c.hint && !c.amtErr ? '' : ' hidden'}>${esc(c.hint)}</p>
    <button class="b b-main b-wide b-big" id="sheet-submit" type="button" data-action="submit-sheet" ${c.ok ? '' : 'disabled'}>${s.busy ? 'Un instant…' : (s.mode === 'part' ? 'Valider ma participation' : 'Réserver ce cadeau')}</button>
  </section>`;
  if (!m) focusFirst('#sheet-name'); else focusFirst('.sheet .close');
}

function updateSheetLive() {
  const c = sheetCalc();
  const btn = $('#sheet-submit');
  if (btn) btn.disabled = !c.ok;
  const hint = $('#sheet-hint');
  if (hint) { hint.textContent = c.hint; hint.hidden = !(c.hint && !c.amtErr); }
  const err = $('#amt-err');
  if (err) { err.textContent = c.amtErr; err.hidden = !c.amtErr; }
  document.querySelectorAll('#amt-chips .amt').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === c.amt)));
}

function focusFirst(sel) {
  // Sur ordinateur seulement : sur téléphone, cela ouvrirait le clavier d'office.
  if (!window.matchMedia('(pointer: fine)').matches) return;
  requestAnimationFrame(() => { const el = $(sel); if (el) el.focus(); });
}

function closeSheet() {
  state.sheet = null;
  state.recover = null;
  $('#sheet-root').innerHTML = '';
  document.body.classList.remove('locked');
}

const ERRORS = {
  ALREADY_TAKEN: 'Oups, quelqu’un vient de réserver ce cadeau. La liste a été mise à jour.',
  HAS_PARTS: 'Des participations viennent d’arriver : ce cadeau ne peut plus être offert en entier, mais tu peux participer.',
  ALREADY_FULL: 'La somme vient d’être réunie : ce cadeau est complet.',
  OVER_REMAIN: 'Le montant restant a changé entre-temps. Vérifie ta participation.',
  BAD_AMOUNT: 'Choisis un montant d’au moins 1 €.',
  NAME_REQUIRED: 'Indique ton prénom pour continuer.',
  NO_GIFT: 'Ce cadeau n’est plus sur la liste.',
  NO_GROUP: 'Ce cadeau ne peut pas être offert à plusieurs.',
  OWNER: 'Mode Théo : impossible de réserver tes propres cadeaux.',
  NOT_RECOGNIZED: 'Cet appareil ne te reconnaît plus. Retrouve tes cadeaux avec ton prénom et ton code perso.'
};
const errCode = (error) => ((error && error.message) || '').match(/[A-Z_]{4,}/)?.[0] || '';

async function submitSheet() {
  const s = state.sheet;
  const c = sheetCalc();
  if (!c.ok) return;
  s.busy = true; s.error = '';
  renderSheet();
  const { data, error } = await sb.rpc('reserve', {
    p_gift: s.giftId,
    p_kind: s.mode,
    p_amount: s.mode === 'part' ? c.amt : null,
    p_name: me() ? me().name : s.name.trim(),
    p_anonymous: s.mode === 'full' && s.anon,
    p_token: state.token || null
  });
  s.busy = false;
  if (error) {
    const code = errCode(error);
    if (code === 'NAME_TAKEN') { s.step = 'name_taken'; s.error = ''; renderSheet(); return; }
    s.error = ERRORS[code] || 'Quelque chose n’a pas marché. Réessaie dans un instant.';
    await load();
    if (state.sheet) renderSheet();
    return;
  }
  if (data.token) { state.token = data.token; LS.set('ldn_token', data.token); }
  const g = c.g;
  state.done = { gift: g, kind: s.mode, amount: data.amount, completed: !!data.completed, anon: s.mode === 'full' && s.anon, name: data.name, code: data.code || null };
  state.justDone = g.id;
  closeSheet();
  renderDone();
  load();
}

async function takenMe() {
  const s = state.sheet;
  const code = s.code.replace(/[^0-9]/g, '');
  if (code.length !== 4) { s.error = 'Ton code perso fait 4 chiffres.'; renderSheet(); return; }
  s.busy = true; renderSheet();
  const { data, error } = await sb.rpc('recover', { p_name: s.name.trim(), p_code: code });
  s.busy = false;
  if (error || !data || !data.ok) {
    s.error = data && data.error === 'TOO_MANY' ? 'Trop d’essais. Attends un quart d’heure avant de réessayer.' : 'Ce code ne correspond pas à ce prénom.';
    renderSheet();
    return;
  }
  state.token = data.token; LS.set('ldn_token', data.token);
  await load();
  s.step = 'form';
  s.error = '';
  renderSheet();
  if (sheetCalc().ok) submitSheet();
}

/* ---------- Retrouver mes cadeaux ---------- */
function renderRecover() {
  const r = state.recover;
  if (!r) return;
  document.body.classList.add('locked');
  $('#sheet-root').innerHTML = `<div class="veil" data-action="close-sheet"></div>
  <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="recover-title">
    <div class="grabber" aria-hidden="true"></div>
    <div class="sheet-head">
      <div style="display:flex;flex-direction:column;gap:6px"><span class="k">Nouvel appareil</span><h2 id="recover-title">Retrouver mes cadeaux</h2><span class="sub">Ton prénom et ton code perso, celui donné à ta première réservation.</span></div>
      <button class="close" type="button" data-action="close-sheet" aria-label="Fermer">${I.close}</button>
    </div><hr class="rule">
    <div class="field"><label class="k" for="r-name">Ton prénom</label><input id="r-name" class="line-in" type="text" maxlength="40" autocomplete="given-name" placeholder="Ex. Tata Sophie" value="${esc(r.name)}" data-input="r-name"></div>
    <div class="field"><label class="k" for="r-code">Ton code perso (4 chiffres)</label><input id="r-code" class="line-in" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" placeholder="····" style="letter-spacing:.3em" value="${esc(r.code)}" data-input="r-code"></div>
    ${r.error ? `<p class="err">${esc(r.error)}</p>` : ''}
    <button class="b b-main b-wide b-big" type="button" data-action="submit-recover" ${r.busy ? 'disabled' : ''}>${r.busy ? 'Un instant…' : 'Retrouver mes cadeaux'}</button>
  </section>`;
  focusFirst('#r-name');
}

async function submitRecover() {
  const r = state.recover;
  const code = r.code.replace(/[^0-9]/g, '');
  if (!r.name.trim() || code.length !== 4) { r.error = 'Indique ton prénom et ton code à 4 chiffres.'; renderRecover(); return; }
  r.busy = true; renderRecover();
  const { data, error } = await sb.rpc('recover', { p_name: r.name.trim(), p_code: code });
  r.busy = false;
  if (error || !data || !data.ok) {
    r.error = data && data.error === 'TOO_MANY' ? 'Trop d’essais. Attends un quart d’heure avant de réessayer.' : 'Prénom ou code incorrect. Vérifie ta capture d’écran.';
    renderRecover();
    return;
  }
  state.token = data.token; LS.set('ldn_token', data.token);
  closeSheet();
  await load();
  const mine = gifts().filter((g) => g.mine).length;
  if (mine) state.filter = 'mine';
  render();
  toast(`Re-bonjour ${data.name} ! ${mine ? 'Tes cadeaux sont bien là.' : 'Tu n’as encore rien réservé.'}`);
}

/* ---------- Écran de confirmation ---------- */
function renderDone() {
  const d = state.done;
  const root = $('#done-root');
  if (!d) { root.innerHTML = ''; document.body.classList.remove('locked'); return; }
  document.body.classList.add('locked');
  const g = d.gift;
  let title = 'C’est réservé !';
  let seal = 'Réservé';
  let msg = `Merci ${esc(d.name)} ! Les autres verront ${q('réservé par ' + (d.anon ? 'un lutin anonyme' : esc(d.name)))}. Théo, lui, ne verra rien.`;
  if (d.kind === 'part') {
    title = d.completed ? 'Cadeau complet !' : 'Participation notée !';
    seal = d.completed ? 'Complet' : 'Merci';
    msg = `Merci ${esc(d.name)}, tu participes à hauteur de ${euro(d.amount)}.${d.completed ? ` Avec toi, la somme est réunie : le cadeau passe en ${q('complet')}.` : ''} Les autres participants voient ton prénom pour vous organiser. Théo, lui, ne verra rien.`;
  }
  const code = d.code
    ? `<div class="code-box rise" style="animation-delay:1.2s"><span class="kg" style="font-size:12px">Ton code perso</span><span class="code">${esc(d.code)}</span><span class="s">Un seul code pour tous tes cadeaux. Il te retrouve sur un autre appareil et permet d’annuler. Fais une capture d’écran.</span></div>`
    : '<div class="code-box rise" style="animation-delay:1.2s"><span class="s">Ton code perso reste le même que la première fois. Garde-le précieusement.</span></div>';
  const link = g.url ? `<a class="b ${d.kind === 'part' ? 'b-ghost' : 'b-cream b-big'} b-wide" href="${esc(g.url)}" target="_blank" rel="noopener">${I.ext}${d.kind === 'part' ? 'Voir le produit exact' : 'Voir le produit pour l’acheter'}</a>` : '';
  const back = `<button class="b ${d.kind === 'part' || !g.url ? 'b-cream b-big' : 'b-ghost'} b-wide" type="button" data-action="close-done">Retour à la liste</button>`;
  root.innerHTML = `<div class="done" role="dialog" aria-modal="true" aria-labelledby="done-title">
    <div class="scene" data-scene="done"></div>
    <div class="done-inner">
      <div class="hang"><span class="pin" aria-hidden="true"></span><span class="string" aria-hidden="true"></span>
        <div class="thud"><article class="tag"><span class="hole" aria-hidden="true"></span>
          <div class="seal seal-big stamp" aria-hidden="true">${seal}</div>
          <div class="sparks" aria-hidden="true"><span class="spark sp1"></span><span class="spark sp2"></span><span class="spark sp3"></span><span class="spark sp4"></span><span class="spark sp5"></span><span class="spark sp6"></span><span class="spark sp7"></span></div>
          <span class="num">Pour Théo</span><h2 class="gname" style="font-size:22px;max-width:190px">${esc(g.name)}</h2><span class="gprice" style="font-size:18px">${euro(g.price)}</span>
        </article></div>
      </div>
      <div class="rise" style="animation-delay:1s;display:flex;flex-direction:column;gap:8px;align-items:center"><h1 id="done-title">${title}</h1><p>${msg}</p></div>
      ${code}
      <div class="done-actions rise" style="animation-delay:1.4s">${d.kind === 'part' ? back + link : link + back}</div>
    </div>
  </div>`;
  buildScene(root.querySelector('[data-scene="done"]'), { stars: 6, flakes: 8, frontColor: '#13271F', seed: 9 });
}

function closeDone() {
  state.done = null;
  renderDone();
  render();
  setTimeout(() => { state.justDone = null; }, 1500);
}

/* ---------- Partage ---------- */
async function share(g) {
  const url = giftLink(g);
  const text = `Regarde ce cadeau sur la liste de Noël de Théo : ${g.name}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: g.name, text, url });
      toast('Pense à ne pas l’envoyer à Théo !');
    } catch (e) { /* partage annulé */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(`Lien copié vers ${q(g.name)} : colle-le dans WhatsApp ou un e-mail. Pas à Théo !`);
  } catch (e) {
    window.prompt('Copie ce lien :', url);
  }
}

/* ---------- Ouverture ---------- */
let introTimer = null;
function showIntro() {
  const el = $('#intro');
  el.classList.remove('is-open');
  el.classList.add('show');
  document.body.classList.add('locked');
}
function hideIntro() {
  const el = $('#intro');
  el.classList.remove('show', 'is-open');
  document.body.classList.remove('locked');
  LS.set('ldn_intro_seen', '1');
  jumpToHash();
}
function openSeal() {
  const el = $('#intro');
  if (el.classList.contains('is-open')) return;
  el.classList.add('is-open');
  clearTimeout(introTimer);
  introTimer = setTimeout(hideIntro, reduceMotion ? 60 : 2350);
}

function jumpToHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id.startsWith('cadeau-')) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 2400);
}

/* ---------- Événements ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action;
  const id = t.dataset.id;
  switch (a) {
    case 'open-seal': openSeal(); break;
    case 'skip-intro': hideIntro(); break;
    case 'replay-intro': window.scrollTo(0, 0); showIntro(); break;
    case 'filter': state.filter = t.dataset.filter; state.confirmCancel = null; render(); break;
    case 'retry': state.loading = true; render(); load(); break;
    case 'reserve': openSheet(id, 'full'); break;
    case 'participate': openSheet(id, 'part'); break;
    case 'share': { const g = giftById(id); if (g) share(g); break; }
    case 'cancel-ask': state.confirmCancel = id; render(); break;
    case 'cancel-no': state.confirmCancel = null; render(); break;
    case 'cancel-yes': cancel(id); break;
    case 'forget-me':
      state.token = null; LS.del('ldn_token'); state.filter = 'all';
      if (state.sheet) { state.sheet.name = ''; }
      load().then(() => { if (state.sheet) renderSheet(); });
      toast('C’est noté : cet appareil ne te reconnaît plus.');
      break;
    case 'open-recover': state.recover = { name: '', code: '', error: '', busy: false }; renderRecover(); break;
    case 'submit-recover': submitRecover(); break;
    case 'close-sheet': closeSheet(); break;
    case 'mode': state.sheet.mode = t.dataset.mode; state.sheet.error = ''; renderSheet(); break;
    case 'toggle-anon': state.sheet.anon = !state.sheet.anon; t.setAttribute('aria-pressed', String(state.sheet.anon)); break;
    case 'amount': {
      state.sheet.amount = t.dataset.v;
      const inp = $('#sheet-amount'); if (inp) inp.value = t.dataset.v;
      updateSheetLive();
      break;
    }
    case 'submit-sheet': submitSheet(); break;
    case 'taken-me': takenMe(); break;
    case 'taken-other': state.sheet.step = 'form'; state.sheet.name = ''; state.sheet.code = ''; state.sheet.error = ''; renderSheet(); break;
    case 'close-done': closeDone(); break;
    default: break;
  }
});

document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.input;
  if (!k) return;
  if (state.sheet) {
    if (k === 'name') state.sheet.name = e.target.value;
    if (k === 'amount') state.sheet.amount = e.target.value;
    if (k === 'code') state.sheet.code = e.target.value;
    updateSheetLive();
  }
  if (state.recover) {
    if (k === 'r-name') state.recover.name = e.target.value;
    if (k === 'r-code') state.recover.code = e.target.value;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.done) closeDone();
    else if (state.sheet || state.recover) closeSheet();
    else if ($('#intro').classList.contains('show')) hideIntro();
  }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('.line-in')) {
    if (state.recover) submitRecover();
    else if (state.sheet && state.sheet.step === 'name_taken') takenMe();
    else if (state.sheet) submitSheet();
  }
});

async function cancel(id) {
  const { error } = await sb.rpc('cancel_reservation', { p_gift: id, p_token: state.token || null });
  state.confirmCancel = null;
  if (error) {
    toast(ERRORS[errCode(error)] || 'L’annulation n’a pas marché. Réessaie dans un instant.');
  } else {
    const g = giftById(id);
    toast(`C’est annulé : ${q(g ? g.name : 'le cadeau')} est de nouveau disponible pour les autres.`);
  }
  load();
}

document.addEventListener('visibilitychange', () => { if (!document.hidden && !state.sheet) load(); });
window.addEventListener('hashchange', jumpToHash);

/* ---------- Démarrage ---------- */
buildScene(document.querySelector('[data-scene="intro"]'), { stars: 10, flakes: 12, frontColor: '#0B1612', seed: 5 });
buildScene(document.querySelector('[data-scene="hero"]'), { stars: 8, flakes: 10, seed: 3 });
renderCountdown();
render();
initDecor();
if (!LS.get('ldn_intro_seen')) showIntro();
load().then(() => { if (!$('#intro').classList.contains('show')) jumpToHash(); });
