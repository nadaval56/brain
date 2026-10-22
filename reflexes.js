// Reflexes section: an animated reflex arc, knee and pupil simulators, baby
// reflexes, a reaction-time game and a quiz. Loaded the first time the tab opens.

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function svgPoint(svg, e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// Segmented buttons: mark the clicked one active and report its data-* values
function seg(el, onPick) {
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    onPick(b.dataset);
  }));
}
function clearSeg(el) { el.querySelectorAll('button').forEach(b => b.classList.remove('active')); }

function say(el, text, kind = '') {
  el.textContent = text;
  el.className = 'rx-msg' + (kind ? ' ' + kind : '');
}

const isVisible = () => !$('section-reflex').hidden;
// True when the element's sub-page is the one on screen
const onScreen = el => isVisible() && !el.closest('.rx-page').hidden;

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* storage blocked */ }
  return null;
}

// ─────────────────────── Sub-pages ───────────────────────
const PAGES = ['what', 'knee', 'pupil', 'baby', 'quiz'];
function initPages() {
  const tabs = $('rx-tabs'), pager = $('rx-pager');
  const pages = [...document.querySelectorAll('.rx-page')];
  const label = p => tabs.querySelector(`[data-page="${p}"]`).textContent;
  const fromHash = () => (PAGES.includes(location.hash.split('/')[1]) ? location.hash.split('/')[1] : 'what');

  function show(p, scroll) {
    pages.forEach(el => { el.hidden = el.dataset.page !== p; });
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.page === p));
    tabs.querySelector('.active').scrollIntoView({ inline: 'nearest', block: 'nearest' });
    const i = PAGES.indexOf(p), prev = PAGES[i - 1], next = PAGES[i + 1];
    pager.innerHTML =
      (prev ? `<button class="small-btn" data-page="${prev}">→ ${label(prev)}</button>` : '<span></span>') +
      (next ? `<button class="small-btn" data-page="${next}">${label(next)} ←</button>` : '<span></span>');
    if (location.hash !== '#reflexes/' + p) history.replaceState(null, '', '#reflexes/' + p);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) show(b.dataset.page, true); });
  pager.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) show(b.dataset.page, true); });
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#reflexes')) show(fromHash()); });
  show(fromHash());
}

// ─────────────────────── Reflex arc (hot stove) ───────────────────────
function initArc() {
  const svg = $('arc-svg');
  const paths = { sens: $('arc-path-sens'), motor: $('arc-path-motor'), up: $('arc-path-up') };
  const sparks = { sens: $('spark-sens'), motor: $('spark-motor'), up: $('spark-up') };
  const nerves = k => svg.querySelectorAll('.nerve.' + k);
  const fore = $('arc-fore'), muscle = $('arc-muscle'), ouch = $('arc-ouch');
  const clock = $('arc-clock'), msg = $('arc-msg'), btn = $('arc-go');

  // Real milliseconds after the touch (rough textbook values)
  const WIN = { sens: [0, 18], motor: [18, 40], up: [22, 250] };
  const MOVE = [40, 110], OUCH = 280, END = 420;
  const STAGES = [
    [0, '1. קולטנים בעור מרגישים חום. ההודעה רצה בעצב התחושה…'],
    [18, '2. בחוט השדרה ההודעה עוברת ישר לעצב התנועה, בלי לשאול את המוח!'],
    [40, '3. השריר מתכווץ והיד בורחת. עברו רק 40 אלפיות שנייה.'],
    [110, '4. היד כבר בטוחה… והמוח עדיין לא יודע מה קרה.'],
    [OUCH, "5. רק עכשיו ההודעה הגיעה למוח: אאוץ'! רק עכשיו מרגישים כאב."],
  ];
  let speed = 25, t0 = 0, raf = 0;

  function frame(now) {
    const ms = Math.max(0, now - t0) / speed;
    for (const k of Object.keys(WIN)) {
      const [a, b] = WIN[k];
      const on = ms >= a && ms <= b;
      sparks[k].style.display = on ? 'block' : 'none';
      nerves(k).forEach(n => n.classList.toggle('lit', on));
      if (on) {
        const p = paths[k], pt = p.getPointAtLength((ms - a) / (b - a) * p.getTotalLength());
        sparks[k].setAttribute('cx', pt.x); sparks[k].setAttribute('cy', pt.y);
      }
    }
    muscle.classList.toggle('on', ms >= MOVE[0] && ms < MOVE[1] + 60);
    const lift = ms < MOVE[0] ? 0 : ease(clamp((ms - MOVE[0]) / (MOVE[1] - MOVE[0]), 0, 1));
    fore.setAttribute('transform', `rotate(${-32 * lift} 440 206)`);
    ouch.classList.toggle('on', ms >= OUCH);
    clock.textContent = Math.round(Math.min(ms, END)) + ' ms';
    msg.textContent = STAGES.filter(s => ms >= s[0]).pop()[1];
    if (ms < END) raf = requestAnimationFrame(frame);
    else btn.textContent = '🔁 שוב';
  }

  btn.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    btn.textContent = '🔥 געו בכיריים';
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  });
  seg($('arc-speed'), d => { speed = +d.speed; });
}

