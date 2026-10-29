// Vision section: blind spot (video), peripheral vision (receptor density,
// flash test), peripheral illusions and filling-in demos.
// Loaded the first time the tab opens.

const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

// Segmented buttons: mark the clicked one active and report its data-* values
function seg(box, onPick) {
  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    box.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    onPick(b.dataset);
  }));
}

function say(box, text, kind = '') {
  box.textContent = text;
  box.className = 'rx-msg' + (kind ? ' ' + kind : '');
}

const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const isVisible = () => !$('section-vision').hidden;
// True when the element's sub-page is the one on screen
const onScreen = node => isVisible() && !node.closest('.rx-page').hidden;

// ─────────────────────── Sub-pages ───────────────────────
const PAGES = ['blind', 'field', 'illusions', 'more'];
function initPages() {
  const tabs = $('vs-tabs'), pager = $('vs-pager');
  const pages = [...$('section-vision').querySelectorAll('.rx-page')];
  const label = p => tabs.querySelector(`[data-page="${p}"]`).textContent;
  const fromHash = () => (PAGES.includes(location.hash.split('/')[1]) ? location.hash.split('/')[1] : 'blind');

  function show(p, scroll) {
    pages.forEach(pg => { pg.hidden = pg.dataset.page !== p; });
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.page === p));
    tabs.querySelector('.active').scrollIntoView({ inline: 'nearest', block: 'nearest' });
    const i = PAGES.indexOf(p), prev = PAGES[i - 1], next = PAGES[i + 1];
    pager.innerHTML =
      (prev ? `<button class="small-btn" data-page="${prev}">→ ${label(prev)}</button>` : '<span></span>') +
      (next ? `<button class="small-btn" data-page="${next}">${label(next)} ←</button>` : '<span></span>');
    if (location.hash !== '#vision/' + p) history.replaceState(null, '', '#vision/' + p);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) show(b.dataset.page, true); });
  pager.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) show(b.dataset.page, true); });
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#vision')) show(fromHash(), true); });
  show(fromHash());
}

// ─────────────────────── Cone/rod density chart ───────────────────────
function initDensity() {
  const svg = $('density-svg');
  const L = 60, R = 570, T = 40, B = 240, E = 80; // ±80°
  const x = e => L + ((e + E) / (2 * E)) * (R - L);
  // Stylised curves (thousands per mm²); the blind spot sits on the nose side, 13°–18°
  const inDisc = e => e <= -13 && e >= -18;
  const cones = e => (inDisc(e) ? 0 : 150 * Math.exp(-Math.abs(e) / 1.3) + 7 * Math.exp(-Math.abs(e) / 30));
  const rods = e => (inDisc(e) ? 0 : 160 * (1 - Math.exp(-Math.abs(e) / 5)) * Math.exp(-Math.max(0, Math.abs(e) - 18) / 45));
  const y = v => B - (v / 165) * (B - T);
  const path = f => {
    let d = '';
    for (let e = -E; e <= E; e += 0.25) d += (d ? 'L' : 'M') + x(e).toFixed(1) + ',' + y(f(e)).toFixed(1);
    return d;
  };
  el('rect', { x: x(-18), y: T - 8, width: x(-13) - x(-18), height: B - T + 8, fill: '#fde68a', opacity: 0.6 }, svg);
  el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--border-strong)' }, svg);
  for (const e of [-80, -60, -40, -20, 0, 20, 40, 60, 80]) {
    el('line', { x1: x(e), y1: B, x2: x(e), y2: B + 5, stroke: 'var(--border-strong)' }, svg);
    const t = el('text', { x: x(e), y: B + 20, 'text-anchor': 'middle', class: 'small' }, svg);
    t.textContent = Math.abs(e) + '°';
  }
  el('path', { d: path(rods), fill: 'none', stroke: '#7c3aed', 'stroke-width': 3 }, svg);
  el('path', { d: path(cones), fill: 'none', stroke: '#d97706', 'stroke-width': 3 }, svg);
  const lab = (tx, ty, txt, color, anchor = 'middle') => {
    const t = el('text', { x: tx, y: ty, 'text-anchor': anchor, style: `fill:${color};font-weight:700;font-size:14px` }, svg);
    t.textContent = txt;
  };
  el('line', { x1: L, y1: T - 8, x2: L, y2: B, stroke: 'var(--border-strong)' }, svg);
  lab(L + 6, T - 14, '↑ כמות תאי חישה', 'var(--muted)', 'start');
  lab(x(-15.5), T - 14, 'כתם עיוור', '#b45309');
  lab(x(0), B + 42, 'מרכז הראייה', 'var(--text-2)');
  lab(x(-62), B + 42, '← לכיוון האף', 'var(--muted)');
  lab(x(62), B + 42, 'לכיוון האוזן →', 'var(--muted)');
}

