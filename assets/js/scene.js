// Scène de nuit : ciel, lune, étoiles, neige et sapins (générés une seule fois).

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function tree(cx, base, h, w) {
  const pts = [
    [0, -h], [0.24 * w, -0.6 * h], [0.1 * w, -0.6 * h], [0.36 * w, -0.3 * h], [0.18 * w, -0.3 * h], [0.5 * w, 0],
    [-0.5 * w, 0], [-0.18 * w, -0.3 * h], [-0.36 * w, -0.3 * h], [-0.1 * w, -0.6 * h], [-0.24 * w, -0.6 * h]
  ];
  return 'M' + pts.map(([x, y]) => `${Math.round(cx + x)} ${Math.round(base + y)}`).join(' L') + 'Z';
}

function layer(width, H, step, hr, wr, band, seed, jitter = 0) {
  const r = rng(seed);
  let d = '';
  for (let x = -10; x < width + 20; x += step) {
    const cx = x + (jitter ? (r() - 0.5) * jitter : 0);
    d += tree(cx, H, hr[0] + r() * (hr[1] - hr[0]), wr[0] + r() * (wr[1] - wr[0]));
  }
  d += `M0 ${H} L0 ${H - band} L${width} ${H - band} L${width} ${H}Z`;
  return d;
}

const W = 1600;
const FIRS = {
  back: layer(W, 160, 19, [46, 84], [28, 40], 14, 7),
  mid: layer(W, 160, 37, [72, 112], [44, 60], 18, 11),
  front: layer(W, 160, 120, [100, 150], [64, 84], 22, 23, 80)
};

export function buildScene(el, opts = {}) {
  const { firs = true, frontColor = '#0F1C17', stars = 10, flakes = 12, moon = true } = opts;
  const r = rng(opts.seed || 3);
  let html = '<div class="sky"></div>';
  html += '<div class="stars">';
  for (let i = 0; i < stars; i++) {
    html += `<span class="star" style="top:${Math.round(r() * 42)}%;left:${Math.round(r() * 96)}%;animation-delay:${(r() * 3).toFixed(1)}s"></span>`;
  }
  html += '</div>';
  if (moon) html += '<div class="moon"></div>';
  html += '<div class="snow">';
  for (let i = 0; i < flakes; i++) {
    const near = i % 3 === 0;
    html += `<span class="fk ${near ? 'fk-near' : 'fk-far'}" style="left:${(r() * 100).toFixed(1)}%;animation-duration:${(near ? 8 + r() * 4 : 14 + r() * 6).toFixed(1)}s;animation-delay:-${(r() * 14).toFixed(1)}s"></span>`;
  }
  html += '</div>';
  if (firs) {
    const svg = (d, fill, bottom) =>
      `<svg class="firs" style="bottom:${bottom}px" viewBox="0 0 ${W} 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path fill="${fill}" d="${d}"></path></svg>`;
    html += svg(FIRS.back, '#1A352C', 46) + svg(FIRS.mid, '#13271F', 14) + svg(FIRS.front, frontColor, 0);
  }
  el.innerHTML = html;
  el.setAttribute('aria-hidden', 'true');
}