// ─────────────────────── Knee jerk ───────────────────────
const GRADE_TEXT = ['0', '1+', '2+', '3+', '4+'];
function initKnee() {
  const svg = $('knee-svg'), stage = $('knee-stage');
  const shin = $('knee-shin'), hammer = $('knee-hammer'), swing = $('knee-hammer-swing');
  const quad = $('knee-quad'), msg = $('knee-msg');
  const traceLine = $('trace-line'), traceHit = $('trace-hit');
  const jBtn = $('knee-jendrassik'), resistIn = $('knee-resist');
  const TENDON = { x: 286, y: 214 }, PIVOT = '262 188';
  const LATENCY = 30, DURATION = 1000;

  let grade = 2, mystery = false, hidden = 2, jend = false, jTimer = 0, busy = false;
  svg.style.cursor = 'none';

  const rows = [...document.querySelectorAll('#knee-grades tr')];
  const markRow = g => rows.forEach(r => r.classList.toggle('on', +r.dataset.g === g));
  markRow(2);

  const alpha = (t, tau) => (t <= 0 ? 0 : (t / tau) * Math.exp(1 - t / tau));

  function kneeAngle(t, amp, clonus) {
    t -= LATENCY;
    if (t <= 0) return 0;
    let a = amp * alpha(t, 90);
    if (t > 120) a += amp * 0.18 * Math.exp(-t / 300) * Math.sin(2 * Math.PI * (t - 120) / 420);
    if (clonus) for (let k = 1; k <= 5; k++) a += amp * 0.45 * 0.85 ** k * alpha(t - k * 160, 60);
    return Math.max(0, a);
  }

  function moveHammer(e) {
    const p = svgPoint(svg, e);
    hammer.setAttribute('transform', `translate(${p.x},${p.y})`);
    hammer.style.opacity = 1;
    return p;
  }
  svg.addEventListener('pointermove', moveHammer);
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hammer.style.opacity = 0.35; });

  function setJend(on) {
    jend = on;
    jBtn.classList.toggle('active', on);
    clearTimeout(jTimer);
    if (on) jTimer = setTimeout(() => setJend(false), 5000);
  }
  jBtn.addEventListener('click', () => {
    setJend(true);
    say(msg, '🤝 המטופל משלב אצבעות ומושך חזק לצדדים… עכשיו מקישים! (יש לכם 5 שניות)');
  });

  function explain(g, amp, resist) {
    if (g === 0) return jend
      ? 'גם עם ינדרשיק אין תגובה (0). הקשת "נקטעה": בעצב, בשריר או בחוט השדרה.'
      : 'אין תגובה. לפני שקובעים "0" נסו גם את תרגיל ינדרשיק.';
    if (g === 1) return jend
      ? 'עם ינדרשיק הופיעה בעיטה! הרפלקס קיים, רק חלש (1+).'
      : 'בקושי זזה (1+). נסו עכשיו עם תרגיל ינדרשיק.';
    if (resist > 0.4 && !jend) return 'המטופל מתנגד, אז הבעיטה קטנה יותר. נסו את תרגיל ינדרשיק: הקשב הולך לידיים ופחות "שומר" על הרגל.';
    if (jend && resist > 0.4) return 'למרות ההתנגדות, עם ינדרשיק הבעיטה חזרה. המטופל עסוק בידיים ומפסיק לרסן את הרגל.';
    if (g === 2) return 'בעיטה תקינה (2+). בגרף רואים שהרגל מתחילה לזוז כ־30 אלפיות שנייה אחרי המכה.';
    if (g === 3) return 'בעיטה חזקה מהרגיל (3+). אולי ה"בלמים" מהמוח חלשים. משווים לרגל השנייה.';
    return 'בעיטה חזקה מאוד, ואחריה רעידות חוזרות: קלונוס (4+). סימן שהבלמים מהמוח לא מגיעים.';
  }

  function strike(p) {
    const d = Math.hypot(p.x - TENDON.x, p.y - TENDON.y);
    if (d > 17) {
      say(msg, d < 45 ? 'כמעט! פגעתם בעצם או בפיקה, לא בגיד. כוונו קצת מתחת לפיקת הברך.' : 'פספסתם. כוונו לגיד שמתחת לפיקת הברך (העיגול המהבהב).', 'bad');
      return;
    }
    const g = mystery ? hidden : grade;
    const resist = resistIn.value / 100;
    const base = [0, 4, 20, 34, 40][g];
    const resistF = 1 - 0.75 * resist * (jend ? 0.2 : 1);
    const jendF = jend ? (g === 1 ? 3.5 : 1.6) : 1;
    const amp = Math.min(48, base * resistF * jendF);
    const clonus = g === 4 && resist < 0.5;

    busy = true;
    svg.querySelectorAll('.nerve').forEach(n => n.classList.add('lit'));
    stage.classList.add('hide-target');
    traceHit.style.display = '';
    const pts = [];
    const t0 = performance.now();
    function frame(now) {
      const t = now - t0;
      const a = kneeAngle(t, amp, clonus);
      shin.setAttribute('transform', `rotate(${-a} ${PIVOT})`);
      swing.setAttribute('transform', `rotate(${t < 70 ? -18 * Math.sin(Math.PI * t / 70) : 0} 70 -62)`);
      quad.classList.toggle('on', amp > 0 && t > LATENCY && t < LATENCY + 200 + (clonus ? 700 : 0));
      if (t > 300) svg.querySelectorAll('.nerve').forEach(n => n.classList.remove('lit'));
      pts.push(`${12 + (Math.min(t, DURATION) / DURATION) * 378},${74 - a * 1.2}`);
      traceLine.setAttribute('points', pts.join(' '));
      if (t < DURATION) requestAnimationFrame(frame);
      else {
        busy = false;
        shin.removeAttribute('transform');
        stage.classList.remove('hide-target');
        if (jend) setJend(false);
      }
    }
    requestAnimationFrame(frame);
    say(msg, mystery ? 'הקשתם. אפשר להקיש שוב, לנסות התנגדות או ינדרשיק, ואז לבחור דרגה.' : explain(g, amp, resist));
  }

  svg.addEventListener('pointerdown', e => {
    if (busy) return;
    strike(moveHammer(e));
  });

  seg($('knee-patient'), d => {
    grade = +d.g; mystery = false;
    stage.classList.remove('mystery');
    markRow(grade);
    say(msg, `מטופל עם רפלקס ${GRADE_TEXT[grade]}. הקישו על הגיד.`);
  });

  $('knee-mystery').addEventListener('click', () => {
    mystery = true;
    hidden = Math.floor(Math.random() * 5);
    stage.classList.add('mystery');
    clearSeg($('knee-patient'));
    markRow(-1);
    say(msg, '🕵️ מטופל חדש נכנס. הקישו, נסו התנגדות או ינדרשיק, ונחשו את הדרגה.');
  });

  $('knee-guess').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const g = +b.dataset.guess;
    if (g === hidden) {
      say(msg, `נכון! הדרגה היא ${GRADE_TEXT[hidden]}. ` + (hidden === 1 ? 'שמתם לב כמה ינדרשיק עזר?' : 'רוצים עוד אחד? לחצו "מטופל מסתורי".'), 'good');
      mystery = false;
      stage.classList.remove('mystery');
      grade = hidden;
      markRow(hidden);
      $('knee-patient').querySelector(`[data-g="${hidden}"]`).classList.add('active');
    } else {
      say(msg, `לא ${GRADE_TEXT[g]}. הקישו שוב, השוו לגובה בגרף ונסו שוב.`, 'bad');
    }
  }));
}

