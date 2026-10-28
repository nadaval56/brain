// Vision section: blind spot (video, on-screen tests, mapper), peripheral vision
// (field of view lab, flash test), peripheral illusions and filling-in demos.
// Loaded the first time the tab opens.

const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const deg = r => (r * 180) / Math.PI;
// Isolate "12.5°" as left-to-right so the degree sign stays after the number in Hebrew text
const dg = v => `\u2066${v}°\u2069`;

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

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* storage blocked */ }
  return null;
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
const PAGES = ['blind', 'test', 'field', 'illusions', 'more'];
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

// ─────────────────────── Eye choice (shared by test and mapper) ───────────────────────
// Drawn for the right eye (fixation on the left, blind spot to the right);
// the left eye gets a mirror image.
let eye = 'R';
const eyeListeners = [];
function setFlip(g, width) {
  g.setAttribute('transform', eye === 'L' ? `translate(${width},0) scale(-1,1)` : '');
}

// ─────────────────────── Blind spot test ───────────────────────
const BS_TEXT = {
  dot: 'הסתכלו על ✚ והתקרבו או התרחקו לאט. במרחק מסוים העיגול האדום נעלם, ובמקומו רואים לבן.',
  house: 'כמו בסרטון: הסתכלו על הבית. במרחק הנכון האיש נעלם, והמוח "מצייר" במקומו רקע לבן.',
  line: 'בקו יש רווח. כשהרווח נופל על הכתם העיוור, הקו נראה שלם! המוח השלים קו שלא קיים.',
  stripes: 'בתוך הפסים יש עיגול לבן. כשהוא בכתם העיוור, הפסים "ממשיכים" לתוכו והעיגול נעלם.',
  color: 'בתוך הירוק יש עיגול לבן. בכתם העיוור הוא נצבע בירוק: המוח מורח את הצבע שמסביב.',
};
function initBlindTest() {
  const flip = $('bs-flip'), msg = $('bs-msg');
  let mode = 'dot';
  function draw() {
    flip.querySelectorAll('[data-mode]').forEach(g => { g.style.display = g.dataset.mode === mode ? '' : 'none'; });
    flip.querySelector('.bs-fix').style.display = mode === 'house' ? 'none' : '';
    setFlip(flip, 820);
    const cover = eye === 'R' ? 'שמאל' : 'ימין';
    say(msg, `מכסים עין ${cover}. ` + BS_TEXT[mode]);
  }
  seg($('bs-mode'), d => { mode = d.mode; draw(); });
  seg($('bs-eye'), d => { eye = d.eye; eyeListeners.forEach(f => f()); });
  eyeListeners.push(draw);
  draw();
}

