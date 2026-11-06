// Décor qui vit au défilement.
// - Grand écran (de la place sur les côtés) : un sapin à gauche qui s'illumine au fil de la liste,
//   l'étoile s'allume en bas ; des boules suspendues à droite qui remontent doucement (parallaxe).
// - Téléphone et tablette en portrait : une guirlande en haut de l'écran qui s'allume au fil de la liste.
// - Partout : neige continue derrière les cadeaux (coupée sur les appareils modestes)
//   et cadeaux qui apparaissent en douceur.
// Une seule écoute du défilement, regroupée par image (requestAnimationFrame) ;
// on ne touche qu'aux classes et aux transform, rien qui force la mise en page.

const SIDE_MIN = 150; // largeur de marge minimale (px) pour afficher le décor latéral
const COLORS = [
  { core: '#F3D38B', glow: '243,211,139' }, // or
  { core: '#E0566A', glow: '224,86,106' }, // rouge cire
  { core: '#FFF2D6', glow: '255,242,214' } // crème
];

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const weakDevice = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const r1 = (v) => Math.round(v * 10) / 10;

function glowDefs(prefix) {
  return COLORS.map((c, i) => `<radialGradient id="${prefix}${i}"><stop offset="0" stop-color="rgb(${c.glow})" stop-opacity=".95"/><stop offset=".35" stop-color="rgb(${c.glow})" stop-opacity=".45"/><stop offset="1" stop-color="rgb(${c.glow})" stop-opacity="0"/></radialGradient>`).join('');
}

function bulb(x, y, ci, prefix, size = 1) {
  const c = COLORS[ci % COLORS.length];
  return `<g class="bulb" style="--on:${c.core};--tw:${(2.4 + (ci * 0.7) % 1.6).toFixed(1)}s"><circle class="glow" cx="${r1(x)}" cy="${r1(y)}" r="${r1(11 * size)}" fill="url(#${prefix}${ci % COLORS.length})"/><circle class="core" cx="${r1(x)}" cy="${r1(y)}" r="${r1(3.4 * size)}"/></g>`;
}