// ─────────────────────── Pupils ───────────────────────
function initPupils() {
  const svg = $('eye-svg'), msg = $('eye-msg');
  const EYES = { R: { x: 150, y: 118 }, L: { x: 410, y: 118 } };
  const pupils = { R: $('pupil-R'), L: $('pupil-L') };
  const reads = { R: $('read-R'), L: $('read-L') };
  const torch = $('torch'), dark = $('eye-dark'), roomIn = $('eye-room');
  const LATENCY = 0.2, TAU_IN = 0.3, TAU_OUT = 1.5;

  let patient = 'ok', mystery = false, hidden = 'ok';
  let flash = null, litEye = null;
  const mm = { R: 5.5, L: 5.5 };
  const history = [];
  let last = performance.now();

  const TIPS = {
    ok: { R: 'מאירים לעין הימנית, ושני האישונים מצטמצמים יחד, גם זה שבחושך!', L: 'מאירים לעין השמאלית, ושני האישונים מצטמצמים יחד.' },
    optic: { R: 'מאירים לעין הימנית… והאישונים כמעט לא מגיבים. ההודעה על האור לא יוצאת מהעין הזו.', L: 'מאירים לעין השמאלית: שני האישונים מצטמצמים, גם הימני! אז הפקודה לכווץ אותו עובדת.' },
    cn3: { R: 'מאירים לעין הימנית: הימני מצטמצם, אבל השמאלי נשאר רחב.', L: 'מאירים לעין השמאלית: הימני מצטמצם, אז העין השמאלית "רואה" את האור. אבל האישון השמאלי לא מקבל את הפקודה.' },
  };

  function targets(room) {
    const p = mystery ? hidden : patient;
    let drive = 0;
    for (const k of ['R', 'L']) {
      let lit = 0;
      if (flash) lit = clamp(1 - (Math.hypot(flash.x - EYES[k].x, flash.y - EYES[k].y) - 40) / 70, 0, 1);
      const light = room * 0.6 + lit * 1.2;
      if (!(p === 'optic' && k === 'R')) drive += light;
    }
    const t = 2 + 5.8 * Math.exp(-1.3 * drive);
    return { R: t, L: p === 'cn3' ? 7.6 : t };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!onScreen(svg)) return;
    const room = roomIn.value / 100;
    history.push({ t: now, v: targets(room) });
    while (history.length > 1 && history[1].t <= now - LATENCY * 1000) history.shift();
    const tgt = history[0].v;
    for (const k of ['R', 'L']) {
      const tau = tgt[k] < mm[k] ? TAU_IN : TAU_OUT;
      mm[k] += (tgt[k] - mm[k]) * (1 - Math.exp(-dt / tau));
      pupils[k].setAttribute('r', (mm[k] * 5.5).toFixed(2));
      reads[k].textContent = mm[k].toFixed(1) + ' mm';
    }
    dark.setAttribute('opacity', (0.55 * (1 - room)).toFixed(2));
  }
  requestAnimationFrame(frame);

  function point(e) {
    flash = svgPoint(svg, e);
    torch.style.display = '';
    torch.setAttribute('transform', `translate(${flash.x},${flash.y})`);
    const near = ['R', 'L'].find(k => Math.hypot(flash.x - EYES[k].x, flash.y - EYES[k].y) < 60) || null;
    if (near !== litEye) {
      litEye = near;
      if (near && !mystery) say(msg, TIPS[patient][near]);
    }
  }
  function off() { flash = null; litEye = null; torch.style.display = 'none'; }
  svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) point(e); });
  svg.addEventListener('pointerdown', point);
  svg.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') off(); });
  svg.addEventListener('pointerleave', off);
  svg.addEventListener('pointercancel', off);

  const INTRO = {
    ok: 'מטופל תקין. האירו לכל עין בנפרד ושימו לב לשני האישונים.',
    optic: 'עצב הראייה הימני פגוע: העין הימנית לא מעבירה למוח הודעה על אור. האירו לכל עין בנפרד.',
    cn3: 'העצב שמכווץ את האישון השמאלי פגוע (עצב גולגולתי 3). האירו לכל עין בנפרד.',
  };
  seg($('eye-patient'), d => {
    patient = d.p; mystery = false;
    svg.closest('.rx-stage').classList.remove('mystery');
    say(msg, INTRO[patient]);
  });
  $('eye-mystery').addEventListener('click', () => {
    mystery = true;
    hidden = ['ok', 'optic', 'cn3'][Math.floor(Math.random() * 3)];
    svg.closest('.rx-stage').classList.add('mystery');
    clearSeg($('eye-patient'));
    say(msg, '🕵️ מטופל מסתורי. האירו לכל עין בנפרד, הסתכלו על שני האישונים, ונחשו מה הבעיה.');
  });
  $('eye-guess').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.guess === hidden) {
      say(msg, 'נכון! ' + INTRO[hidden], 'good');
      mystery = false; patient = hidden;
      svg.closest('.rx-stage').classList.remove('mystery');
      $('eye-patient').querySelector(`[data-p="${hidden}"]`).classList.add('active');
    } else {
      say(msg, 'לא בדיוק. האירו שוב לכל עין בנפרד והשוו את שני האישונים בכל פעם.', 'bad');
    }
  }));
}