// ─────────────────────── Blind spot mapper ───────────────────────
function initMapper() {
  const flip = $('map-flip'), dot = $('map-dot'), result = $('map-result');
  const go = $('map-go'), hold = $('map-hold'), rowOut = $('map-row'), msg = $('map-msg');
  const X0 = 280, X1 = 800, SPEED = 175; // px per second
  const ROWS = [];
  for (let y = 60; y <= 420; y += 24) ROWS.push(y);
  const ROW_MS = ((X1 - X0) / SPEED) * 1000;

  let running = false, held = false, row = 0, t0 = 0, raf = 0, segStart = null;
  let marks = []; // {y, x0, x1}

  const dotX = now => X0 + Math.min(1, Math.max(0, now - t0) / ROW_MS) * (X1 - X0);

  function press(on) {
    if (!running || on === held) return;
    held = on;
    hold.classList.toggle('active', on);
    const x = dotX(performance.now());
    if (on) segStart = x;
    else { marks.push({ y: ROWS[row], x0: segStart, x1: x }); segStart = null; }
  }

  function endRow(now) {
    if (held) { marks.push({ y: ROWS[row], x0: segStart, x1: X1 }); segStart = X0; }
    row++;
    if (row >= ROWS.length) return finish();
    t0 = now + 500; // short pause between rows
  }

  function frame(now) {
    if (!running) return;
    if (!onScreen(go)) { stop('הניסוי נעצר. לחצו "התחלה" כדי לנסות שוב.'); return; }
    if (now - t0 >= ROW_MS) endRow(now);
    if (!running) return;
    const visible = now >= t0;
    dot.style.display = visible ? '' : 'none';
    dot.setAttribute('cx', dotX(Math.max(now, t0)));
    dot.setAttribute('cy', ROWS[row]);
    rowOut.textContent = `שורה ${row + 1} מתוך ${ROWS.length}`;
    raf = requestAnimationFrame(frame);
  }

  function stop(text) {
    running = false; held = false;
    cancelAnimationFrame(raf);
    hold.disabled = true; hold.classList.remove('active');
    dot.style.display = 'none';
    go.textContent = '▶ התחלה';
    rowOut.textContent = '';
    if (text) say(msg, text);
  }

  function finish() {
    stop();
    result.innerHTML = '';
    const real = marks.filter(m => m.x1 - m.x0 > 6);
    if (!real.length) {
      say(msg, 'לא סימנתם אף אזור. נסו שוב: אולי המרחק מהמסך לא מתאים? כדאי קודם למצוא אותו עם העיגול האדום למעלה.', 'bad');
      return;
    }
    for (const m of real) el('rect', { x: m.x0, y: m.y - 12, width: m.x1 - m.x0, height: 24, rx: 10, fill: '#e11d48', opacity: 0.55 }, result);
    const xs = real.flatMap(m => [m.x0, m.x1]), ys = real.map(m => m.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys) - 12, maxY = Math.max(...ys) + 12;
    el('rect', { x: minX - 6, y: minY - 6, width: maxX - minX + 12, height: maxY - minY + 12, rx: 18, fill: 'none', stroke: '#0f172a', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, result);
    const cx = (minX + maxX) / 2;
    const t = el('text', { x: cx, y: Math.max(24, minY - 16), 'text-anchor': 'middle', style: 'font-size:18px;font-weight:700;fill:#0f172a' }, result);
    t.textContent = 'הכתם העיוור שלכם';
    if (eye === 'L') t.setAttribute('transform', `translate(${2 * cx},0) scale(-1,1)`);
    const ratio = (cx - 110) / (maxX - minX);
    say(msg, `זאת הצורה של הכתם (${real.length} סימונים). המרחק מה־✚ למרכז הכתם גדול פי ${ratio.toFixed(1)} מרוחב הכתם. אצל רוב האנשים בערך פי 3. שימו לב שבזמן הניסוי לא ראיתם שום "חור": רק נקודה שנעלמת.`, 'good');
  }

  go.addEventListener('click', () => {
    if (running) { stop('הניסוי נעצר.'); return; }
    marks = []; result.innerHTML = ''; row = 0; held = false;
    running = true;
    hold.disabled = false;
    go.textContent = '■ עצירה';
    say(msg, 'הסתכלו רק על ה־✚! החזיקו לחוץ כל עוד הנקודה האדומה לא נראית.');
    t0 = performance.now() + 1200;
    raf = requestAnimationFrame(frame);
  });
  hold.addEventListener('pointerdown', e => { e.preventDefault(); hold.setPointerCapture?.(e.pointerId); press(true); });
  hold.addEventListener('pointerup', () => press(false));
  hold.addEventListener('pointercancel', () => press(false));
  hold.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || !running || !onScreen(go)) return;
    e.preventDefault();
    if (!e.repeat) press(true);
  });
  document.addEventListener('keyup', e => { if (e.code === 'Space' && running) press(false); });

  eyeListeners.push(() => { setFlip(flip, 820); if (running) stop('החלפתם עין, אז הניסוי התחיל מחדש. לחצו "התחלה".'); result.innerHTML = ''; });
  setFlip(flip, 820);
}

