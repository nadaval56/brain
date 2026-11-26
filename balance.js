// Balance section: the vestibular system. Copperfield's vanishing Statue of Liberty
// as a mystery, inner-ear simulators (canal, otoliths), classroom stations,
// motion sickness and a quiz. Loaded the first time the tab opens.

const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rad = d => (d * Math.PI) / 180;

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

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

const isVisible = () => !$('section-balance').hidden;
const onScreen = node => isVisible() && !node.closest('.rx-page').hidden;

// ─────────────────────── Sub-pages ───────────────────────
const PAGES = ['mystery', 'ear', 'lab', 'sick', 'quiz'];
const pageHooks = {}; // page → runs each time it is shown
function initPages() {
  const tabs = $('bl-tabs'), pager = $('bl-pager');
  const pages = [...$('section-balance').querySelectorAll('.rx-page')];
  const label = p => tabs.querySelector(`[data-page="${p}"]`).textContent;
  const fromHash = () => (PAGES.includes(location.hash.split('/')[1]) ? location.hash.split('/')[1] : 'mystery');

  function show(p, scroll) {
    pages.forEach(pg => { pg.hidden = pg.dataset.page !== p; });
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.page === p));
    tabs.querySelector('.active').scrollIntoView({ inline: 'nearest', block: 'nearest' });
    const i = PAGES.indexOf(p), prev = PAGES[i - 1], next = PAGES[i + 1];
    pager.innerHTML =
      (prev ? `<button class="small-btn" data-page="${prev}">→ ${label(prev)}</button>` : '<span></span>') +
      (next ? `<button class="small-btn" data-page="${next}">${label(next)} ←</button>` : '<span></span>');
    if (location.hash !== '#balance/' + p) history.replaceState(null, '', '#balance/' + p);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    pageHooks[p]?.();
  }
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) show(b.dataset.page, true); });
  pager.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) show(b.dataset.page, true); });
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#balance')) show(fromHash(), true); });
  show(fromHash());
}

// ─────────────────────── Flip cards ───────────────────────
const CLUES = [
  ['🗽', 'הפסל לבדו גבוה 46 מטר ועשוי מכ־150 טון נחושת ופלדה. יחד עם הכן והבסיס שהוא עומד עליהם הגובה 93 מטר, כמו בניין של 30 קומות. הבסיס לבדו שוקל כ־27,000 טון. וגם הוא "נעלם"!'],
  ['🌙', 'המופע התקיים בלילה. מסביב היו מים כהים, כמעט בלי נקודות ציון.'],
  ['🪑', 'הקהל לא ישב על האדמה של האי, אלא על במה גדולה שנבנתה במיוחד לערב הזה.'],
  ['🗼', 'הקהל ראה את הפסל רק דרך "חלון" בין שני מגדלים גבוהים.'],
  ['🎵', 'לאורך כל הקסם התנגנה מוזיקה חזקה, וקופרפילד דיבר כמעט בלי הפסקה.'],
  ['⏳', 'הווילון היה למעלה כמה דקות. לא "פוף" של שנייה.'],
  ['📺', 'המסוק, המכ״ם והזרקורים היו חלק מההפקה של הקוסם.'],
];
const SYSTEMS = [
  ['👀', 'הראייה', 'לילה חשוך, וילון שהסתיר את הפסל בדיוק בזמן התנועה, ומגדלים שהשאירו "חלון" צר. בלי נקודות ציון, העיניים לא יכלו לראות שהבמה זזה. ובשוליים, זוכרים? רואים מעט מאוד.'],
  ['👂', 'האוזן הפנימית', 'התעלות מרגישות רק שינוי במהירות הסיבוב. הבמה האיצה לאט מאוד, מתחת לסף התחושה, ואז הסתובבה בקצב קבוע, שאותו התעלות לא מרגישות בכלל.'],
  ['🦶', 'תחושת הגוף', 'הכיסא, הרצפה והאנשים מסביב זזו יחד עם כל אחד מהקהל. שום דבר לא לחץ, לא דחף ולא החליק, אז לא היה מה להרגיש.'],
  ['🎧', 'השמיעה', 'מנועים שמסובבים במה עושים רעש. המוזיקה החזקה והדיבור של הקוסם הסתירו אותו.'],
];
const QUIZ = [
  ['🎠', 'ירדתם מקרוסלה, ועכשיו כל העולם מסתובב. למה?', 'הנוזל בתעלות המשיך לזרום גם אחרי שעצרתם. השערות התכופפו לצד השני, והמוח "מרגיש" סיבוב שלא קורה. אחרי כ־20 שניות הנוזל נעצר.'],
  ['🛗', 'במעלית מרגישים רק את ההתחלה ואת הסוף, לא את האמצע. למה?', 'האבנים באוזן מרגישות תאוצה, לא מהירות. באמצע הנסיעה המהירות קבועה, אין תאוצה, והאבנים לא זזות.'],
  ['✈️', 'טייס בתוך ענן מרגיש שהוא טס ישר, אבל המטוס בעצם נוטה ופונה. איך?', 'בלי לראות את האופק, נשארה רק האוזן. אם המטוס נוטה לאט, מתחת לסף, היא לא מרגישה. לכן טייסים לומדים לסמוך על המכשירים, לא על התחושה.'],
  ['🚀', 'רוב האסטרונאוטים מרגישים בחילה בימים הראשונים בחלל. למה?', 'בחלל האבנים לא נמשכות למטה, אז האוזן מדווחת דברים מוזרים, והעיניים מדווחות אחרת. סתירה, ובחילה. אחרי כמה ימים המוח לומד לסמוך יותר על העיניים.'],
  ['🚢', 'אחרי שבוע בשייט, גם על היבשה הרצפה "מתנדנדת". למה?', 'המוח למד לתקן כל הזמן את הנדנוד של האונייה. ביבשה הוא ממשיך "לתקן" עוד כמה שעות או ימים, עד שהוא מתרגל מחדש.'],
  ['🩰', 'רקדניות בלט מסתובבות שוב ושוב בלי ליפול. איך?', 'הן "נועצות" מבט בנקודה ומסובבות את הראש בבת אחת בסוף כל סיבוב, כך העיניים נותנות עוגן. וגם אימון: המוח שלהן לומד להחליש את תחושת הסחרחורת.'],
  ['🐈', 'חתול שנופל הפוך נוחת כמעט תמיד על הרגליים. איך הוא יודע איפה למטה?', 'האוזן הפנימית שלו מזהה תוך שבריר שנייה איפה למטה, ומפעילה רפלקס: קודם הראש מסתובב, ואחריו הגוף.'],
  ['👶', 'למה נדנוד מרגיע תינוקות (וגם מבוגרים)?', 'תנועה עדינה וקצובה מפעילה את המערכת הווסטיבולרית בצורה צפויה ונעימה. התינוק הכיר את התחושה הזאת עוד ברחם, כשאמא הלכה.'],
];