const quad = (p0, c, p1, t) => [
  (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
  (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]
];

/* ---------- Le sapin (côté gauche) ---------- */
function treeSVG() {
  const cx = 120;
  const tiers = [];
  for (let j = 0; j < 6; j++) {
    const top = 58 + j * 74;
    tiers.push({ top, bottom: top + 126, hw: 34 + j * 16.5 });
  }
  let body = '';
  for (let j = tiers.length - 1; j >= 0; j--) {
    const { top, bottom, hw } = tiers[j];
    body += `<path d="M${cx} ${top} L${r1(cx + hw)} ${bottom} Q${cx} ${bottom + 16} ${r1(cx - hw)} ${bottom} Z" fill="url(#tr-fill)"/>`;
    body += `<path d="M${r1(cx - hw * 0.94)} ${bottom - 1} Q${cx} ${bottom + 14} ${r1(cx + hw * 0.94)} ${bottom - 1}" fill="none" stroke="#E8E2D3" stroke-opacity=".42" stroke-width="3" stroke-linecap="round"/>`;
  }
  // Guirlandes : une par étage, du bas vers le haut, en serpentin.
  let strings = '';
  let bulbs = '';
  let ci = 0;
  for (let j = tiers.length - 1; j >= 0; j--) {
    const { top, hw } = tiers[j];
    const y0 = top + 94;
    const left = [cx - hw * 0.72, y0];
    const right = [cx + hw * 0.72, y0];
    const ctrl = [cx, y0 + 26];
    strings += `<path d="M${r1(left[0])} ${y0} Q${cx} ${y0 + 26} ${r1(right[0])} ${y0}" fill="none" stroke="#D2B072" stroke-opacity=".38" stroke-width="1"/>`;
    const k = Math.max(3, Math.round(hw / 13));
    const ltr = (tiers.length - 1 - j) % 2 === 0;
    for (let i = 0; i < k; i++) {
      const t = (i + 0.5) / k;
      const [x, y] = quad(ltr ? left : right, ctrl, ltr ? right : left, t);
      bulbs += bulb(x, y, ci++, 'tg');
    }
  }
  const star = 'M120 14 L125.6 29.3 L141.9 29.8 L129.1 39.8 L133.6 55.5 L120 46.4 L106.4 55.5 L110.9 39.8 L98.1 29.8 L114.4 29.3 Z';
  return `<svg class="tree" viewBox="0 0 240 610" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="tr-fill" x1="0" x2="1"><stop offset="0" stop-color="#1F3D32"/><stop offset=".55" stop-color="#173027"/><stop offset="1" stop-color="#0F221B"/></linearGradient>
      ${glowDefs('tg')}
      <radialGradient id="star-glow"><stop offset="0" stop-color="#F6DFA4" stop-opacity=".9"/><stop offset=".4" stop-color="#F3D38B" stop-opacity=".35"/><stop offset="1" stop-color="#F3D38B" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="109" y="548" width="22" height="34" rx="3" fill="#3B2A1E"/>
    ${body}
    ${strings}
    <g class="bulbs">${bulbs}</g>
    <circle class="star-glow" cx="120" cy="36" r="44" fill="url(#star-glow)"/>
    <path class="star-shape" d="${star}"/>
    <ellipse cx="120" cy="590" rx="118" ry="16" fill="#E8E6DF" fill-opacity=".88"/>
    <ellipse cx="96" cy="584" rx="60" ry="9" fill="#F4F1EA" fill-opacity=".6"/>
  </svg>`;
}

/* ---------- Les boules (côté droit) ---------- */
const BAUBLES = [
  { x: 18, f: 0.16, s: 42, c: ['#5E1420', '#8C2635', '#C0394B'], g: '192,57,75', depth: 0.55, dur: 6.5 },
  { x: 42, f: 0.38, s: 30, c: ['#6E5320', '#B48C45', '#E6CB93'], g: '230,203,147', depth: 0.9, dur: 5.2 },
  { x: 66, f: 0.24, s: 52, c: ['#0E2219', '#1F3A2E', '#3C6B57'], g: '60,107,87', depth: 0.35, dur: 7.4 },
  { x: 86, f: 0.5, s: 36, c: ['#A99C84', '#E8DFCF', '#FFFFFF'], g: '255,242,214', depth: 0.75, dur: 6 },
  { x: 30, f: 0.62, s: 26, c: ['#6E5320', '#B48C45', '#E6CB93'], g: '230,203,147', depth: 1, dur: 4.8 },
  { x: 74, f: 0.08, s: 34, c: ['#5E1420', '#8C2635', '#C0394B'], g: '192,57,75', depth: 0.45, dur: 5.8 }
];

function baublesHTML() {
  return BAUBLES.map((b, i) => `<div class="bauble" style="--x:${b.x}%;--f:${b.f};--s:${b.s}px;--c0:${b.c[0]};--c1:${b.c[1]};--c2:${b.c[2]};--g:${b.g};--dur:${b.dur}s;--d:-${(i * 1.3).toFixed(1)}s">
    <div class="bauble-swing"><span class="bauble-string"></span><span class="bauble-cap"></span><span class="bauble-ball"></span></div>
  </div>`).join('');
}

/* ---------- La guirlande du haut (téléphone, tablette en portrait) ---------- */
function garlandSVG(width) {
  const W = Math.max(280, Math.round(width));
  const swags = Math.max(3, Math.round(W / 140));
  const step = W / swags;
  let paths = '';
  let bulbs = '';
  let ci = 0;
  for (let i = 0; i < swags; i++) {
    const p0 = [i * step, 5];
    const p1 = [(i + 1) * step, 5];
    const c = [(i + 0.5) * step, 34];
    paths += `<path d="M${r1(p0[0])} 5 Q${r1(c[0])} 34 ${r1(p1[0])} 5" fill="none" stroke="#D2B072" stroke-opacity=".55" stroke-width="1"/>`;
    const k = 5;
    for (let j = 0; j < k; j++) {
      const [x, y] = quad(p0, c, p1, (j + 0.5) / k);
      bulbs += bulb(x, y + 2.5, ci++, 'gt', 1);
    }
  }
  return `<svg viewBox="0 0 ${W} 36" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>${glowDefs('gt')}</defs>${paths}<g class="bulbs">${bulbs}</g></svg>`;
}

/* ---------- Apparition douce des cadeaux ---------- */
function initReveal(grid) {
  if (reduceMotion || !('IntersectionObserver' in window) || !grid) return;
  document.documentElement.classList.add('js-reveal');
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    let k = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      el.style.setProperty('--rd', `${Math.min(k++, 4) * 90}ms`);
      el.classList.add('shown');
      seen.add(el.id);
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

  const scan = () => {
    io.disconnect();
    grid.querySelectorAll('.hang').forEach((el) => {
      // Déjà vu avant un rafraîchissement de la liste : on l'affiche tout de suite, sans rejouer l'effet.
      if (seen.has(el.id)) el.classList.add('shown', 'shown-now');
      else io.observe(el);
    });
  };
  new MutationObserver(scan).observe(grid, { childList: true });
  scan();
}

/* ---------- Mise en place ---------- */
export function initDecor() {
  const grid = document.getElementById('grid');
  const hero = document.querySelector('.hero');
  initReveal(grid);

  const decor = document.createElement('div');
  decor.className = 'decor';
  decor.setAttribute('aria-hidden', 'true');
  decor.innerHTML = '<div class="decor-snow"></div><div class="decor-side decor-left"><div class="tree-wrap"></div></div><div class="decor-side decor-right"></div>';
  document.body.prepend(decor);

  const top = document.createElement('div');
  top.className = 'decor-top';
  top.setAttribute('aria-hidden', 'true');
  document.body.appendChild(top);

  const snow = decor.querySelector('.decor-snow');
  const treeWrap = decor.querySelector('.tree-wrap');
  const right = decor.querySelector('.decor-right');

  let mode = '';
  let treeBulbs = [];
  let topBulbs = [];
  let baubles = [];
  let treeEl = null;
  let litTree = -1;
  let litTop = -1;
  let starOn = null;
  let topIn = null;
  let gridTop = 0;
  let gridH = 1;
  let heroH = 0;
  let vh = window.innerHeight;
  let garlandW = 0;

  function buildSnow(count) {
    if (reduceMotion || weakDevice) { snow.innerHTML = ''; return; }
    let html = '';
    for (let i = 0; i < count; i++) {
      const near = mode === 'sides' && i % 4 === 0;
      const x = ((i * 37.7) % 100).toFixed(1);
      const dur = near ? 9 + (i % 5) : 15 + (i % 7);
      html += `<span class="fk ${near ? 'fk-near' : 'fk-far'}" style="left:${x}%;animation-duration:${dur}s;animation-delay:-${((i * 2.9) % dur).toFixed(1)}s"></span>`;
    }
    snow.innerHTML = html;
  }

  function measure() {
    vh = window.innerHeight;
    const gr = grid.getBoundingClientRect();
    gridTop = gr.top + window.scrollY;
    gridH = Math.max(1, gr.height);
    heroH = hero ? hero.offsetHeight : 0;
    const gutter = (document.documentElement.clientWidth - gr.width) / 2;
    const next = gutter >= SIDE_MIN ? 'sides' : 'top';
    if (next === 'sides') decor.style.setProperty('--gw', `${Math.min(Math.round(gutter - 12), 380)}px`);
    if (next !== mode) {
      mode = next;
      document.documentElement.classList.toggle('deco-sides', mode === 'sides');
      document.documentElement.classList.toggle('deco-top', mode === 'top');
      if (mode === 'sides' && !treeEl) {
        treeWrap.innerHTML = treeSVG();
        treeEl = treeWrap.querySelector('.tree');
        treeBulbs = [...treeEl.querySelectorAll('.bulb')];
        right.innerHTML = baublesHTML();
        baubles = [...right.querySelectorAll('.bauble')].map((el, i) => ({ el, depth: BAUBLES[i].depth }));
        litTree = -1; starOn = null;
      }
      buildSnow(mode === 'sides' ? 18 : 7);
    }
    if (mode === 'top') {
      const w = document.documentElement.clientWidth;
      if (Math.abs(w - garlandW) > 2) {
        garlandW = w;
        top.innerHTML = garlandSVG(w);
        topBulbs = [...top.querySelectorAll('.bulb')];
        litTop = -1;
      }
    }
  }

  function light(list, count, prev) {
    if (count === prev) return prev;
    const lo = Math.min(count, prev < 0 ? 0 : prev);
    const hi = Math.max(count, prev < 0 ? list.length : prev);
    for (let i = lo; i < hi; i++) list[i].classList.toggle('on', i < count);
    return count;
  }

  let ticking = false;
  function update() {
    ticking = false;
    const y = window.scrollY;
    const p = clamp01((y + vh * 0.72 - gridTop) / gridH);
    if (mode === 'sides') {
      litTree = light(treeBulbs, Math.round(p * treeBulbs.length), litTree);
      const on = p >= 0.985;
      if (on !== starOn) { starOn = on; treeEl.classList.toggle('star-on', on); }
      if (!reduceMotion) {
        treeWrap.style.transform = `translate3d(-50%, ${Math.round((1 - p) * 26)}px, 0)`;
        for (const b of baubles) b.el.style.transform = `translate3d(-50%, ${Math.round(-p * 150 * b.depth)}px, 0)`;
      }
    } else if (mode === 'top') {
      litTop = light(topBulbs, Math.round(p * topBulbs.length), litTop);
      const inNow = y > heroH - 60;
      if (inNow !== topIn) { topIn = inNow; top.classList.toggle('in', inNow); }
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { measure(); update(); }, 120); };

  measure();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(document.body);
  else window.addEventListener('load', onResize);
}
