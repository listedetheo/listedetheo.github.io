import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => { const v = Math.round(Number(n) * 100) / 100; return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + ' €'; };
const PRIO = { reve: 'Le rêve', grande: 'Grande envie', envie: 'Envie' };

const state = { session: null, owner: false, gifts: [], categories: [], editing: null, confirmDelete: null, busy: false, sentTo: '', pwOpen: false };
const NEW_CAT = '__new__';

let toastTimer = null;
function toast(msg) {
  $('#toast-root').innerHTML = `<div class="toast" role="status"><span>${esc(msg)}</span></div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast-root').innerHTML = ''; }, 3800);
}

/* ---------- Connexion ---------- */
const LAST_EMAIL = 'ldn_admin_email';
const lastEmail = () => { try { return localStorage.getItem(LAST_EMAIL) || ''; } catch (e) { return ''; } };
const rememberEmail = (v) => { try { localStorage.setItem(LAST_EMAIL, v); } catch (e) { /* stockage indisponible */ } };

function renderLogin(error = '', info = '') {
  $('#who').textContent = '';
  app.innerHTML = `<section class="panel" style="max-width:520px">
    <h2>Connexion</h2>
    <p class="lead">Une fois connecté, cet appareil reste connecté, même si tu fermes la page.</p>
    ${info ? `<p class="okmsg">${esc(info)}</p>` : ''}
    <div class="field"><label class="k" for="email">Ton e-mail</label><input id="email" class="box-in" type="email" autocomplete="username" value="${esc(state.sentTo || lastEmail())}" placeholder="prenom@exemple.fr"></div>
    <div class="field"><label class="k" for="pw">Mot de passe</label><input id="pw" class="box-in" type="password" autocomplete="current-password" placeholder="••••••••"></div>
    ${error ? `<p class="err">${esc(error)}</p>` : ''}
    <div class="btn-row"><button class="b b-main" type="button" data-action="login-pw">Se connecter</button></div>
    <div class="divider"></div>
    <p class="lead">Pas encore de mot de passe, ou oublié ? Reçois un lien de connexion par e-mail. <strong>Chaque lien ne sert qu'une fois</strong> et connecte seulement l'appareil sur lequel tu l'ouvres.</p>
    <div class="btn-row"><button class="b b-line" type="button" data-action="send-link">Recevoir un lien par e-mail</button></div>
  </section>`;
}

function renderSent() {
  app.innerHTML = `<section class="panel" style="max-width:520px">
    <h2>Regarde tes e-mails</h2>
    <p class="lead">Un lien vient d'être envoyé à <strong>${esc(state.sentTo)}</strong>. Ouvre-le <strong>sur l'appareil que tu veux connecter</strong> : il ne sert qu'une fois. Pense à vérifier les courriers indésirables.</p>
    <p class="lead">Une fois connecté, crée ton mot de passe : tu n'auras plus besoin d'e-mail sur tes autres appareils.</p>
    <div class="btn-row"><button class="b b-line" type="button" data-action="back-login">Retour</button></div>
  </section>`;
}

/* Erreurs renvoyées par Supabase dans l'adresse après un clic sur un lien e-mail */
function linkErrorFromUrl() {
  const raw = (location.hash || '').replace(/^#/, '') + '&' + (location.search || '').replace(/^\?/, '');
  const p = new URLSearchParams(raw);
  const code = p.get('error_code') || p.get('error');
  if (!code) return '';
  history.replaceState(null, '', location.pathname);
  if (code === 'otp_expired' || code === 'access_denied') return 'Ce lien a déjà servi ou a expiré : chaque lien ne marche qu’une fois. Connecte-toi avec ton mot de passe, ou demande un nouveau lien.';
  return 'Le lien n’a pas fonctionné (' + code + '). Connecte-toi avec ton mot de passe, ou demande un nouveau lien.';
}

function frAuthError(error) {
  const code = error && (error.code || '');
  const msg = (error && error.message) || '';
  if (code === 'over_email_send_rate_limit' || error.status === 429 || /rate limit/i.test(msg)) {
    return 'Trop de liens demandés : le service d’e-mail gratuit n’en envoie que 2 par heure pour tout le site. Réessaie dans une heure, ou connecte-toi avec ton mot de passe.';
  }
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect. Si tu n’as pas encore créé de mot de passe, demande un lien par e-mail.';
  if (code === 'weak_password' || /password should be/i.test(msg)) return 'Mot de passe trop faible : au moins 8 caractères, mélange lettres et chiffres.';
  if (code === 'same_password') return 'C’est déjà ton mot de passe actuel.';
  if (code === 'reauthentication_needed') return 'Pour des raisons de sécurité, reconnecte-toi avec un lien e-mail puis recommence.';
  return msg || 'Erreur inconnue.';
}

function renderNotOwner() {
  app.innerHTML = `<section class="panel" style="max-width:620px">
    <h2>Presque prêt</h2>
    <p class="lead">Tu es connecté avec <strong>${esc(state.session.user.email)}</strong>, mais ce compte n'est pas encore enregistré comme propriétaire de la liste.</p>
    <p class="lead">Demande à Claude de t'activer comme propriétaire, puis recharge cette page.</p>
    <div class="btn-row"><button class="b b-main" type="button" data-action="reload">Recharger</button><button class="b b-line" type="button" data-action="logout">Se déconnecter</button></div>
  </section>`;
}

/* ---------- Liste ---------- */
async function loadGifts() {
  const [gr, cr] = await Promise.all([
    sb.from('gifts').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
    sb.from('categories').select('*').order('position', { ascending: true }).order('name', { ascending: true })
  ]);
  if (gr.error) { toast('Impossible de charger tes cadeaux.'); return; }
  state.categories = cr.error ? [] : (cr.data || []).map((c) => c.name);
  // Même ordre que sur la liste publique : par catégorie, puis par position
  const rank = (g) => { const i = state.categories.indexOf(g.category); return i < 0 ? state.categories.length : i; };
  state.gifts = (gr.data || []).slice().sort((a, b) => rank(a) - rank(b) || (a.position || 0) - (b.position || 0));
}

const catOf = (g) => (g.category && state.categories.includes(g.category) ? g.category : null);

function renderList() {
  const items = state.gifts.map((g, i) => {
    const prev = state.gifts[i - 1];
    const next = state.gifts[i + 1];
    const head = (i === 0 || catOf(prev) !== catOf(g)) ? `<h3 class="cat-sub">${esc(catOf(g) || 'Sans catégorie')}</h3>` : '';
    const firstInCat = !prev || catOf(prev) !== catOf(g);
    const lastInCat = !next || catOf(next) !== catOf(g);
    const thumb = g.image_url ? `<img class="thumb" src="${esc(g.image_url)}" alt="">` : '<div class="thumb">—</div>';
    const del = state.confirmDelete === g.id
      ? `<div class="warn span-2" style="grid-column:1/-1">Supprimer ${esc(g.name)} ? Si quelqu'un l'a déjà réservé, sa réservation disparaîtra sans qu'il soit prévenu.
          <div class="btn-row" style="margin-top:10px"><button class="b b-main" type="button" data-action="delete-yes" data-id="${g.id}">Oui, supprimer</button><button class="b b-line" type="button" data-action="delete-no">Annuler</button></div></div>`
      : '';
    return `${head}<div class="item">
      ${thumb}
      <div><h3>${esc(g.name)}</h3><div class="meta">${euro(g.price)} · ${esc(PRIO[g.priority] || '')}${(g.specs || []).length ? ' · ' + esc(g.specs.join(' · ')) : ''}${g.url ? '' : ' · <strong>sans lien</strong>'}${g.image_url ? '' : ' · <strong>sans photo</strong>'}</div></div>
      <div class="item-actions">
        <button class="mini" type="button" data-action="up" data-id="${g.id}" aria-label="Monter" ${firstInCat ? 'disabled' : ''}>↑</button>
        <button class="mini" type="button" data-action="down" data-id="${g.id}" aria-label="Descendre" ${lastInCat ? 'disabled' : ''}>↓</button>
        <button class="mini" type="button" data-action="edit" data-id="${g.id}">Modifier</button>
        <button class="mini danger" type="button" data-action="delete-ask" data-id="${g.id}">Supprimer</button>
      </div>
      ${del}
    </div>`;
  }).join('');
  app.innerHTML = `${passwordPanel()}<section class="panel">
      <div class="btn-row" style="justify-content:space-between"><h2>Mes cadeaux (${state.gifts.length})</h2><button class="b b-main" type="button" data-action="new">Ajouter un cadeau</button></div>
      ${state.gifts.length ? `<div class="items">${items}</div>` : '<p class="lead">Aucun cadeau pour l’instant. Commence par en ajouter un.</p>'}
    </section>
    <section class="panel"><p class="lead"><strong>Rappel :</strong> pour chaque lien, vérifie qu'il présélectionne bien la taille et la couleur. Sinon, indique-les dans les détails : ce sont eux qui évitent les erreurs.</p></section>
    ${hasPassword() && !state.pwOpen ? '<div class="btn-row"><button class="link-light" type="button" data-action="pw-open">Changer mon mot de passe</button></div>' : ''}`;
}

/* ---------- Mot de passe ---------- */
const hasPassword = () => !!(state.session && state.session.user && state.session.user.user_metadata && state.session.user.user_metadata.has_password);

function passwordPanel() {
  if (hasPassword() && !state.pwOpen) return '';
  const first = !hasPassword();
  return `<section class="panel pw-panel">
    <h2>${first ? 'Crée ton mot de passe' : 'Changer mon mot de passe'}</h2>
    ${first ? '<p class="lead">Une seule fois. Ensuite, sur ton téléphone comme sur ton ordinateur, tu te connectes avec ton e-mail et ce mot de passe : plus besoin de lien. Chaque appareil reste connecté ensuite.</p>' : ''}
    <input type="email" autocomplete="username" value="${esc(state.session.user.email)}" hidden>
    <div class="form-grid">
      <div class="field"><label class="k" for="pw1">Nouveau mot de passe</label><input id="pw1" class="box-in" type="password" autocomplete="new-password" minlength="8"></div>
      <div class="field"><label class="k" for="pw2">Encore une fois</label><input id="pw2" class="box-in" type="password" autocomplete="new-password" minlength="8"></div>
    </div>
    <span class="help">Au moins 8 caractères. Laisse ton téléphone ou ton navigateur le retenir.</span>
    <p class="err" id="pw-err" hidden></p>
    <div class="btn-row"><button class="b b-main" type="button" data-action="pw-save">Enregistrer le mot de passe</button>${first ? '' : '<button class="b b-line" type="button" data-action="pw-close">Annuler</button>'}</div>
  </section>`;
}

async function savePassword() {
  const a = $('#pw1').value;
  const b = $('#pw2').value;
  const err = $('#pw-err');
  const show = (m) => { err.textContent = m; err.hidden = !m; };
  if (a.length < 8) return show('Au moins 8 caractères.');
  if (a !== b) return show('Les deux mots de passe ne sont pas identiques.');
  const { data, error } = await sb.auth.updateUser({ password: a, data: { has_password: true } });
  if (error) return show(frAuthError(error));
  if (data && data.user) state.session = { ...state.session, user: data.user };
  state.pwOpen = false;
  toast('Mot de passe enregistré. Sur tes autres appareils : e-mail + mot de passe.');
  renderList();
}

/* ---------- Formulaire ---------- */
function blank() {
  return { id: null, name: '', price: '', priority: 'envie', category: '', newCat: '', specs: [], note: '', url: '', merchant: '', image_url: '', allow_group: true };
}

function renderForm() {
  const g = state.editing;
  app.innerHTML = `<section class="panel">
    <h2>${g.id ? 'Modifier le cadeau' : 'Nouveau cadeau'}</h2>
    <div class="form-grid">
      <div class="field span-2"><label class="k" for="f-name">Nom du cadeau *</label><input id="f-name" class="box-in" maxlength="120" value="${esc(g.name)}" placeholder="Ex. Haut de compression HeatGear® Elite"></div>
      <div class="field"><label class="k" for="f-price">Prix (€) *</label><input id="f-price" class="box-in" inputmode="decimal" value="${esc(g.price)}" placeholder="Ex. 49,99"></div>
      <div class="field"><label class="k" for="f-prio">Envie</label><select id="f-prio" class="box-sel">
        <option value="reve" ${g.priority === 'reve' ? 'selected' : ''}>Le rêve (3 étoiles)</option>
        <option value="grande" ${g.priority === 'grande' ? 'selected' : ''}>Grande envie (2 étoiles)</option>
        <option value="envie" ${g.priority === 'envie' ? 'selected' : ''}>Envie</option></select></div>
      <div class="field span-2"><label class="k" for="f-cat">Catégorie</label><select id="f-cat" class="box-sel">
        ${state.categories.map((c) => `<option value="${esc(c)}" ${g.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        <option value="" ${!g.category ? 'selected' : ''}>Sans catégorie</option>
        <option value="${NEW_CAT}" ${g.category === NEW_CAT ? 'selected' : ''}>+ Nouvelle catégorie…</option></select>
        <input id="f-newcat" class="box-in" maxlength="40" value="${esc(g.newCat)}" placeholder="Nom de la nouvelle catégorie" ${g.category === NEW_CAT ? '' : 'hidden'}>
        <span class="help">Sur la liste, les cadeaux sont regroupés par catégorie.</span></div>
      <div class="field span-2"><label class="k" for="f-url">Lien vers le produit exact</label><input id="f-url" class="box-in" type="url" value="${esc(g.url)}" placeholder="https://…">
        <span class="help">Ouvre le lien pour vérifier qu'il tombe sur la bonne taille et la bonne couleur.</span>
        <div class="btn-row"><button class="b b-line" type="button" data-action="test-link">Ouvrir le lien</button></div></div>
      <div class="field"><label class="k" for="f-merchant">Vendeur</label><input id="f-merchant" class="box-in" maxlength="60" value="${esc(g.merchant)}" placeholder="Ex. Under Armour"><span class="help">Affiché sur la photo : « Voir chez … ».</span></div>
      <div class="field"><label class="k" for="f-specs">Détails à respecter</label><input id="f-specs" class="box-in" value="${esc((g.specs || []).join(', '))}" placeholder="Taille M, Couleur : blanc"><span class="help">Sépare-les par des virgules.</span></div>
      <div class="field span-2"><label class="k" for="f-note">Ton mot (écrit à la main sur l'étiquette)</label><textarea id="f-note" class="box-area" maxlength="400" placeholder="Ex. Pas blanc, il se salit trop vite !">${esc(g.note)}</textarea></div>
      <div class="field span-2"><span class="k">Photo</span>
        <div class="img-row">${g.image_url ? `<img class="preview-img" id="f-preview" src="${esc(g.image_url)}" alt="">` : '<div class="preview-img" id="f-preview" style="display:flex;align-items:center;justify-content:center;color:#5A615B">Aucune</div>'}
          <div style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:220px">
            <label class="b b-line" style="cursor:pointer">Choisir une photo<input id="f-file" type="file" accept="image/jpeg,image/png,image/webp" class="visually-hidden"></label>
            <input id="f-img" class="box-in" value="${esc(g.image_url)}" placeholder="…ou colle l'adresse d'une image">
            <span class="help">La photo est réduite automatiquement avant l'envoi.</span>
          </div></div></div>
      <label class="check span-2"><input id="f-group" type="checkbox" ${g.allow_group ? 'checked' : ''}> Autoriser les participations à plusieurs</label>
    </div>
    <p class="err" id="f-err" hidden></p>
    <div class="btn-row"><button class="b b-main" type="button" data-action="save" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Enregistrement…' : 'Enregistrer'}</button><button class="b b-line" type="button" data-action="cancel-edit">Annuler</button></div>
  </section>`;
}

function readForm() {
  const g = state.editing;
  g.name = $('#f-name').value.trim();
  g.price = $('#f-price').value.trim();
  g.priority = $('#f-prio').value;
  g.category = $('#f-cat').value;
  g.newCat = $('#f-newcat').value.trim();
  g.url = $('#f-url').value.trim();
  g.merchant = $('#f-merchant').value.trim();
  g.specs = $('#f-specs').value.split(',').map((s) => s.trim()).filter(Boolean);
  g.note = $('#f-note').value.trim();
  g.image_url = $('#f-img').value.trim();
  g.allow_group = $('#f-group').checked;
  return g;
}

function formError(msg) { const e = $('#f-err'); e.textContent = msg; e.hidden = !msg; }

async function save() {
  const g = readForm();
  const price = Number(String(g.price).replace(',', '.').replace(/[^0-9.]/g, ''));
  if (!g.name) return formError('Donne un nom au cadeau.');
  if (!(price > 0)) return formError('Indique un prix valide, par exemple 49,99.');
  if (g.url && !/^https?:\/\//i.test(g.url)) return formError('Le lien doit commencer par https://');
  let category = g.category || null;
  if (category === NEW_CAT) {
    if (!g.newCat) return formError('Donne un nom à la nouvelle catégorie.');
    const existing = state.categories.find((c) => c.toLowerCase() === g.newCat.toLowerCase());
    category = existing || g.newCat;
    if (!existing) {
      const { error } = await sb.from('categories').insert({ name: category, position: state.categories.length + 1 });
      if (error) return formError('Impossible de créer la catégorie : ' + error.message);
      state.categories.push(category);
    }
  }
  const row = {
    name: g.name, price, priority: g.priority, category, specs: g.specs, note: g.note || null,
    url: g.url || null, merchant: g.merchant || null, image_url: g.image_url || null, allow_group: g.allow_group
  };
  state.busy = true; renderFormKeep();
  let res;
  if (g.id) {
    res = await sb.from('gifts').update(row).eq('id', g.id);
  } else {
    const maxPos = state.gifts.reduce((m, x) => Math.max(m, x.position || 0), 0);
    res = await sb.from('gifts').insert({ ...row, position: maxPos + 1 });
  }
  state.busy = false;
  if (res.error) { renderFormKeep(); formError('Enregistrement impossible : ' + res.error.message); return; }
  toast(g.id ? 'Cadeau modifié.' : 'Cadeau ajouté à la liste.');
  state.editing = null;
  await loadGifts();
  renderList();
}

function renderFormKeep() { readForm(); renderForm(); }

/* ---------- Photo : réduction puis envoi ---------- */
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const max = 1000;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.82));
  if (blob && blob.type === 'image/webp') return { blob, ext: 'webp', type: 'image/webp' };
  const jpg = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  return { blob: jpg, ext: 'jpg', type: 'image/jpeg' };
}