function flipCards(box, items, render) {
  box.innerHTML = items.map(render).join('');
  box.addEventListener('click', e => {
    const card = e.target.closest('.flip');
    if (card) card.classList.toggle('flipped');
  });
}

function initCards() {
  flipCards($('bl-clues'), CLUES, ([emoji, text], i) => `
    <div class="flip"><div class="flip-inner">
      <div class="face front"><div class="emoji">🕵️</div><div class="q">רמז ${i + 1}</div><div class="tap">לחצו להפוך</div></div>
      <div class="face back bl-back"><div class="emoji">${emoji}</div><div class="why">${text}</div></div>
    </div></div>`);
  flipCards($('bl-systems'), SYSTEMS, ([emoji, name, why]) => `
    <div class="flip"><div class="flip-inner">
      <div class="face front"><div class="emoji">${emoji}</div><div class="q">${name}</div><div class="tap">למה היא לא התריעה?</div></div>
      <div class="face back bl-back"><div class="verdict">${emoji} ${name}</div><div class="why">${why}</div></div>
    </div></div>`);
  flipCards($('bl-quiz'), QUIZ, ([emoji, q, a]) => `
    <div class="flip"><div class="flip-inner">
      <div class="face front"><div class="emoji">${emoji}</div><div class="q">${q}</div><div class="tap">לחצו לתשובה</div></div>
      <div class="face back bl-back"><div class="why">${a}</div></div>
    </div></div>`);
}

// ─────────────────────── The vanishing statue (top view) ───────────────────────
const P = { x: 300, y: 335 }, STATUE = { x: 300, y: 92 };
// Towers sit ±TX to the sides and TY ahead of the audience's centre, TH = half their width
const TX = 85, TY = 92, TH = 22;
const deg = r => (r * 180) / Math.PI;
const TURN = deg(Math.atan2(TX, TY)); // turning by this puts the statue right behind the left tower
// Directions (from straight ahead) that a tower blocks, from its corners
const TOWER_FROM = deg(Math.atan2(TX - TH, TY + TH)), TOWER_TO = deg(Math.atan2(TX + TH, TY - TH));
const THRESHOLD = 1; // °/s², a rough perception threshold for slow rotation