// ─────────────────────── Baby reflexes ───────────────────────
function initGrasp() {
  const svg = $('grasp-svg'), hand = $('grasp-hand'), finger = $('adult-finger'), msg = $('grasp-msg');
  const fingers = [...svg.querySelectorAll('.finger:not(.thumb)')], thumb = svg.querySelector('.thumb');
  const PALM = { x0: 124, x1: 236, y0: 158, y1: 252 };
  let gripped = false, gripY = 0, gripTimer = 0, releaseTimer = 0;

  function grip(on) {
    gripped = on;
    fingers.forEach(f => { f.style.transform = on ? 'scaleY(-0.55)' : ''; });
    thumb.style.transform = on ? 'rotate(40deg)' : 'rotate(-35deg)';
    if (!on) {
      hand.removeAttribute('transform');
      finger.setAttribute('transform', 'translate(330,70)');
    }
  }

  function move(e) {
    clearTimeout(releaseTimer);
    const p = svgPoint(svg, e);
    if (gripped) {
      if (p.x < 90 || p.x > 280) { grip(false); say(msg, 'שחררתם בכוח. נסו שוב!'); return; }
      const dy = clamp(p.y - gripY, -80, 0);
      hand.setAttribute('transform', `translate(0,${dy})`);
      finger.setAttribute('transform', `translate(${p.x - 6},${gripY})`);
      if (dy < -45) say(msg, '💪 וואו, איזו אחיזה! התינוק כמעט נתלה על האצבע.', 'good');
      return;
    }
    finger.setAttribute('transform', `translate(${p.x - 6},${p.y})`);
    const inPalm = p.x > PALM.x0 && p.x < PALM.x1 && p.y > PALM.y0 && p.y < PALM.y1;
    if (inPalm && !gripTimer) {
      gripTimer = setTimeout(() => {
        gripTimer = 0;
        gripY = p.y;
        grip(true);
        say(msg, '✊ תפס! עכשיו גררו למעלה ותראו כמה האחיזה חזקה.');
      }, 140);
    } else if (!inPalm && gripTimer) {
      clearTimeout(gripTimer); gripTimer = 0;
    }
  }
  function leave() {
    clearTimeout(gripTimer); gripTimer = 0;
    releaseTimer = setTimeout(() => {
      if (gripped) say(msg, 'האצבעות נפתחו. רוצים שוב? הכניסו את האצבע לכף היד.');
      grip(false);
    }, 700);
  }
  svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) move(e); });
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture?.(e.pointerId); move(e); });
  svg.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); });
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') leave(); });
}