// ─────────────────────── Angle calculator ───────────────────────
function initCalc() {
  const ids = ['calc-d', 'calc-a', 'calc-w', 'calc-h'];
  const out = $('calc-out');
  function calc() {
    const [d, a, w, h] = ids.map(id => parseFloat($(id).value));
    if (!(d > 0) || [a, w, h].some(v => !(v >= 0))) { say(out, 'הכניסו מספרים חיוביים.'); return; }
    const ang = s => deg(Math.atan(s / d));
    const ac = deg(Math.atan(a / d));
    const aw = deg(Math.atan((a + w / 2) / d) - Math.atan((a - w / 2) / d));
    const moons = Math.round(aw / 0.5);
    say(out, `מרכז הכתם: ${dg(ac.toFixed(1))} מנקודת המבט · רוחב: ${dg(aw.toFixed(1))} · גובה: ${dg(ang(h).toFixed(1))}. ברוחב הכתם נכנסים כ־${moons} ירחים מלאים בשורה!`);
  }
  ids.forEach(id => $(id).addEventListener('input', calc));
  calc();
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
  lab(x(0) + 10, T + 4, 'מדוכים: צבע ופרטים', '#d97706', 'start');
  lab(x(45), y(rods(45)) - 12, 'קנים: תנועה ואור חלש', '#7c3aed');
  lab(x(-15.5), T - 14, 'כתם עיוור', '#b45309');
  lab(x(0), B + 42, 'מרכז הראייה', 'var(--text-2)');
  lab(x(-62), B + 42, '← לכיוון האף', 'var(--muted)');
  lab(x(62), B + 42, 'לכיוון האוזן →', 'var(--muted)');
}