function initScene() {
  const svg = $('bl-scene'), msg = $('bl-scene-msg');
  const dur = $('bl-dur'), durOut = $('bl-dur-out'), play = $('bl-play'), meter = $('bl-meter');

  // The whole solution opens and closes from its title
  const toggle = $('bl-solve-toggle'), body = $('bl-solve-body');
  toggle.addEventListener('click', () => {
    body.hidden = !body.hidden;
    toggle.setAttribute('aria-expanded', String(!body.hidden));
  });

  // Water, island, statue
  el('rect', { width: 600, height: 440, fill: '#0b1a33' }, svg);
  el('circle', { cx: STATUE.x, cy: STATUE.y, r: 30, fill: '#1f3b2d' }, svg);
  const star = [];
  for (let k = 0; k < 22; k++) {
    const r = k % 2 ? 13 : 21, a = rad(k * (360 / 22) - 90);
    star.push(`${STATUE.x + r * Math.cos(a)},${STATUE.y + r * Math.sin(a)}`);
  }
  el('polygon', { points: star.join(' '), fill: '#64748b' }, svg);
  // A ring of floodlights that fades on and off smoothly
  const FADE = 'opacity 1.8s ease-in-out, fill 1.8s ease-in-out';
  function lightRing(cx, cy) {
    const glowC = el('circle', { cx, cy, r: 30, fill: '#fde68a' }, svg);
    glowC.style.transition = FADE;
    const dots = [];
    for (let k = 0; k < 12; k++) {
      const a = rad(k * 30);
      const d = el('circle', { cx: cx + 33 * Math.cos(a), cy: cy + 33 * Math.sin(a), r: 3.5 }, svg);
      d.style.transition = FADE;
      dots.push(d);
    }
    return on => {
      glowC.style.opacity = on ? 0.35 : 0;
      dots.forEach(d => { d.style.fill = on ? '#fef08a' : '#334155'; });
    };
  }
  const statueLights = lightRing(STATUE.x, STATUE.y);
  el('circle', { cx: STATUE.x, cy: STATUE.y, r: 8, fill: '#5eead4', stroke: '#134e4a', 'stroke-width': 2 }, svg);
  // The decoy: the same ring of lights around an empty spot, where the audience faces after the turn
  const D = 243, FAKE = { x: P.x + D * Math.sin(rad(TURN)), y: P.y - D * Math.cos(rad(TURN)) };
  const fakeLights = lightRing(FAKE.x, FAKE.y);
  let lit = 'statue';
  function setLights(which) {
    lit = which;
    statueLights(which === 'statue');
    fakeLights(which === 'fake');
  }

  // Platform with the audience, the towers and the curtain all turn together
  const g = el('g', {}, svg);
  const far = 420;
  const ray = a => `${P.x + far * Math.sin(rad(a))},${P.y - far * Math.cos(rad(a))}`;
  // What the audience can see: the window between the towers. Behind each tower: its "shadow"
  el('path', { d: `M${P.x},${P.y} L${ray(-TOWER_FROM)} L${ray(TOWER_FROM)} Z`, fill: '#fde68a', opacity: 0.16 }, g);
  for (const sgn of [-1, 1]) el('path', { d: `M${P.x},${P.y} L${ray(sgn * TOWER_FROM)} L${ray(sgn * TOWER_TO)} Z`, fill: '#000', opacity: 0.45 }, g);
  el('circle', { cx: P.x, cy: P.y, r: 98, fill: '#334155', stroke: '#94a3b8', 'stroke-width': 2 }, g);
  for (let row = 0; row < 4; row++) for (let c = -4 + (row % 2) * 0.5; c <= 4; c++) {
    const x = P.x + c * 17, y = P.y - 30 + row * 20;
    if (Math.hypot(x - P.x, y - P.y) < 86) el('circle', { cx: x, cy: y, r: 6, fill: '#f2c6a0' }, g);
  }
  const towerL = { x: P.x - TX, y: P.y - TY }, towerR = { x: P.x + TX, y: P.y - TY };
  for (const t of [towerL, towerR]) el('rect', { x: t.x - TH, y: t.y - TH, width: 2 * TH, height: 2 * TH, fill: '#cbd5e1', stroke: '#475569', 'stroke-width': 2 }, g);
  const curtain = el('path', { d: `M${towerL.x + TH},${towerL.y} Q${P.x},${towerL.y - 12} ${towerR.x - TH},${towerR.y}`, stroke: '#dc2626', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, g);
  const al = el('text', { x: P.x, y: P.y + 62, 'text-anchor': 'middle', style: 'fill:#e2e8f0;font-weight:700;font-size:13px' }, g);
  al.textContent = 'הקהל';

  let theta = 0, curtainUp = false, raf = 0;

  function draw() {
    g.setAttribute('transform', `rotate(${theta} ${P.x} ${P.y})`);
    curtain.style.display = curtainUp ? '' : 'none';
  }

  function fmt(s) { return s < 60 ? `${s} שניות` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} דקות`; }
  function peakAccel() { const T = +dur.value; return (TURN * Math.PI ** 2) / (2 * T * T); }
  function updateDur() {
    durOut.textContent = fmt(+dur.value);
    const a = peakAccel();
    meter.style.width = clamp(((Math.log10(a) + 3) / 5) * 100, 2, 100) + '%';
    meter.classList.toggle('over', a > THRESHOLD);
  }

  const back = $('bl-back');
  function reset() {
    cancelAnimationFrame(raf);
    theta = 0; curtainUp = false; setLights('statue');
    play.disabled = false; back.disabled = true;
    draw();
    say(msg, 'לחצו "הפעילו את הקסם". נסו גם לשנות את משך הסיבוב.');
  }

  // One run of the trick: curtain up, lights swap, the platform turns from → to, curtain down
  function run(from, to, lightsOff, done) {
    cancelAnimationFrame(raf);
    play.disabled = true; back.disabled = true;
    const T = +dur.value;
    const anim = Math.min(T, 6) * 1000; // shown faster than real life
    const t0 = performance.now();
    say(msg, '1. הווילון עולה...');
    function frame(now) {
      const t = now - t0;
      if (t < 1200) { curtainUp = true; }
      else if (t < 1200 + anim) {
        if (lit !== (lightsOff ? 'fake' : 'statue')) setLights(lightsOff ? 'fake' : 'statue');
        const s = (t - 1200) / anim;
        theta = from + ((to - from) * (1 - Math.cos(Math.PI * s))) / 2;
        say(msg, `2. ${lightsOff ? 'האורות סביב הפסל כבים, האורות המתחזים נדלקים' : 'האורות המתחזים כבים, האורות סביב הפסל נדלקים'}, והבמה מסתובבת לאט... ${Math.round(theta)}°`);
      } else if (t < 2400 + anim) {
        theta = to; curtainUp = false;
      } else {
        draw();
        done();
        return;
      }
      draw();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  function verdict(what) {
    const T = +dur.value, a = peakAccel();
    const aTxt = a < 0.1 ? a.toFixed(3) : a.toFixed(1);
    say(msg, a > THRESHOLD
      ? `הבמה הסתובבה ${Math.round(TURN)}° ב־${fmt(T)}. התאוצה הגדולה ביותר: ${aTxt}°/ש׳². זה מעל הסף: הקהל היה מרגיש שהבמה זזה, והקסם היה נכשל!`
      : `הבמה הסתובבה ${Math.round(TURN)}° ב־${fmt(T)}. התאוצה הגדולה ביותר: ${aTxt}°/ש׳², הרבה מתחת לסף. אף אחד לא הרגיש כלום, ו${what}`,
    a > THRESHOLD ? 'bad' : 'good');
  }

  play.addEventListener('click', () => {
    reset();
    run(0, TURN, true, () => { play.disabled = false; back.disabled = false; verdict('הפסל "נעלם" מאחורי המגדל. עכשיו נסו להחזיר אותו!'); });
  });
  back.addEventListener('click', () => {
    run(TURN, 0, false, () => { play.disabled = false; verdict('הפסל "חזר" בדיוק למקום שבו תמיד עמד. הוא לא זז לרגע, רק הקהל זז.'); });
  });
  $('bl-reset').addEventListener('click', reset);
  dur.addEventListener('input', updateDur);
  updateDur();
  reset();
}

// ─────────────────────── Ear anatomy ───────────────────────
const EAR_TEXT = {
  yes: 'התעלה הקדמית עומדת אנכית, באלכסון: חצי קדימה, חצי הצידה. היא מגיבה הכי חזק לסיבוב סביב הציר שניצב לה (המוט השחור), כמו גלגל על הציר שלו. בהנהון "כן" היא עובדת יחד עם התעלה האחורית.',
  no: 'התעלה האופקית שוכבת כמעט מאוזנת. הציר שלה אנכי, ולכן היא מגיבה בעיקר לניעור "לא". זו התעלה ש"נרדמה" אצל הקהל של קופרפילד.',
  tilt: 'התעלה האחורית גם היא אנכית ובאלכסון, בזווית ישרה לקדמית. גם היא מגיבה הכי חזק לסיבוב סביב הציר שלה. בהטיית אוזן לכתף היא עובדת יחד עם הקדמית.',
  oto: 'השקיקות עם האבנים לא מרגישות סיבוב, אלא לאן "למטה" ומתי מאיצים או בולמים בקו ישר. כשהראש נע קדימה ואחורה, האבנים הכבדות "נשארות מאחור" וזזות בתוך השקיק, וכך מכופפות את השערות.',
};
function initEar() {
  const svg = $('bl-ear-svg'), msg = $('bl-ear-msg'), box = $('bl-ear3d');
  // The 3D model loads the first time the page is shown; the drawing stays as a fallback
  let ear3d = null, loading = false, pick = null;
  function load() {
    if (loading) return;
    loading = true;
    import('./ear3d.js' + new URL(import.meta.url).search)
      .then(mod => {
        ear3d = mod.initEar3D(box, () => onScreen(box));
        svg.style.display = 'none';
        box.hidden = false;
        ear3d.highlight(pick);
      })
      .catch(err => { console.error(err); box.hidden = true; });
  }
  pageHooks.ear = load;
  if (!box.closest('.rx-page').hidden) load();
  seg($('bl-canal-pick'), d => {
    pick = d.c;
    ear3d?.highlight(d.c);
    svg.classList.add('picked');
    svg.querySelectorAll('.bl-canal').forEach(c => c.classList.toggle('on', c.id === 'bl-c-' + d.c));
    $('bl-oto').classList.toggle('on', d.c === 'oto');
    say(msg, EAR_TEXT[d.c]);
  });
}

// ─────────────────────── Semicircular canal simulator ───────────────────────
function initCanal() {
  const svg = $('bl-canal-svg'), msg = $('bl-canal-msg');
  const spin = $('bl-spin'), stop = $('bl-stop');
  const plot = $('bl-canal-plot'), ctx = plot.getContext('2d');
  const C = { x: 150, y: 150 }, R = 100, TAU = 4, SPEED = 120;

  // The canal turns with the head: tube, wall marks, the head itself and the hair cells,
  // which sit in one bulge of the canal (the ampulla). Only the fluid is free to lag behind.
  const head = el('g', {}, svg);
  el('circle', { cx: C.x, cy: C.y, r: R, fill: 'none', stroke: '#ede9fe', 'stroke-width': 30 }, head);
  el('circle', { cx: C.x, cy: C.y, r: R + 15, fill: 'none', stroke: '#7c3aed', 'stroke-width': 3 }, head);
  el('circle', { cx: C.x, cy: C.y, r: R - 15, fill: 'none', stroke: '#7c3aed', 'stroke-width': 3 }, head);
  for (let k = 0; k < 24; k++) {
    const a = rad(k * 15);
    el('line', { x1: C.x + (R + 15) * Math.cos(a), y1: C.y + (R + 15) * Math.sin(a), x2: C.x + (R + 23) * Math.cos(a), y2: C.y + (R + 23) * Math.sin(a), stroke: '#7c3aed', 'stroke-width': 3 }, head);
  }
  el('circle', { cx: C.x, cy: C.y, r: 52, fill: '#f2c6a0', stroke: '#b97f5b', 'stroke-width': 2 }, head);
  el('path', { d: `M${C.x - 9},${C.y - 50} L${C.x},${C.y - 66} L${C.x + 9},${C.y - 50} Z`, fill: '#f2c6a0', stroke: '#b97f5b', 'stroke-width': 2 }, head);
  el('circle', { cx: C.x - 18, cy: C.y - 22, r: 5, fill: '#0f172a' }, head);
  el('circle', { cx: C.x + 18, cy: C.y - 22, r: 5, fill: '#0f172a' }, head);
  el('ellipse', { cx: C.x - 54, cy: C.y, rx: 7, ry: 12, fill: '#e2a982' }, head);
  el('ellipse', { cx: C.x + 54, cy: C.y, rx: 7, ry: 12, fill: '#e2a982' }, head);
  el('ellipse', { cx: C.x, cy: C.y - R, rx: 24, ry: 26, fill: '#ede9fe', stroke: '#7c3aed', 'stroke-width': 3 }, head);
  const hairs = [-12, -6, 0, 6, 12].map(dx => ({ dx, p: el('path', { d: '', stroke: '#dc2626', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, head) }));
  const fluid = el('g', {}, svg);
  for (let k = 0; k < 14; k++) {
    const a = rad((k * 360) / 14 + 12);
    el('circle', { cx: C.x + R * Math.cos(a), cy: C.y + R * Math.sin(a), r: 5, fill: '#2563eb' }, fluid);
  }
  const t1 = el('text', { x: 300, y: 70, style: 'font-weight:700;font-size:15px' }, svg);
  const t2 = el('text', { x: 300, y: 110, style: 'font-weight:700;font-size:15px;fill:#7c3aed' }, svg);
  const arrow = el('text', { x: 450, y: 200, 'text-anchor': 'middle', style: 'font-size:64px' }, svg);
  const legend = el('text', { x: 300, y: 293, 'text-anchor': 'middle', class: 'small' }, svg);
  legend.textContent = 'סגול: התעלה (מסתובבת עם הראש) · כחול: הנוזל שבתוכה · אדום: השערות, בבליטה של התעלה';

  let wH = 0, wF = 0, aH = 0, aF = 0, target = 0, last = 0, hist = [], phase = 'idle', phaseT = 0;

  function drawPlot() {
    const W = plot.width, H = plot.height, span = 30;
    ctx.clearRect(0, 0, W, H);
    const now = hist.length ? hist[hist.length - 1].t : 0;
    const x = t => W - ((now - t) / span) * W, y = v => H / 2 - (v / 150) * (H / 2 - 12);
    ctx.strokeStyle = 'rgba(100,116,139,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    for (const [key, color] of [['h', '#64748b'], ['f', '#7c3aed']]) {
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath();
      hist.forEach((p, i) => { const v = key === 'h' ? p.h : p.h - p.f; i ? ctx.lineTo(x(p.t), y(v)) : ctx.moveTo(x(p.t), y(v)); });
      ctx.stroke();
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (!onScreen(svg)) { requestAnimationFrame(frame); return; }
    wH += clamp(target - wH, -400 * dt, 400 * dt);
    wF += ((wH - wF) / TAU) * dt;
    aH += wH * dt; aF += wF * dt; phaseT += dt;
    const feel = wH - wF;
    head.setAttribute('transform', `rotate(${aH} ${C.x} ${C.y})`);
    fluid.setAttribute('transform', `rotate(${aF} ${C.x} ${C.y})`);
    // The hairs grow from the outer wall of the bulge and bend with the fluid flowing past them
    const bend = clamp(-feel / 5, -22, 22), root = C.y - R - 24, tip = C.y - R + 8;
    for (const h of hairs) h.p.setAttribute('d', `M${C.x + h.dx},${root} Q${C.x + h.dx},${(root + tip) / 2} ${C.x + h.dx + bend},${tip}`);
    t1.textContent = `הראש באמת: ${Math.round(wH)} מעלות בשנייה`;
    t2.textContent = `המוח מרגיש: ${Math.abs(feel) < 6 ? 'לא זז' : (feel > 0 ? 'מסתובב ↻' : 'מסתובב ↺')} (${Math.round(Math.abs(feel))})`;
    arrow.textContent = Math.abs(feel) < 6 ? '😌' : (feel > 0 ? '↻' : '↺');
    arrow.style.opacity = clamp(Math.abs(feel) / 60, 0.25, 1);
    if (phase === 'spin' && phaseT > 2 && Math.abs(feel) < 30) say(msg, 'עדיין מסתובבים, אבל התחושה כמעט נעלמה! הנוזל "הדביק" את התעלה ומסתובב יחד איתה, אז השערות חזרו למקום. עכשיו לחצו "עצירה".');
    if (phase === 'stop' && phaseT > 0.2 && phaseT < 1) say(msg, 'הראש והתעלה עצרו, אבל הנוזל ממשיך לזרום בתוך התעלה העומדת ומכופף את השערות לצד השני: המוח מרגיש סיבוב לכיוון ההפוך! זו הסחרחורת אחרי קרוסלה.', 'bad');
    if (phase === 'stop' && Math.abs(feel) < 6 && phaseT > 2) { say(msg, 'הנוזל נעצר, והתחושה נעלמה. אפשר לנסות שוב.', 'good'); phase = 'idle'; }
    hist.push({ t: now / 1000, h: wH, f: wF });
    while (hist.length && now / 1000 - hist[0].t > 30) hist.shift();
    drawPlot();
    requestAnimationFrame(frame);
  }

  spin.addEventListener('click', () => {
    target = SPEED; phase = 'spin'; phaseT = 0;
    spin.disabled = true; stop.disabled = false;
    say(msg, 'הראש והתעלה מתחילים להסתובב. הנוזל שבתוך התעלה נשאר מאחור, והשערות (שזזות עם התעלה) נתקלות בו ומתכופפות: המוח מרגיש סיבוב חזק.');
  });
  stop.addEventListener('click', () => {
    target = 0; wH = 0; phase = 'stop'; phaseT = 0;
    spin.disabled = false; stop.disabled = true;
  });
  last = performance.now();
  requestAnimationFrame(frame);
}

// ─────────────────────── Otoliths ───────────────────────
function initOtolith() {
  const svg = $('bl-oto-svg'), msg = $('bl-oto-msg'), tiltIn = $('bl-tilt');
  const g = el('g', {}, svg);
  el('rect', { x: 120, y: 170, width: 360, height: 26, rx: 6, fill: '#fca5a5' }, g);
  const hairs = [];
  for (let k = 0; k < 12; k++) hairs.push({ x: 145 + k * 28, p: el('path', { d: '', stroke: '#b91c1c', 'stroke-width': 3, fill: 'none' }, g) });
  const gel = el('g', {}, g);
  el('rect', { x: 130, y: 112, width: 340, height: 30, rx: 8, fill: '#e0f2fe', stroke: '#38bdf8', 'stroke-width': 2 }, gel);
  for (let k = 0; k < 26; k++) el('rect', { x: 136 + k * 12.8, y: 100 + (k % 3) * 2, width: 9, height: 12, rx: 2, fill: '#94a3b8', stroke: '#475569' }, gel);
  const fwd = el('text', { x: 500, y: 150, style: 'font-weight:700' }, g);
  fwd.textContent = 'קדימה ←';
  const brain = el('text', { x: 300, y: 240, 'text-anchor': 'middle', style: 'font-weight:700;font-size:15px;fill:#0e7490' }, svg);

  let tilt = 0, accel = 0, raf = 0;
  function draw() {
    // Positive shift = the gel slides forward (to the right in the drawing)
    const shift = clamp(60 * (Math.sin(rad(tilt)) - accel), -40, 40);
    g.setAttribute('transform', `rotate(${tilt} 300 160)`);
    gel.setAttribute('transform', `translate(${shift},0)`);
    for (const h of hairs) h.p.setAttribute('d', `M${h.x},170 Q${h.x},155 ${h.x + shift},142`);
    const eq = Math.round((Math.asin(clamp(Math.sin(rad(tilt)) - accel, -1, 1)) * 180) / Math.PI);
    brain.textContent = eq === 0 ? '🧠 המוח מבין: ראש ישר, לא זזים' : `🧠 המוח מבין: הראש מוטה ${Math.abs(eq)}° ${eq > 0 ? 'קדימה' : 'אחורה'}`;
  }
  tiltIn.addEventListener('input', () => {
    tilt = +tiltIn.value; draw();
    say(msg, tilt === 0 ? 'הראש ישר: הגבישים במקום.' : 'הגבישים הכבדים מחליקים למטה ומכופפים את השערות. כך המוח יודע איפה למטה.');
  });
  function push(a, text) {
    cancelAnimationFrame(raf);
    tilt = 0; tiltIn.value = 0;
    const t0 = performance.now();
    say(msg, text);
    function frame(now) {
      const t = (now - t0) / 1000;
      accel = t < 0.3 ? (a * t) / 0.3 : t < 1.8 ? a : t < 2.1 ? a * (1 - (t - 1.8) / 0.3) : 0;
      draw();
      if (t < 2.1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }
  $('bl-accel').addEventListener('click', () => push(0.35, 'הרכב מזנק: הגבישים נשארים מאחור, בדיוק כמו כשמטים את הראש אחורה. בלי העיניים, המוח היה בטוח שהראש נטה!'));
  $('bl-brake').addEventListener('click', () => push(-0.35, 'בלימה: הגבישים ממשיכים קדימה, כמו כשמטים את הראש קדימה.'));
  draw();
  say(msg, 'הזיזו את המחוון כדי להטות את הראש, או נסו את הרכב.');
}

// ─────────────────────── Station 2: reading while shaking ───────────────────────
function initVOR() {
  const box = $('bl-vor'), btn = $('bl-vor-shake');
  btn.addEventListener('click', () => {
    const on = box.classList.toggle('shaking');
    btn.textContent = on ? '⏹ עצרו את הרעידה' : '📳 הרעידו את הטקסט';
    btn.classList.toggle('active', on);
  });
}

// ─────────────────────── Station 3: standing stopwatch ───────────────────────
const COND = ['👀 עיניים פקוחות', '🙈 עיניים עצומות'];
function initStopwatch() {
  const btn = $('bl-watch'), out = $('bl-watch-out'), bars = $('bl-watch-bars');
  let cond = 0, running = false, t0 = 0, raf = 0;
  let results = store('balance-stand-2') || [[], []];

  function render() {
    bars.innerHTML = COND.map((name, i) => {
      const r = results[i], avg = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
      return `<div class="rt-bar you"><span>${name}</span><div class="track"><div class="fill" style="width:${(avg / 30) * 100}%"></div></div><span class="val">${r.length ? avg.toFixed(1) + ' ש׳' : '–'}</span></div>`;
    }).join('');
  }
  function stopWatch() {
    running = false;
    cancelAnimationFrame(raf);
    const s = Math.min(30, (performance.now() - t0) / 1000);
    out.textContent = s.toFixed(1) + ' ש׳';
    results[cond].push(+s.toFixed(1));
    store('balance-stand-2', results);
    btn.textContent = '▶ התחלה';
    btn.classList.remove('active');
    render();
  }
  function frame(now) {
    const s = (now - t0) / 1000;
    out.textContent = Math.min(30, s).toFixed(1) + ' ש׳';
    if (s >= 30) { stopWatch(); return; }
    raf = requestAnimationFrame(frame);
  }
  btn.addEventListener('click', () => {
    if (running) { stopWatch(); return; }
    running = true; t0 = performance.now();
    btn.textContent = '⏹ הרגל נגעה ברצפה!';
    btn.classList.add('active');
    raf = requestAnimationFrame(frame);
  });
  seg($('bl-cond'), d => { if (running) stopWatch(); cond = +d.c; out.textContent = '0.0 ש׳'; });
  $('bl-watch-clear').addEventListener('click', () => { results = [[], []]; store('balance-stand-2', results); render(); });
  render();
}

// ─────────────────────── Station 5: phone sensors ───────────────────────
function initSensors() {
  const btn = $('bl-sensors'), box = $('bl-sens'), msg = $('bl-sens-msg');
  const gyro = $('bl-gyro'), acc = $('bl-acc');
  const row = (label, v, max, unit) => `<div class="bl-sens-row"><span>${label}</span><div class="track"><div class="fill" style="width:${clamp((Math.abs(v) / max) * 100, 0, 100)}%"></div></div><span class="val">${Math.round(v)} ${unit}</span></div>`;
  let got = false, lastDraw = 0, fallUntil = 0;

  function onMotion(e) {
    got = true;
    const now = performance.now();
    const g = e.accelerationIncludingGravity || {};
    const mag = Math.hypot(g.x || 0, g.y || 0, g.z || 0);
    if (mag > 0 && mag < 3) fallUntil = now + 1500;
    if (now - lastDraw < 80) return;
    lastDraw = now;
    const r = e.rotationRate || {};
    gyro.innerHTML = row('ניעור "לא"', r.alpha || 0, 360, '°/ש׳') + row('הנהון "כן"', r.beta || 0, 360, '°/ש׳') + row('אוזן לכתף', r.gamma || 0, 360, '°/ש׳');
    acc.innerHTML = row('שמאל־ימין', g.x || 0, 20, 'מ׳/ש׳²') + row('למעלה־למטה', g.y || 0, 20, 'מ׳/ש׳²') + row('קדימה־אחורה', g.z || 0, 20, 'מ׳/ש׳²') + row('סה״כ', mag, 20, 'מ׳/ש׳²');
    if (now < fallUntil) say(msg, '🪂 נפילה! הכוח הכולל ירד כמעט לאפס: הטלפון "מרגיש" חוסר משקל, כמו אסטרונאוט.', 'good');
    else say(msg, `הטלפון במנוחה מרגיש בערך 9.8: זה כוח המשיכה. עכשיו: ${mag.toFixed(1)}.`);
  }

  btn.addEventListener('click', async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        await DeviceMotionEvent.requestPermission(); // iPhone asks the user; elsewhere we just listen
      }
    } catch (e) { /* older browsers: no permission needed */ }
    window.addEventListener('devicemotion', onMotion);
    box.hidden = false;
    btn.disabled = true;
    say(msg, 'מחפש חיישנים...');
    setTimeout(() => {
      if (!got) { box.hidden = true; btn.disabled = false; say(msg, 'לא מגיעים נתונים מהחיישנים. במחשב אין חיישני תנועה: פתחו את העמוד בטלפון (ובאייפון אשרו את הגישה).', 'bad'); }
    }, 2000);
  });
}

// ─────────────────────── Motion sickness: eyes vs ear ───────────────────────
// Pairs of the same place: one way confuses the brain, the other does not
const PAIRS = [
  ['🚗 ברכב', [
    ['📖 קוראים ספר במושב האחורי', 'הספר לא זז. אנחנו עומדים במקום.', 'פניות, בלימות, מהמורות. אנחנו זזים!', 1],
    ['🪟 מסתכלים החוצה, קדימה על הכביש', 'הנוף זורם. אנחנו זזים.', 'אנחנו זזים.', 0],
  ]],
  ['🚢 באונייה', [
    ['🛏️ בתא סגור בבטן האונייה', 'הקירות לא זזים (הם זזים יחד איתנו).', 'מתנדנדים למעלה ולמטה!', 1],
    ['🌊 על הסיפון, מסתכלים על האופק', 'האופק עולה ויורד: מתנדנדים.', 'מתנדנדים.', 0],
  ]],
  ['🥽 במשחק מציאות מדומה', [
    ['🎮 טסים במשחק, ויושבים על כיסא', 'אנחנו טסים ומסתובבים!', 'יושבים בכיסא ולא זזים.', 1],
    ['🚶 הולכים באמת בחדר עם המשקפיים', 'הולכים קדימה.', 'הולכים קדימה.', 0],
  ]],
  ['🎠 בקרוסלה', [
    ['🛑 רגע אחרי שירדנו', 'העולם עומד.', 'אנחנו עדיין מסתובבים!', 1],
    ['⏳ אחרי חצי דקה על הקרקע', 'העולם עומד.', 'הנוזל נרגע: לא זזים.', 0],
  ]],
];
function initSick() {
  const caseHtml = ([name, eyes, ear, conflict]) => `
    <div class="bl-case ${conflict ? 'bad' : 'good'}">
      <div class="bl-case-title">${name}</div>
      <div class="bl-wit"><b>👀 העיניים:</b><span>${eyes}</span></div>
      <div class="bl-wit"><b>👂 האוזן הפנימית:</b><span>${ear}</span></div>
      <div class="bl-verdict ${conflict ? 'bad' : 'good'}">${conflict ? '🤢 סותרים זה את זה: סיכוי לבחילה' : '🙂 מסכימים: הכול בסדר'}</div>
    </div>`;
  $('bl-pairs').innerHTML = PAIRS.map(([title, cases]) => `
    <div class="bl-pair"><h4>${title}</h4><div class="bl-pair-row">${cases.map(caseHtml).join('')}</div></div>`).join('');
}

// ─────────────────────── Vection: the moving train ───────────────────────
function initVection() {
  const cv = $('bl-vection'), go = $('bl-vection-go'), speedIn = $('bl-vection-speed');
  const ctx = cv.getContext('2d');
  let running = false, x = 0, last = 0, full = false;
  // Random-width stripes, repeated, so the motion has no obvious rhythm
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stripes = [];
  for (let s = 0, pos = 0; s < 40; s++) { const w = 20 + rnd() * 70; stripes.push([pos, w]); pos += w * 2; }
  const period = stripes[stripes.length - 1][0] + stripes[stripes.length - 1][1] * 2;

  function draw() {
    const W = cv.width, H = cv.height;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    const k = H / 600, off = x % period;
    for (let base = -period; base < W / k + period; base += period) {
      for (const [p, w] of stripes) ctx.fillRect((base + p + off) * k, 0, w * k, H);
    }
    ctx.fillStyle = '#e11d48';
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 9 * k, 0, 2 * Math.PI); ctx.fill();
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (onScreen(cv) || full) { x = (x + speedIn.value * 40 * dt) % period; draw(); }
    requestAnimationFrame(frame);
  }
  go.addEventListener('click', () => {
    running = !running;
    go.textContent = running ? '⏸ עצירה' : '▶ הפעלה';
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });

  // Full screen, as in the vision section
  const stage = document.createElement('div');
  stage.className = 'vs-stage';
  stage.style.setProperty('--ill-bg', '#f8fafc');
  cv.replaceWith(stage);
  stage.appendChild(cv);
  const fs = document.createElement('button');
  fs.className = 'vs-fs';
  fs.textContent = '⛶ מסך מלא';
  stage.appendChild(fs);
  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (full) { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); } else { cv.width = 1200; cv.height = 600; }
    draw();
  }
  function exit() {
    if (!full) return;
    full = false;
    stage.classList.remove('vs-full');
    document.body.classList.remove('vs-noscroll');
    fs.textContent = '⛶ מסך מלא';
    size();
    if (document.fullscreenElement) document.exitFullscreen?.();
  }
  fs.addEventListener('click', async () => {
    if (full) { exit(); return; }
    full = true;
    stage.classList.add('vs-full');
    document.body.classList.add('vs-noscroll');
    fs.textContent = '✕ יציאה ממסך מלא';
    try { await stage.requestFullscreen?.(); } catch (e) { /* overlay only */ }
    size();
    if (!running) go.click();
  });
  document.addEventListener('fullscreenchange', () => { if (full && !document.fullscreenElement) exit(); else if (full) size(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') exit(); });
  draw();
}

// ─────────────────────── Init ───────────────────────
export function initBalance() {
  initPages();
  initCards();
  initScene();
  initEar();
  initCanal();
  initOtolith();
  initVOR();
  initStopwatch();
  initSensors();
  initSick();
  initVection();
}