function initStepping() {
  const svg = $('step-svg'), baby = $('step-baby'), btn = $('step-btn');
  let down = false, timer = 0;
  btn.addEventListener('click', () => {
    down = !down;
    clearTimeout(timer);
    baby.style.transform = `translateY(${down ? 10 : -50}px)`;
    svg.classList.toggle('down', down);
    btn.textContent = down ? '⬆️ הרימו את התינוק' : '⬇️ הניחו את כפות הרגליים על הרצפה';
    if (down) timer = setTimeout(() => svg.classList.add('stepping'), 550);
    else svg.classList.remove('stepping');
  });
}

function initMoro() {
  const svg = $('moro-svg');
  let timer = 0;
  $('moro-btn').addEventListener('click', () => {
    clearTimeout(timer);
    svg.classList.remove('moro', 'shake');
    void svg.getBoundingClientRect(); // restart the CSS animations
    svg.classList.add('moro', 'shake');
    timer = setTimeout(() => svg.classList.remove('moro', 'shake'), 1900);
  });
}

function initBabinski() {
  const svg = $('babinski-svg'), stick = $('stick'), msg = $('babinski-msg');
  const big = $('toe-big'), small = $('toe-small'), fan = $('toe-fan'), trail = $('bab-trail');
  let who = 'baby', busy = false, relax = 0;
  const RESULT = {
    baby: ['הבוהן עלתה למעלה והאצבעות נפרשו כמו מניפה. אצל תינוק זה תקין: המסלולים מהמוח עדיין מתבגרים.', 'good'],
    adult: ['האצבעות התכופפו למטה. זו התגובה התקינה של מבוגר.', 'good'],
    damage: ['הבוהן עלתה למעלה! אצל מבוגר זה "סימן בבינסקי": ייתכן שיש פגיעה במסלול שיורד מהמוח לחוט השדרה.', 'bad'],
  };

  function setToes(state) {
    const up = state === 'up', downward = state === 'down';
    big.style.transform = up ? 'rotate(-38deg)' : downward ? 'rotate(22deg)' : '';
    small.style.transform = up ? 'rotate(-10deg)' : downward ? 'rotate(22deg)' : '';
    fan.setAttribute('opacity', up ? 1 : 0);
  }

  function stroke() {
    if (busy) return;
    busy = true;
    clearTimeout(relax);
    setToes('rest');
    stick.style.display = '';
    const t0 = performance.now();
    (function frame(now) {
      const f = clamp((now - t0) / 1000, 0, 1), e = ease(f);
      const sx = 100 + 190 * e, sy = 190 - 8 * e;
      stick.setAttribute('transform', `translate(${sx},${sy})`);
      trail.setAttribute('x2', sx); trail.setAttribute('y2', sy + 2);
      if (f < 1) return requestAnimationFrame(frame);
      stick.style.display = 'none';
      setToes(who === 'adult' ? 'down' : 'up');
      say(msg, ...RESULT[who]);
      busy = false;
      relax = setTimeout(() => { setToes('rest'); trail.setAttribute('x2', 100); trail.setAttribute('y2', 192); }, 3000);
    })(t0);
  }
  $('babinski-btn').addEventListener('click', stroke);
  svg.addEventListener('click', stroke);
  seg($('babinski-who'), d => {
    who = d.who;
    setToes('rest');
    say(msg, { baby: 'תינוק בן כמה חודשים. גרדו את הסוליה.', adult: 'מבוגר בריא. גרדו את הסוליה.', damage: 'מבוגר אחרי פגיעה במוח או בחוט השדרה. גרדו את הסוליה.' }[who]);
  });
}

function initRooting() {
  const svg = $('root-svg'), head = $('root-head'), face = $('root-face'), mouth = $('root-mouth');
  const finger = $('root-finger'), msg = $('root-msg');
  let timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  function reset() {
    head.style.transform = ''; face.style.transform = ''; mouth.style.transform = '';
    finger.style.display = 'none';
  }
  function touch(side) {
    timers.forEach(clearTimeout); timers = [];
    reset();
    // The finger points at the stroked cheek from outside the face
    finger.setAttribute('transform', `translate(${180 + side * 48},158) scale(${side},1)`);
    finger.style.display = '';
    say(msg, 'מלטפים את הלחי…');
    later(300, () => {
      head.style.transform = `translateX(${side * 10}px) rotate(${side * 9}deg)`;
      face.style.transform = `translateX(${side * 16}px)`;
      mouth.style.transform = 'scaleY(3.2)';
      say(msg, 'התינוק סובב את הראש לכיוון המגע ופתח את הפה. הוא "מחפש" אוכל.', 'good');
    });
    later(2600, reset);
  }
  svg.addEventListener('click', e => {
    const hit = e.target.closest('.root-hit');
    if (hit) touch(+hit.dataset.side);
  });
}

function initTimeline() {
  const ROWS = [
    ['הליכה', 2], ['חיפוש אוכל', 4], ['מורו', 5], ['אחיזה ביד', 6], ['הסייף', 6], ['אחיזה בכף הרגל', 12], ['בבינסקי', 18],
  ];
  $('timeline').innerHTML = ROWS.map(([name, m]) => `
    <div class="tl-row" title="נעלם בערך בגיל ${m} חודשים">
      <span>${name}</span>
      <div class="tl-track"><div class="tl-bar" style="width:${(m / 24) * 100}%"></div></div>
    </div>`).join('');
}