// ─────────────────────── Field of view lab ───────────────────────
const FOV_KINDS = [
  { k: 'move', name: 'תנועה', color: '#0e7490' },
  { k: 'color', name: 'צבע', color: '#d97706' },
  { k: 'letter', name: 'אות', color: '#7c3aed' },
];
const FOV_TYPICAL = { move: { R: 95, L: 95 }, color: { R: 45, L: 45 }, letter: { R: 10, L: 10 } };
function initFov() {
  const svg = $('fov-svg'), msg = $('fov-msg');
  const inputs = [...document.querySelectorAll('#fov-table input')];
  const CX = 300, CY = 290, RAD = 240;
  const saved = store('vision-fov') || {};
  inputs.forEach(i => { const v = saved[i.dataset.k]?.[i.dataset.s]; if (v != null) i.value = v; });

  // a = angle from straight ahead, positive = right side (drawn on the right of the page)
  const pt = (a, r) => [CX + r * Math.sin((a * Math.PI) / 180), CY - r * Math.cos((a * Math.PI) / 180)];
  function wedge(r, l, rad) {
    const [x1, y1] = pt(-l, rad), [x2, y2] = pt(r, rad);
    const large = r + l > 180 ? 1 : 0;
    return `M${CX},${CY} L${x1.toFixed(1)},${y1.toFixed(1)} A${rad},${rad} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
  }

  function read() {
    const data = {};
    for (const i of inputs) {
      const v = i.value === '' ? null : Math.max(0, Math.min(120, +i.value));
      (data[i.dataset.k] ||= {})[i.dataset.s] = v;
    }
    return data;
  }

  function draw() {
    const data = read();
    store('vision-fov', data);
    svg.innerHTML = '';
    for (const a of [30, 60, 90]) {
      for (const s of [-1, 1]) {
        const [px, py] = pt(s * a, RAD + 6);
        el('line', { x1: CX, y1: CY, x2: px, y2: py, stroke: 'var(--border)', 'stroke-dasharray': '3 4' }, svg);
        const [tx, ty] = pt(s * a, RAD + 22);
        const t = el('text', { x: tx, y: ty + 4, 'text-anchor': 'middle', class: 'small' }, svg);
        t.textContent = a + '°';
      }
    }
    el('path', { d: `M${CX - RAD},${CY} A${RAD},${RAD} 0 0 1 ${CX + RAD},${CY}`, fill: 'none', stroke: 'var(--border-strong)' }, svg);
    const t0 = el('text', { x: CX, y: CY - RAD - 10, 'text-anchor': 'middle', class: 'small' }, svg);
    t0.textContent = '0° קדימה';
    let any = false;
    FOV_KINDS.forEach(({ k, color }, n) => {
      const { R, L } = data[k];
      if (R == null || L == null) return;
      any = true;
      el('path', { d: wedge(R, L, RAD - n * 22), fill: color, 'fill-opacity': 0.22, stroke: color, 'stroke-width': 2 }, svg);
    });
    // Head seen from above, nose pointing forward
    el('ellipse', { cx: CX, cy: CY + 4, rx: 26, ry: 30, fill: '#f2c6a0', stroke: '#b97f5b', 'stroke-width': 2 }, svg);
    el('path', { d: `M${CX - 6},${CY - 24} L${CX},${CY - 36} L${CX + 6},${CY - 24}`, fill: '#f2c6a0', stroke: '#b97f5b', 'stroke-width': 2 }, svg);
    const side = (tx, txt) => { const t = el('text', { x: tx, y: CY + 30, 'text-anchor': 'middle', style: 'font-weight:600' }, svg); t.textContent = txt; };
    side(CX + 150, 'ימין'); side(CX - 150, 'שמאל');

    if (!any) { say(msg, 'הכניסו זוויות במעלות (0° = ישר קדימה, 90° = בדיוק בצד). צריך ימין וגם שמאל.'); return; }
    const total = k => (data[k].R ?? 0) + (data[k].L ?? 0);
    const parts = FOV_KINDS.filter(({ k }) => data[k].R != null && data[k].L != null).map(({ k, name }) => `${name}: ${dg(total(k))}`);
    let note = '';
    if (data.move.R != null && data.letter.R != null && data.move.R > data.letter.R) note = ' רואים תנועה הרבה יותר רחוק משאפשר לקרוא אות. בשוליים המוח יודע ש"משהו שם", ואת השאר הוא משלים.';
    say(msg, 'רוחב השדה. ' + parts.join(' · ') + '.' + note);
  }

  inputs.forEach(i => i.addEventListener('input', draw));
  $('fov-typical').addEventListener('click', () => {
    inputs.forEach(i => { i.value = FOV_TYPICAL[i.dataset.k][i.dataset.s]; });
    draw();
  });
  $('fov-clear').addEventListener('click', () => { inputs.forEach(i => { i.value = ''; }); draw(); });
  $('print-protractor').addEventListener('click', e => { e.preventDefault(); printProtractor(); });
  draw();
}

// A half-circle protractor on an A4 landscape sheet (print at 100%)
function printProtractor() {
  const R = 130; // mm
  let marks = '';
  for (let a = -100; a <= 100; a += 5) {
    const r1 = a % 10 === 0 ? R - 12 : R - 6;
    const s = Math.sin((a * Math.PI) / 180), c = Math.cos((a * Math.PI) / 180);
    marks += `<line x1="${148.5 + r1 * s}" y1="${185 - r1 * c}" x2="${148.5 + R * s}" y2="${185 - R * c}" stroke="#000" stroke-width="${a % 10 === 0 ? 0.6 : 0.3}"/>`;
    if (a % 10 === 0) {
      marks += `<line x1="148.5" y1="185" x2="${148.5 + (R - 14) * s}" y2="${185 - (R - 14) * c}" stroke="#bbb" stroke-width="0.2"/>`;
      marks += `<text x="${148.5 + (R + 7) * s}" y="${185 - (R + 7) * c + 1.5}" font-size="5" text-anchor="middle" font-family="sans-serif">${Math.abs(a)}°</text>`;
    }
  }
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>מד זווית לשדה ראייה</title>
<style>@page{size:A4 landscape;margin:0}body{margin:0}svg{width:297mm;height:210mm;display:block}</style></head><body>
<svg viewBox="0 0 297 210" xmlns="http://www.w3.org/2000/svg">
<path d="M${148.5 - R * Math.sin(100 * Math.PI / 180)},${185 + R * 0.1736} A${R},${R} 0 1 1 ${148.5 + R * Math.sin(100 * Math.PI / 180)},${185 + R * 0.1736}" fill="none" stroke="#000" stroke-width="0.6"/>
${marks}
<circle cx="148.5" cy="185" r="2" fill="#000"/>
<text x="148.5" y="196" font-size="5" text-anchor="middle" font-family="sans-serif">כאן הסנטר · 0° = ישר קדימה</text>
<text x="148.5" y="205" font-size="3.5" text-anchor="middle" font-family="sans-serif" fill="#555">הדפיסו ב־100% (בלי "התאמה לדף"). אפשר להמשיך את הקווים עם סרגל על בריסטול גדול.</text>
</svg><script>onload=()=>print()<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
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
function initLilac() {
  const svg = $('lilac-svg');
  el('rect', { width: 400, height: 300, fill: '#c9c9c9' }, svg);
  const f = el('filter', { id: 'lilac-blur', x: '-60%', y: '-60%', width: '220%', height: '220%' }, el('defs', {}, svg));
  el('feGaussianBlur', { stdDeviation: 6 }, f);
  const g = el('g', { filter: 'url(#lilac-blur)' }, svg);
  const disks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    disks.push(el('circle', { cx: 200 + 112 * Math.cos(a), cy: 150 + 112 * Math.sin(a), r: 17, fill: '#e15fd0' }, g));
  }
  el('path', { d: 'M200,141 V159 M191,150 H209', stroke: '#000', 'stroke-width': 2.5 }, svg);
  let i = 0;
  setInterval(() => {
    if (!onScreen(svg)) return;
    disks.forEach((d, k) => { d.style.display = k === i ? 'none' : ''; });
    i = (i + 1) % 12;
  }, 110);
}

function initScint() {
  const svg = $('scint-svg');
  el('rect', { width: 400, height: 300, fill: '#000' }, svg);
  const step = 40, w = 6;
  for (let x = 20; x < 400; x += step) el('rect', { x: x - w / 2, y: 0, width: w, height: 300, fill: '#808080' }, svg);
  for (let y = 10; y < 300; y += step) el('rect', { x: 0, y: y - w / 2, width: 400, height: w, fill: '#808080' }, svg);
  for (let x = 20; x < 400; x += step) for (let y = 10; y < 300; y += step) el('circle', { cx: x, cy: y, r: 5.5, fill: '#fff' }, svg);
}

function initNinio() {
  const svg = $('ninio-svg');
  el('rect', { width: 400, height: 300, fill: '#fff' }, svg);
  const step = 25;
  const g = el('g', { stroke: '#9a9a9a', 'stroke-width': 2.2 }, svg);
  for (let x = 0; x <= 400; x += step) el('line', { x1: x, y1: 0, x2: x, y2: 300 }, g);
  for (let y = 0; y <= 300; y += step) el('line', { x1: 0, y1: y, x2: 400, y2: y }, g);
  // diagonals make the pattern busier, as in the original
  for (let k = -300; k <= 400; k += step * 2) {
    el('line', { x1: k, y1: 0, x2: k + 300, y2: 300 }, g);
    el('line', { x1: k + 300, y1: 0, x2: k, y2: 300 }, g);
  }
  // 12 dots, each on a crossing of all four line directions
  for (const i of [2, 6, 10, 14]) for (const j of [2, 6, 10]) el('circle', { cx: i * step, cy: j * step, r: 6.5, fill: '#000' }, svg);
}

function initHealing() {
  const svg = $('heal-svg');
  el('rect', { width: 400, height: 300, fill: '#fff' }, svg);
  const cols = 16, rows = 12, cw = 400 / cols, ch = 300 / rows;
  // Seeded noise so the grid looks the same every visit
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const cx = (i + 0.5) * cw, cy = (j + 0.5) * ch;
    const d = Math.hypot((cx - 200) / 200, (cy - 150) / 150);
    const mess = Math.max(0, Math.min(1, (d - 0.3) / 0.5));
    const s = 13 * (1 + rnd() * 0.9 * mess);
    const x = cx + rnd() * 9 * mess, y = cy + rnd() * 9 * mess, rot = rnd() * 70 * mess;
    el('rect', { x: x - s / 2, y: y - s / 2, width: s, height: s, fill: '#0f172a', transform: `rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})` }, svg);
  }
  el('circle', { cx: 200, cy: 150, r: 4, fill: '#e11d48' }, svg);
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
  const R = 130;
  [[200, 150, 1], [600, 150, -1], [200, 450, -1], [600, 450, 1]].forEach(([x, y, d]) => wheel(x, y, R, d));
  wheel(400, 300, 95, 1);
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
  initBlindTest();
  initMapper();
  initCalc();
  initDensity();
  initFov();
  initFlash();
  initLilac();
  initScint();
  initNinio();
  initHealing();
  initDrift();
  initAfterimage();
  initScramble();
}