// ─────────────────────── Flash test ───────────────────────
const FLASH_COLORS = [
  { k: 'red', name: 'אדום', c: '#e11d48' },
  { k: 'green', name: 'ירוק', c: '#16a34a' },
  { k: 'blue', name: 'כחול', c: '#2563eb' },
  { k: 'yellow', name: 'צהוב', c: '#eab308' },
];
const FLASH_LETTERS = ['ש', 'ט', 'מ', 'ג'];
const RINGS = [{ r: 70, name: 'קרוב' }, { r: 190, name: 'בינוני' }, { r: 340, name: 'רחוק' }];
function initFlash() {
  const item = $('flash-item'), answers = $('flash-answers'), bars = $('flash-bars'), msg = $('flash-msg'), go = $('flash-go');
  let mode = 'color', trials = [], n = 0, score = [], waiting = false, timers = [];

  const options = () => (mode === 'color' ? FLASH_COLORS.map(c => ({ k: c.k, label: c.name, c: c.c })) : FLASH_LETTERS.map(l => ({ k: l, label: l })));

  function renderAnswers() {
    answers.innerHTML = '';
    for (const o of options()) {
      const b = document.createElement('button');
      b.className = 'small-btn';
      b.dataset.k = o.k;
      b.disabled = true;
      b.innerHTML = o.c ? `<span class="vs-key" style="--c:${o.c}"></span>${o.label}` : `<b style="font-size:18px">${o.label}</b>`;
      answers.appendChild(b);
    }
  }

  function renderBars() {
    bars.innerHTML = RINGS.map((ring, i) => {
      const s = score[i] || { ok: 0, n: 0 };
      const pct = s.n ? Math.round((100 * s.ok) / s.n) : 0;
      return `<div class="rt-bar you"><span>${ring.name} מהמרכז</span><div class="track"><div class="fill" style="width:${pct}%"></div></div><span class="val">${s.n ? pct + '%' : '–'}</span></div>`;
    }).join('');
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function next() {
    item.innerHTML = '';
    if (n >= trials.length) return done();
    if (!onScreen(go)) { stopRound(); return; }
    say(msg, `הבזק ${n + 1} מתוך ${trials.length}: הסתכלו על הנקודה…`);
    const t = trials[n];
    timers.push(setTimeout(() => {
      const side = Math.random() < 0.5 ? 0 : 180;
      const a = ((side + (Math.random() * 50 - 25)) * Math.PI) / 180;
      const x = 400 + t.r * Math.cos(a), y = 200 + Math.max(-150, Math.min(150, t.r * Math.sin(a)));
      if (mode === 'color') el('circle', { cx: x, cy: y, r: 16, fill: FLASH_COLORS.find(c => c.k === t.k).c }, item);
      else { const tx = el('text', { x, y: y + 12, 'text-anchor': 'middle', style: 'font-size:34px;font-weight:800;fill:#0f172a' }, item); tx.textContent = t.k; }
      timers.push(setTimeout(() => {
        item.innerHTML = '';
        waiting = true;
        answers.querySelectorAll('button').forEach(b => { b.disabled = false; });
        say(msg, mode === 'color' ? 'איזה צבע הבהב?' : 'איזו אות הבהבה?');
      }, 160));
    }, 700 + Math.random() * 900));
  }

  function done() {
    go.textContent = '▶ סבב נוסף';
    const [near, , far] = score.map(s => (s.n ? s.ok / s.n : 0));
    say(msg, far < near
      ? 'רואים? קרוב למרכז כמעט תמיד צודקים, ובשוליים הרבה פחות. בשוליים העין "יודעת" שמשהו הבהב, אבל הצבע והצורה הם בעיקר ניחוש של המוח.'
      : 'סיימתם! בשוליים הצלחתם יפה. נסו לשבת קרוב יותר למסך, כדי שההבזקים הרחוקים יהיו רחוק יותר בשדה הראייה, או עברו לאותיות.', 'good');
  }

  function stopRound() {
    clearTimers(); waiting = false; item.innerHTML = '';
    answers.querySelectorAll('button').forEach(b => { b.disabled = true; });
  }

  answers.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !waiting) return;
    waiting = false;
    answers.querySelectorAll('button').forEach(x => { x.disabled = true; });
    const t = trials[n], ok = b.dataset.k === t.k;
    const s = score[t.ring];
    s.n++; if (ok) s.ok++;
    renderBars();
    const right = mode === 'color' ? FLASH_COLORS.find(c => c.k === t.k).name : t.k;
    say(msg, ok ? '✓ נכון!' : `✗ זה היה ${right}.`, ok ? 'good' : 'bad');
    n++;
    timers.push(setTimeout(next, 900));
  });

  go.addEventListener('click', () => {
    stopRound();
    const keys = options().map(o => o.k);
    trials = shuffle(RINGS.flatMap((ring, i) => [0, 1, 2, 3].map(() => ({ ring: i, r: ring.r, k: keys[Math.floor(Math.random() * keys.length)] }))));
    n = 0; score = RINGS.map(() => ({ ok: 0, n: 0 }));
    renderBars();
    go.textContent = '↺ התחלה מחדש';
    next();
  });
  seg($('flash-mode'), d => { mode = d.mode; stopRound(); renderAnswers(); score = []; renderBars(); go.textContent = '▶ התחלת סבב'; say(msg, 'לחצו "התחלת סבב" ונעצו מבט בנקודה.'); });
  renderAnswers();
  renderBars();
}