// ─────────────────────── Reaction-time game ───────────────────────
function initGame() {
  const pad = $('rt-pad'), msg = $('rt-msg'), bars = $('rt-bars');
  const TRIES = 5;
  const REF = [
    { name: 'רפלקס הברך', ms: 30, cls: 'reflex' },
    { name: 'מצמוץ כשנוגעים בעין', ms: 40, cls: 'reflex' },
    { name: 'אישון לאור (רפלקס איטי)', ms: 220, cls: 'reflex' },
  ];
  let state = 'idle', timer = 0, goAt = 0, times = [];

  function drawBars() {
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
    const rows = [...REF, { name: times.length >= TRIES ? 'אתם (ממוצע)' : 'אתם', ms: avg, cls: 'you' }];
    const max = Math.max(500, avg || 0);
    bars.innerHTML = rows.map(r => `
      <div class="rt-bar ${r.cls}">
        <span>${r.name}</span>
        <div class="track"><div class="fill" style="width:${r.ms ? (r.ms / max) * 100 : 0}%"></div></div>
        <span class="val">${r.ms ? Math.round(r.ms) + ' ms' : '–'}</span>
      </div>`).join('');
  }

  function show(cls, html) { pad.className = 'rt-pad ' + cls; pad.innerHTML = html; }

  function press() {
    if (state === 'idle' || state === 'result' || state === 'early') {
      if (times.length >= TRIES) times = [];
      state = 'wait';
      show('wait', 'חכו לירוק…<small>אל תלחצו עדיין</small>');
      timer = setTimeout(() => {
        state = 'go';
        goAt = performance.now();
        show('go', 'עכשיו!');
      }, 1500 + Math.random() * 2500);
    } else if (state === 'wait') {
      clearTimeout(timer);
      state = 'early';
      show('early', 'מוקדם מדי! 😅<small>לחצו כדי לנסות שוב</small>');
    } else if (state === 'go') {
      const rt = performance.now() - goAt;
      times.push(rt);
      state = 'result';
      const done = times.length >= TRIES;
      show('', `${Math.round(rt)} ms<small>${done ? 'סיימתם! לחצו לסבב חדש' : 'לחצו לניסיון הבא'}</small>`);
      const best = Math.min(...times);
      if (done) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        say(msg, `הממוצע שלכם: ${Math.round(avg)} ms. הכי מהיר: ${Math.round(best)} ms. רפלקס הברך מהיר מכם פי ${Math.round(avg / 30)}, כי הוא לא עובר דרך המוח.`, 'good');
      } else {
        say(msg, `ניסיון ${times.length} מתוך ${TRIES}: ${times.map(t => Math.round(t)).join(' · ')}`);
      }
      drawBars();
    }
  }

  pad.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
  document.addEventListener('keydown', e => {
    if (!onScreen(pad) || e.code !== 'Space' || e.repeat) return;
    const r = pad.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return; // only while the pad is on screen
    e.preventDefault();
    press();
  });
  drawBars();

  const ruler = $('ruler'), out = $('ruler-out');
  const showRuler = () => {
    const cm = +ruler.value;
    out.textContent = `${cm} cm → ${Math.round(Math.sqrt((2 * cm / 100) / 9.81) * 1000)} ms`;
  };
  ruler.addEventListener('input', showRuler);
  showRuler();
}