async function upload(file) {
  readForm();
  toast('Envoi de la photo…');
  try {
    const { blob, ext, type } = await shrink(file);
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('gift-images').upload(path, blob, { contentType: type, upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from('gift-images').getPublicUrl(path);
    state.editing.image_url = data.publicUrl;
    renderForm();
    toast('Photo ajoutée.');
  } catch (e) {
    toast('La photo n’a pas pu être envoyée : ' + (e.message || 'erreur inconnue'));
  }
}

/* ---------- Ordre ---------- */
async function move(id, dir) {
  const i = state.gifts.findIndex((g) => g.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.gifts.length) return;
  if (catOf(state.gifts[i]) !== catOf(state.gifts[j])) return; // on ne change pas de catégorie avec les flèches
  const order = state.gifts.slice();
  [order[i], order[j]] = [order[j], order[i]];
  // Renumérote tout dans l'ordre affiché
  const res = await Promise.all(order.map((g, k) => (g.position !== k + 1 ? sb.from('gifts').update({ position: k + 1 }).eq('id', g.id) : null)));
  if (res.some((r) => r && r.error)) toast('Impossible de changer l’ordre.');
  await loadGifts();
  renderList();
}

/* ---------- Événements ---------- */
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const id = t.dataset.id;
  switch (t.dataset.action) {
    case 'send-link': {
      const email = $('#email').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { renderLogin('Adresse e-mail invalide.'); return; }
      state.sentTo = email; rememberEmail(email);
      t.disabled = true;
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false } });
      if (error) { renderLogin(frAuthError(error)); return; }
      renderSent();
      break;
    }
    case 'login-pw': {
      const email = $('#email').value.trim();
      const password = $('#pw').value;
      if (!email || !password) { renderLogin('Entre ton e-mail et ton mot de passe.'); return; }
      state.sentTo = email; rememberEmail(email);
      t.disabled = true;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { renderLogin(frAuthError(error)); return; }
      break; // onAuthStateChange prend le relais
    }
    case 'pw-save': savePassword(); break;
    case 'pw-open': state.pwOpen = true; renderList(); break;
    case 'pw-close': state.pwOpen = false; renderList(); break;
    case 'back-login': renderLogin(); break;
    case 'reload': location.reload(); break;
    case 'logout': await sb.auth.signOut({ scope: 'local' }); location.reload(); break;
    case 'new': state.editing = blank(); renderForm(); break;
    case 'edit': { const g = state.gifts.find((x) => x.id === id); state.editing = { ...blank(), ...g, price: String(g.price).replace('.', ','), note: g.note || '', url: g.url || '', merchant: g.merchant || '', image_url: g.image_url || '', category: catOf(g) || '', newCat: '' }; renderForm(); break; }
    case 'cancel-edit': state.editing = null; renderList(); break;
    case 'save': save(); break;
    case 'test-link': { const u = $('#f-url').value.trim(); if (/^https?:\/\//i.test(u)) window.open(u, '_blank', 'noopener'); else formError('Colle d’abord un lien qui commence par https://'); break; }
    case 'up': move(id, -1); break;
    case 'down': move(id, 1); break;
    case 'delete-ask': state.confirmDelete = id; renderList(); break;
    case 'delete-no': state.confirmDelete = null; renderList(); break;
    case 'delete-yes': {
      const { error } = await sb.from('gifts').delete().eq('id', id);
      state.confirmDelete = null;
      if (error) toast('Suppression impossible.'); else toast('Cadeau supprimé.');
      await loadGifts(); renderList();
      break;
    }
    default: break;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'pw' || e.target.id === 'email') { e.preventDefault(); const b = document.querySelector('[data-action="login-pw"]'); if (b) b.click(); }
  if (e.target.id === 'pw2') { e.preventDefault(); savePassword(); }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'f-file' && e.target.files && e.target.files[0]) upload(e.target.files[0]);
  if (e.target.id === 'f-cat') {
    const nc = $('#f-newcat');
    nc.hidden = e.target.value !== NEW_CAT;
    if (!nc.hidden) nc.focus();
  }
  if (e.target.id === 'f-url') {
    const m = $('#f-merchant');
    if (m && !m.value.trim()) {
      try { m.value = new URL(e.target.value.trim()).hostname.replace(/^www\./, ''); } catch (err) { /* lien incomplet */ }
    }
  }
  if (e.target.id === 'f-img') {
    const p = $('#f-preview');
    const v = e.target.value.trim();
    if (p && v) p.outerHTML = `<img class="preview-img" id="f-preview" src="${esc(v)}" alt="">`;
  }
});

/* ---------- Démarrage ---------- */
const urlError = linkErrorFromUrl();

async function start(session) {
  state.session = session;
  if (!session) { renderLogin(urlError); return; }
  $('#who').innerHTML = `${esc(session.user.email)} · <button class="link-light" type="button" data-action="logout">Se déconnecter de cet appareil</button>`;
  const { data: owner } = await sb.rpc('is_owner');
  state.owner = !!owner;
  if (!state.owner) { renderNotOwner(); return; }
  await loadGifts();
  renderList();
}

/* On ne redémarre l'écran que si la personne connectée change : revenir sur l'onglet
   (après avoir copié un lien chez un vendeur, par exemple) ne doit pas effacer le formulaire. */
let currentUid;
function maybeStart(session) {
  const uid = (session && session.user && session.user.id) || null;
  if (uid === currentUid) { if (session) state.session = session; return; }
  currentUid = uid;
  start(session);
}
sb.auth.onAuthStateChange((event, session) => { maybeStart(session); });
const { data } = await sb.auth.getSession();
maybeStart(data.session);