// ─────────────────────── Illusions ───────────────────────
// All drawn wide (2:1) so the edges really land in peripheral vision
const W = 800, H = 400, CX = W / 2, CY = H / 2;

function initTroxler() {
  const svg = $('troxler-svg');
  el('rect', { width: W, height: H, fill: '#d4d4d8' }, svg);
  const f = el('filter', { id: 'troxler-blur', x: '-60%', y: '-60%', width: '220%', height: '220%' }, el('defs', {}, svg));
  el('feGaussianBlur', { stdDeviation: 24 }, f);
  const g = el('g', { filter: 'url(#troxler-blur)' }, svg);
  const COLORS = ['#f472b6', '#60a5fa', '#facc15', '#4ade80', '#c084fc', '#fb923c', '#2dd4bf', '#f87171'];
  COLORS.forEach((c, k) => {
    const a = (k / COLORS.length) * 2 * Math.PI + 0.2;
    el('circle', { cx: CX + 290 * Math.cos(a), cy: CY + 135 * Math.sin(a), r: 52, fill: c }, g);
  });
  el('circle', { cx: CX, cy: CY, r: 5, fill: '#0f172a' }, svg);
}

function initLilac() {
  const svg = $('lilac-svg');
  el('rect', { width: W, height: H, fill: '#c9c9c9' }, svg);
  const f = el('filter', { id: 'lilac-blur', x: '-60%', y: '-60%', width: '220%', height: '220%' }, el('defs', {}, svg));
  el('feGaussianBlur', { stdDeviation: 8 }, f);
  const g = el('g', { filter: 'url(#lilac-blur)' }, svg);
  const disks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    disks.push(el('circle', { cx: CX + 150 * Math.cos(a), cy: CY + 150 * Math.sin(a), r: 22, fill: '#e15fd0' }, g));
  }
  el('path', { d: `M${CX},${CY - 10} V${CY + 10} M${CX - 10},${CY} H${CX + 10}`, stroke: '#000', 'stroke-width': 3 }, svg);
  let i = 0;
  setInterval(() => {
    if (!onScreen(svg)) return;
    disks.forEach((d, k) => { d.style.display = k === i ? 'none' : ''; });
    i = (i + 1) % 12;
  }, 110);
}