// ─────────────────────── Classroom labs ───────────────────────
function initKneeLab() {
  const box = $('knee-lab'), bars = $('knee-lab-bars'), msg = $('knee-lab-msg');
  const ROWS = [['normal', 'א׳ רגיל'], ['resist', 'ב׳ מתנגדים'], ['jend', 'ג׳ ינדרשיק']];
  const KEY = 'rx-knee-lab';
  let data = store(KEY) || {};
  const avg = k => {
    const v = (data[k] || []).filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  function draw() {
    box.innerHTML = `<table class="lab-table"><tr><th>ניסוי</th><th>1</th><th>2</th><th>3</th><th>ממוצע</th></tr>` +
      ROWS.map(([k, name]) => `<tr><td>${name}</td>` +
        [0, 1, 2].map(i => `<td><button class="lab-cell" data-k="${k}" data-i="${i}">${data[k]?.[i] ?? '–'}</button></td>`).join('') +
        `<td class="lab-avg">${avg(k) == null ? '–' : avg(k).toFixed(1)}</td></tr>`).join('') + '</table>';
    bars.innerHTML = ROWS.map(([k, name]) => `
      <div class="rt-bar ${k === 'jend' ? 'reflex' : 'you'}">
        <span>${name}</span>
        <div class="track"><div class="fill" style="width:${((avg(k) || 0) / 3) * 100}%"></div></div>
        <span class="val">${avg(k) == null ? '–' : avg(k).toFixed(1)}</span>
      </div>`).join('');
    const [n, r, j] = ROWS.map(([k]) => avg(k));
    if (n == null || r == null || j == null) say(msg, 'מלאו את שלושת הניסויים ותראו מה השתנה.');
    else if (r < n && j > r) say(msg, `כמו בספר: כשהנבדק התנגד הבעיטה ירדה ל־${r.toFixed(1)}, ועם ינדרשיק עלתה ל־${j.toFixed(1)}.`, 'good');
    else say(msg, 'התוצאות לא כמו בספר? זה קורה! נסו שוב, ושימו לב שהנבדק באמת רפוי בניסוי א׳ ומושך חזק בניסוי ג׳.');
  }
  box.addEventListener('click', e => {
    const b = e.target.closest('.lab-cell');
    if (!b) return;
    const row = data[b.dataset.k] || (data[b.dataset.k] = [null, null, null]);
    const v = row[b.dataset.i];
    row[b.dataset.i] = v == null ? 0 : v >= 3 ? null : v + 1;
    store(KEY, data);
    draw();
  });
  $('knee-lab-reset').addEventListener('click', () => { data = {}; store(KEY, data); draw(); });
  draw();
}

function initPupilLab() {
  const box = $('pupil-lab'), gauge = $('pupil-gauge'), msg = $('pupil-lab-msg');
  const ROWS = [['cover', 'א׳ יד על העין', 'מתחת ליד', 'אחרי שנייה'], ['other', 'ב׳ העין השנייה', 'לפני', 'אחרי'], ['near', 'ג׳ רחוק וקרוב', 'רחוק', 'קרוב']];
  const KEY = 'rx-pupil-lab';
  let data = store(KEY) || {}, sel = null;

  gauge.innerHTML = [2, 3, 4, 5, 6, 7, 8].map(mm =>
    `<button data-mm="${mm}" aria-label="${mm} מילימטר"><i style="width:${mm}mm;height:${mm}mm"></i>${mm} mm</button>`).join('');

  function draw() {
    box.innerHTML = '<table class="lab-table">' + ROWS.map(([k, name, a, b]) => `
      <tr><td>${name}</td>
        <td><button class="lab-cell${sel === k + '0' ? ' sel' : ''}" data-c="${k}0">${data[k + '0'] ? data[k + '0'] + ' mm' : a}</button></td>
        <td><button class="lab-cell${sel === k + '1' ? ' sel' : ''}" data-c="${k}1">${data[k + '1'] ? data[k + '1'] + ' mm' : b}</button></td>
      </tr>`).join('') + '</table>';
  }
  box.addEventListener('click', e => {
    const b = e.target.closest('.lab-cell');
    if (!b) return;
    sel = b.dataset.c;
    draw();
    say(msg, 'עכשיו לחצו על העיגול שהכי דומה לאישון.');
  });
  gauge.addEventListener('click', e => {
    const b = e.target.closest('[data-mm]');
    if (!b) return;
    if (!sel) { say(msg, 'קודם בחרו משבצת בטבלה.'); return; }
    data[sel] = +b.dataset.mm;
    store(KEY, data);
    const k = sel.slice(0, -1), row = ROWS.find(r => r[0] === k);
    const a = data[k + '0'], c = data[k + '1'];
    if (sel.endsWith('0')) { sel = k + '1'; say(msg, `נרשם. עכשיו "${row[3]}".`); }
    else {
      sel = null;
      say(msg, a && c ? (c < a ? `${row[1]}: האישון הצטמצם מ־${a} ל־${c} מ״מ. 👍` : `${row[1]}: האישון לא הצטמצם (${a} → ${c} מ״מ). נסו שוב, ובדקו מקרוב.`) : 'נרשם.', a && c && c < a ? 'good' : '');
    }
    draw();
  });
  $('pupil-lab-reset').addEventListener('click', () => { data = {}; sel = null; store(KEY, data); draw(); say(msg, 'בחרו משבצת כדי להתחיל.'); });
  draw();
}

// ─────────────────────── Quiz: flip cards ───────────────────────
const QUIZ = [
  { e: '🤧', q: 'עיטוש כשמשהו מדגדג באף', a: true, why: 'גזע המוח מפעיל את העיטוש כדי לנקות את האף, ואי אפשר באמת לעצור אותו באמצע.' },
  { e: '🚲', q: 'לרכוב על אופניים בלי לחשוב', a: false, why: 'מיומנות נלמדת שנהייתה אוטומטית. המוח הגדול והמוח הקטן עובדים קשה.' },
  { e: '⚾', q: 'למצמץ כשכדור עף לכיוון הפנים', a: true, why: 'רפלקס הגנה. העפעף נסגר לפני שהספקתם להחליט.' },
  { e: '📱', q: 'לענות לטלפון כשהוא מצלצל', a: false, why: 'שומעים, מזהים ומחליטים, גם אם זה קורה מהר.' },
  { e: '🥶', q: 'עור ברווז כשקר', a: true, why: 'רפלקס של מערכת העצבים האוטונומית: שרירים זעירים מרימים את השערות.' },
  { e: '🐶', q: 'הכלב של פבלוב מריר כשהוא שומע פעמון', a: true, why: 'כן, אבל מיוחד: "רפלקס מותנה". הכלב למד לקשר את הפעמון לאוכל. רפלקס רגיל הוא מולד, ואת זה הוא למד.' },
  { e: '😷', q: 'שיעול כשמשהו נכנס לקנה הנשימה', a: true, why: 'רפלקס שמגן על הריאות. אפשר גם להשתעל בכוונה, אבל זה כבר לא רפלקס.' },
  { e: '⚽', q: 'לבעוט בכדור שמגיע אליכם במשחק', a: false, why: 'רואים, מחשבים ומחליטים. אימון הופך את זה למהיר, אבל זה לא רפלקס.' },
  { e: '👅', q: 'הפה מתמלא רוק כשאוכל נוגע בלשון', a: true, why: 'רפלקס מולד: הבלוטות מתחילות לעבוד מיד כשמשהו נוגע בלשון.' },
  { e: '🧅', q: 'דמעות כשחותכים בצל', a: true, why: 'חומר מגרה מהבצל מגיע לעין, ובלוטות הדמעות שוטפות אותה אוטומטית.' },
  { e: '⌨️', q: 'להקליד סיסמה בלי להסתכל על המקלדת', a: false, why: '"זיכרון שריר": תנועה שתרגלתם הרבה פעמים. היא נלמדה, ולכן היא לא רפלקס.' },
  { e: '😱', q: 'לקפוץ כשמישהו מבהיל אתכם מאחור', a: true, why: 'רפלקס הבהלה. קרוב משפחה בוגר של רפלקס מורו של תינוקות.' },
  { e: '☀️', q: 'האישונים מצטמצמים כשיוצאים לשמש', a: true, why: 'רפלקס האישון. בדקו בעמוד "האישון" איך הוא עובד.' },
  { e: '✋', q: 'להרים יד כשהמורה שואלת שאלה', a: false, why: 'החלטה: שומעים, יודעים את התשובה ובוחרים להרים יד.' },
];
function initQuiz() {
  const box = $('quiz'), score = $('quiz-score'), note = $('quiz-mode-note');
  let mode = 'play', right = 0, answered = 0, order = [];

  function deal() {
    order = QUIZ.map((_, i) => i).sort(() => Math.random() - 0.5);
    right = 0; answered = 0;
    score.textContent = '';
    box.innerHTML = order.map(i => {
      const it = QUIZ[i];
      return `
      <div class="flip" data-i="${i}">
        <div class="flip-inner">
          <div class="face front" role="button" tabindex="0">
            <div class="emoji">${it.e}</div>
            <div class="q">${it.q}</div>
            <div class="ans">
              <button class="small-btn" data-a="1">⚡ רפלקס</button>
              <button class="small-btn" data-a="0">🧠 לא רפלקס</button>
            </div>
            <div class="tap">לחצו כדי להפוך</div>
          </div>
          <div class="face back ${it.a ? 'yes' : 'no'}">
            <div class="mark"></div>
            <div class="verdict">${it.a ? '⚡ כן, זה רפלקס' : '🧠 לא רפלקס'}</div>
            <div class="why">${it.why}</div>
            <button class="small-btn back-btn">↩ הפכו חזרה</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  box.addEventListener('click', e => {
    const card = e.target.closest('.flip');
    if (!card) return;
    const it = QUIZ[+card.dataset.i];
    if (e.target.closest('.back-btn')) { card.classList.remove('flipped'); return; }
    const pick = e.target.closest('[data-a]');
    if (mode === 'play' && pick && !card.dataset.done) {
      const ok = (pick.dataset.a === '1') === it.a;
      card.dataset.done = 1;
      const mark = card.querySelector('.mark');
      mark.textContent = ok ? '✅ צדקתם!' : '❌ לא הפעם';
      mark.className = 'mark ' + (ok ? 'right' : 'wrong');
      answered++; if (ok) right++;
      score.textContent = `${right} / ${answered}` + (answered === QUIZ.length ? (right === QUIZ.length ? ' 🏆 מושלם!' : ' סיימתם!') : '');
      card.classList.add('flipped');
    } else if (mode === 'class' && e.target.closest('.front')) {
      card.classList.add('flipped');
    } else if (card.dataset.done && e.target.closest('.front')) {
      card.classList.add('flipped');
    }
  });
  box.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && mode === 'class' && e.target.classList.contains('front')) {
      e.preventDefault();
      e.target.closest('.flip').classList.add('flipped');
    }
  });
  seg($('quiz-mode'), d => {
    mode = d.mode;
    box.classList.toggle('class-mode', mode === 'class');
    note.textContent = mode === 'class'
      ? 'במצב כיתה אין כפתורים: הכיתה מצביעה, ואז לוחצים על הכרטיס כדי לגלות את התשובה.'
      : 'במצב משחק עונים בכפתורים וצוברים נקודות.';
    deal();
  });
  $('quiz-shuffle').addEventListener('click', deal);
  deal();
}

// ─────────────────────── Init ───────────────────────
export function initReflexes() {
  initPages();
  initArc();
  initKnee();
  initPupils();
  initGrasp();
  initStepping();
  initMoro();
  initBabinski();
  initRooting();
  initTimeline();
  initGame();
  initKneeLab();
  initPupilLab();
  initQuiz();
}