function initScint() {
  const svg = $('scint-svg');
  el('rect', { width: W, height: H, fill: '#000' }, svg);
  const step = 40, w = 6;
  for (let x = 20; x < W; x += step) el('rect', { x: x - w / 2, y: 0, width: w, height: H, fill: '#808080' }, svg);
  for (let y = 20; y < H; y += step) el('rect', { x: 0, y: y - w / 2, width: W, height: w, fill: '#808080' }, svg);
  for (let x = 20; x < W; x += step) for (let y = 20; y < H; y += step) el('circle', { cx: x, cy: y, r: 5.5, fill: '#fff' }, svg);
}

function initNinio() {
  const svg = $('ninio-svg');
  el('rect', { width: W, height: H, fill: '#fff' }, svg);
  const step = 25;
  const g = el('g', { stroke: '#8a8a8a', 'stroke-width': 2.5 }, svg);
  for (let x = 0; x <= W; x += step) el('line', { x1: x, y1: 0, x2: x, y2: H }, g);
  for (let y = 0; y <= H; y += step) el('line', { x1: 0, y1: y, x2: W, y2: y }, g);
  // diagonals make the pattern busier, as in the original
  for (let k = -H; k <= W; k += step * 2) {
    el('line', { x1: k, y1: 0, x2: k + H, y2: H }, g);
    el('line', { x1: k + H, y1: 0, x2: k, y2: H }, g);
  }
  // 12 small dots, each on a crossing of all four line directions
  for (const i of [4, 12, 20, 28]) for (const j of [4, 8, 12]) el('circle', { cx: i * step, cy: j * step, r: 4.2, fill: '#000' }, svg);
}

function initHealing() {
  const svg = $('heal-svg');
  el('rect', { width: W, height: H, fill: '#fff' }, svg);
  const cols = 32, rows = 16, cw = W / cols, ch = H / rows;
  // Seeded noise so the grid looks the same every visit
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const cx = (i + 0.5) * cw, cy = (j + 0.5) * ch;
    const d = Math.hypot((cx - CX) / CY, (cy - CY) / CY);
    const mess = Math.max(0, Math.min(1, (d - 0.35) / 0.6));
    const s = 13 * (1 + rnd() * 0.9 * mess);
    const x = cx + rnd() * 9 * mess, y = cy + rnd() * 9 * mess, rot = rnd() * 70 * mess;
    el('rect', { x: x - s / 2, y: y - s / 2, width: s, height: s, fill: '#0f172a', transform: `rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})` }, svg);
  }
  el('circle', { cx: CX, cy: CY, r: 4, fill: '#e11d48' }, svg);
}

function initDrift() {
  const cv = $('drift-canvas'), ctx = cv.getContext('2d');
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, cv.width, cv.height);
  // Luminance staircase that produces illusory motion: black → dark grey → white → light grey
  const SEQ = ['#000000', '#4d4d4d', '#ffffff', '#b3b3b3'];
  function wheel(cx, cy, R, dir) {
    const rings = 5;
    for (let r = 0; r < rings; r++) {
      const ro = R * (1 - r / rings), ri = R * (1 - (r + 1) / rings);
      const n = 8 * (rings - r) + 8;
      const off = (r % 2 ? 0.5 : 0) * (2 * Math.PI / n);
      for (let s = 0; s < n * 4; s++) {
        const a0 = off + (s / (n * 4)) * 2 * Math.PI, a1 = off + ((s + 1) / (n * 4)) * 2 * Math.PI;
        const k = r % 2 ? s % 4 : 3 - (s % 4);
        ctx.fillStyle = SEQ[dir > 0 ? k : 3 - k];
        ctx.beginPath();
        ctx.arc(cx, cy, ro, a0, a1 + 0.01);
        ctx.arc(cx, cy, ri, a1 + 0.01, a0, true);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = '#c8c8c8';
    ctx.beginPath(); ctx.arc(cx, cy, R / 5, 0, 2 * Math.PI); ctx.fill();
  }
  for (const [x, d0] of [[200, 1], [600, -1], [1000, 1]]) {
    wheel(x, 150, 135, d0);
    wheel(x, 450, 135, -d0);
  }
  wheel(400, 300, 90, 1);
  wheel(800, 300, 90, -1);
}

// ─────────────────────── Afterimage flag ───────────────────────
function initAfterimage() {
  const svg = $('after-svg'), go = $('after-go');
  // Israeli flag with inverted colours: blue (#0038b8) becomes yellow, white becomes black
  const INV = '#ffc747';
  function flag() {
    svg.innerHTML = '';
    el('rect', { width: 400, height: 300, fill: '#000' }, svg);
    el('rect', { x: 0, y: 30, width: 400, height: 40, fill: INV }, svg);
    el('rect', { x: 0, y: 230, width: 400, height: 40, fill: INV }, svg);
    const star = (flipY) => {
      const r = 52, pts = [0, 1, 2].map(k => {
        const a = (-90 + k * 120 + (flipY ? 180 : 0)) * Math.PI / 180;
        return `${200 + r * Math.cos(a)},${150 + r * Math.sin(a)}`;
      });
      el('polygon', { points: pts.join(' '), fill: 'none', stroke: INV, 'stroke-width': 9, 'stroke-linejoin': 'miter' }, svg);
    };
    star(false); star(true);
    el('circle', { cx: 200, cy: 150, r: 4, fill: '#fff' }, svg);
  }
  function blank() {
    svg.innerHTML = '';
    el('rect', { width: 400, height: 300, fill: '#fff' }, svg);
    el('circle', { cx: 200, cy: 150, r: 4, fill: '#0f172a' }, svg);
  }
  let timer = 0;
  go.addEventListener('click', () => {
    clearInterval(timer);
    flag();
    let left = 30;
    go.textContent = `⏳ ${left}…`;
    timer = setInterval(() => {
      left--;
      if (left > 0) { go.textContent = `⏳ ${left}…`; return; }
      clearInterval(timer);
      blank();
      go.textContent = '↺ שוב';
      setTimeout(() => { if (go.textContent === '↺ שוב') flag(); }, 15000);
    }, 1000);
  });
  flag();
}

// ─────────────────────── Scrambled reading ───────────────────────
const READ_TEXT = 'לפי מחקר שנעשה באוניברסיטה, לא משנה באיזה סדר מופיעות האותיות בתוך המילה. הדבר החשוב היחיד הוא שהאות הראשונה והאחרונה יהיו במקום הנכון. כל השאר יכול להיות בלגן מוחלט, ועדיין אפשר לקרוא את הטקסט בלי בעיה. זה קורה כי המוח לא קורא כל אות לבד, אלא את המילה כולה.';
function initScramble() {
  const out = $('scramble-text'), showBtn = $('scramble-show');
  let showing = false;
  const mix = w => {
    if (w.length < 4) return w;
    const mid = w.slice(1, -1).split('');
    for (let t = 0; t < 6; t++) { shuffle(mid); if (mid.join('') !== w.slice(1, -1)) break; }
    return w[0] + mid.join('') + w[w.length - 1];
  };
  const scramble = () => READ_TEXT.replace(/[א-ת]+/g, mix);
  const render = () => { out.textContent = showing ? READ_TEXT : scramble(); showBtn.classList.toggle('active', showing); };
  $('scramble-again').addEventListener('click', () => { showing = false; render(); });
  showBtn.addEventListener('click', () => { showing = !showing; render(); });
  render();
}

// ─────────────────────── Init ───────────────────────
export function initVision() {
  initPages();
  initDensity();
  initFlash();
  initTroxler();
  initLilac();
  initScint();
  initNinio();
  initHealing();
  initDrift();
  initAfterimage();
  initScramble();
}
