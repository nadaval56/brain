// 3D brain viewer: rotate, zoom, explode into layers, tap a part for its name + explanation.
// Model: Anderson M. Winkler, "Brain for Blender" (brainder.org), CC BY-SA 3.0 —
// merged into lobes / structures and decimated into assets/brain.glb.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─────────────────────── Parts ───────────────────────
// outer = cortex (the wrinkled surface); inner = deep structures
const PARTS = {
  frontal: {
    name: 'האונה המצחית', color: '#4f8ef7', outer: true,
    text: 'ה"מנהל" של המוח: מתכננת, מקבלת החלטות, שומרת על ריכוז ועוצרת תגובות אוטומטיות. היא זו שעובדת קשה בדף ב\' של מבחן סטרופ – כדי לא לקרוא את המילה!',
  },
  motor: {
    name: 'קליפת המוח המוטורית', color: '#ff9f43', outer: true,
    text: 'רצועה ששולחת פקודות לשרירים – להזיז יד, רגל או לשון. צד ימין של המוח מזיז את צד שמאל של הגוף, ולהפך.',
  },
  sensory: {
    name: 'קליפת המוח החושית', color: '#ffd23f', outer: true,
    text: 'רצועה שנמצאת ממש מאחורי המוטורית ומקבלת תחושות מכל הגוף: מגע, חום, קור וכאב. לאצבעות ולשפתיים יש בה הרבה מקום.',
  },
  parietal: {
    name: 'האונה הקודקודית', color: '#3ecf6e', outer: true,
    text: 'מחברת את המידע מהחושים לתמונה אחת: איפה הגוף שלי נמצא, איפה הדברים סביבי, וגם עוזרת בחשבון.',
  },
  temporal: {
    name: 'האונה הרקתית', color: '#e66fd2', outer: true,
    text: 'נמצאת מעל האוזניים: שמיעה, הבנת מילים ושפה, זיהוי פנים, ועוזרת לשמור זיכרונות.',
  },
  occipital: {
    name: 'האונה העורפית', color: '#9b7bf2', outer: true,
    text: 'מרכז הראייה של המוח, בחלק האחורי של הראש. כאן המוח מפענח צורות, תנועה וצבעים – כמו צבע הדיו במבחן סטרופ.',
  },
  cingulate: {
    name: 'הפיתול החגורתי', color: '#ff7b7b', outer: true,
    text: 'מסתתר בצד הפנימי של כל חצי מוח. מזהה התנגשויות וטעויות ("רגע, משהו פה לא מסתדר!") – והוא פעיל במיוחד במבחן סטרופ.',
  },
  insula: {
    name: 'האינסולה', color: '#2ed3c6', outer: true,
    text: 'אונה קטנה שמוסתרת עמוק בתוך קפל בצד המוח. מרגישה מה קורה בתוך הגוף: רעב, דופק, נשימה – וגם רגשות כמו גועל.',
  },
  amygdala: {
    name: 'האמיגדלה', color: '#ff2d2d', outer: false,
    text: 'בגודל ובצורה של שקד. "מערכת האזעקה" של המוח: מזהה סכנה במהירות ומפעילה פחד ותגובת "הילחם או ברח". קשורה גם לרגשות חזקים.',
  },
  hippocampus: {
    name: 'ההיפוקמפוס', color: '#ffb000', outer: false,
    text: 'השם שלו ביוונית הוא "סוסון ים" בגלל הצורה. הופך חוויות של היום לזיכרונות שנשארים, ועוזר לנו לזכור את הדרך.',
  },
  thalamus: {
    name: 'התלמוס', color: '#00c2ff', outer: false,
    text: '"תחנת הממסר" של המוח: כמעט כל מידע מהחושים (חוץ מריח) עובר דרכו בדרך לקליפת המוח.',
  },
  basalganglia: {
    name: 'גרעיני הבסיס', color: '#a3e635', outer: false,
    text: 'קבוצת גרעינים שעוזרת לבחור איזו תנועה לעשות ולהתחיל אותה, ושומרת הרגלים – כמו רכיבה על אופניים בלי לחשוב.',
  },
  cerebellum: {
    name: 'המוח הקטן', color: '#c98a55', outer: false,
    text: 'בחלק האחורי התחתון. אחראי על שיווי משקל ותיאום תנועות מדויק. למרות שהוא קטן – יש בו יותר ממחצית תאי העצב של המוח!',
  },
  brainstem: {
    name: 'גזע המוח', color: '#94a3b8', outer: false,
    text: 'מחבר את המוח לחוט השדרה. שולט בדברים שקורים לבד: נשימה, דופק, בליעה ושינה.',
  },
  corpuscallosum: {
    name: 'הגוף המסוייד', color: '#f1f1f1', outer: false,
    text: 'גשר של מיליוני סיבי עצב שמחבר בין חצי המוח הימני לשמאלי, כדי ששניהם יעבדו ביחד.',
  },
  ventricles: {
    name: 'חדרי המוח', color: '#5ab8ff', outer: false,
    text: 'חללים בתוך המוח שמלאים בנוזל שקוף. הנוזל מגן על המוח כמו כרית ומביא לו חומרים.',
  },
};

const keyOf = name => name.replace(/_(L|R|mid)$/, '');
const sideOf = name => (name.endsWith('_L') ? 'L' : name.endsWith('_R') ? 'R' : null);
const SIDE_TEXT = { L: 'חצי המוח השמאלי', R: 'חצי המוח הימני' };

// ─────────────────────── State ───────────────────────
let renderer, scene, camera, controls, stage;
const meshes = [];
let selectedKey = null, selectedSide = null, hoverKey = null;
let explode = 0;
const shown = new Set(Object.keys(PARTS)); // parts ticked in the list
let hemi = 'both';
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const HOME = new THREE.Vector3(-250, 90, -170);

export function initBrain() {
  stage = document.getElementById('brain-stage');

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  stage.prepend(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 1, 3000);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334055, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(120, 200, 260);
  camera.add(key); // light follows the view so the front is always lit

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 90;
  controls.maxDistance = 900;
  controls.autoRotateSpeed = 1.5;

  new ResizeObserver(resize).observe(stage);
  resize();
  homeView();

  new GLTFLoader().load('assets/brain.glb', gltf => {
    gltf.scene.traverse(obj => {
      if (!obj.isMesh) return;
      const k = keyOf(obj.name);
      const part = PARTS[k];
      if (!part) return;
      obj.geometry.computeVertexNormals();
      obj.geometry.computeBoundingSphere();
      obj.material = new THREE.MeshStandardMaterial({
        color: part.color, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide,
      });
      obj.userData = { key: k, side: sideOf(obj.name), outer: part.outer,
                       center: obj.geometry.boundingSphere.center.clone() };
      meshes.push(obj);
    });
    scene.add(gltf.scene);
    document.getElementById('brain-status').remove();
    applyLayers();
  }, undefined, err => {
    console.error(err);
    document.getElementById('brain-status').textContent = 'לא הצלחנו לטעון את המוח 😕';
  });

  buildPanel();
  bindPointer();
  renderer.setAnimationLoop(frame);
}

// Start view; on narrow (portrait) screens step back so the whole brain fits
function homeView() {
  camera.position.copy(HOME).multiplyScalar(Math.max(1, 1.2 / camera.aspect));
  controls.target.set(0, 0, 0);
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ─────────────────────── Layers ───────────────────────
function applyLayers() {
  for (const m of meshes) {
    const { center, outer, side, key } = m.userData;
    // Explode: push each part away from the middle; the cortex moves further so the inside shows
    const f = explode * (outer ? 1.1 : 0.55);
    m.position.copy(center).multiplyScalar(f);
    if (outer && side) m.position.x += (side === 'L' ? -1 : 1) * 25 * explode;

    const hiddenSide = hemi !== 'both' && side && side !== hemi;
    m.visible = !hiddenSide && shown.has(key);

    const mat = m.material;
    mat.transparent = key === 'ventricles';
    mat.opacity = key === 'ventricles' ? 0.8 : 1;
    const on = key === selectedKey, hov = key === hoverKey;
    mat.emissive.set(on ? PARTS[key].color : '#000000');
    mat.emissiveIntensity = on ? 0.45 : 0;
    if (hov && !on) { mat.emissive.set('#ffffff'); mat.emissiveIntensity = 0.12; }
  }
}

// ─────────────────────── Panel ───────────────────────
function buildPanel() {
  for (const [k, p] of Object.entries(PARTS)) {
    const row = document.createElement('label');
    row.className = 'part-row';
    row.dataset.key = k;
    row.innerHTML = `<input type="checkbox" checked><i style="background:${p.color}"></i>
      <span>${p.name}</span><button class="info-btn" title="מה זה?">?</button>`;
    row.querySelector('input').onchange = e => {
      e.target.checked ? shown.add(k) : shown.delete(k);
      applyLayers();
    };
    row.querySelector('.info-btn').onclick = e => {
      e.preventDefault(); // don't toggle the checkbox
      select(k, null);
      // On phones the model sits above the list – bring it back into view
      if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.getElementById(p.outer ? 'parts-outer' : 'parts-inner').appendChild(row);
  }

  document.querySelectorAll('.group-actions button').forEach(btn => {
    btn.onclick = () => {
      const outer = btn.dataset.group === 'outer', on = btn.dataset.on === '1';
      document.querySelectorAll('.part-row').forEach(row => {
        const k = row.dataset.key;
        if (PARTS[k].outer !== outer) return;
        row.querySelector('input').checked = on;
        on ? shown.add(k) : shown.delete(k);
      });
      applyLayers();
    };
  });

  const ex = document.getElementById('explode');
  ex.oninput = () => { explode = ex.value / 100; applyLayers(); };

  segment('hemi-mode', 'hemi', v => { hemi = v; });

  const rot = document.getElementById('btn-rotate');
  rot.onclick = () => { controls.autoRotate = !controls.autoRotate; rot.classList.toggle('active', controls.autoRotate); };
  document.getElementById('btn-view').onclick = homeView;
}

function segment(id, attr, set) {
  const root = document.getElementById(id);
  root.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      set(btn.dataset[attr]);
      applyLayers();
    };
  });
}

function select(key, side) {
  selectedKey = key;
  selectedSide = side;
  document.getElementById('hover-label').style.display = 'none';
  document.querySelectorAll('.part-row').forEach(r => r.classList.toggle('active', r.dataset.key === key));

  // Explanation floats over the bottom of the model, so opening it doesn't push anything down
  const card = document.getElementById('info-card');
  card.hidden = !key;
  if (key) {
    const p = PARTS[key];
    const paired = meshes.some(m => m.userData.key === key && m.userData.side);
    const where = side ? SIDE_TEXT[side] : paired ? 'יש אחד בכל חצי מוח' : 'במרכז המוח';
    card.innerHTML = `<button class="info-close" title="סגירה">✕</button><h2><span class="swatch" style="background:${p.color}"></span>${p.name}</h2>
      <div class="where">${where}</div><p>${p.text}</p>`;
    card.querySelector('.info-close').onclick = () => select(null, null);
  }
  applyLayers();
}

// ─────────────────────── Picking ───────────────────────
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const targets = meshes.filter(m => m.visible);
  return raycaster.intersectObjects(targets, false)[0]?.object || null;
}

function bindPointer() {
  const el = renderer.domElement;
  const hoverLabel = document.getElementById('hover-label');
  let down = null;

  el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const hit = pick(e);
    select(hit ? hit.userData.key : null, hit ? hit.userData.side : null);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || e.buttons) { hoverLabel.style.display = 'none'; return; }
    const hit = pick(e);
    const k = hit ? hit.userData.key : null;
    if (k !== hoverKey) { hoverKey = k; applyLayers(); }
    el.style.cursor = k ? 'pointer' : 'grab';
    if (k && k !== selectedKey) {
      const r = stage.getBoundingClientRect();
      hoverLabel.textContent = PARTS[k].name;
      hoverLabel.style.left = (e.clientX - r.left) + 'px';
      hoverLabel.style.top = (e.clientY - r.top - 14) + 'px';
      hoverLabel.style.display = 'block';
    } else hoverLabel.style.display = 'none';
  });
  el.addEventListener('pointerleave', () => {
    hoverLabel.style.display = 'none';
    if (hoverKey) { hoverKey = null; applyLayers(); }
  });
}

// ─────────────────────── Loop ───────────────────────
const tmp = new THREE.Vector3();

function frame() {
  if (stage.offsetParent === null) return; // tab hidden
  controls.update();
  renderer.render(scene, camera);
  placePinLabel();
}

// Keep the selected part's name floating above it
function placePinLabel() {
  const label = document.getElementById('pin-label');
  const target = meshes.find(m => m.visible && m.userData.key === selectedKey &&
    (!selectedSide || m.userData.side === selectedSide)) ||
    meshes.find(m => m.visible && m.userData.key === selectedKey);
  if (!target) { label.style.display = 'none'; return; }
  tmp.copy(target.userData.center).add(target.position).project(camera);
  if (tmp.z > 1) { label.style.display = 'none'; return; }
  label.textContent = PARTS[selectedKey].name;
  label.style.left = ((tmp.x + 1) / 2 * stage.clientWidth) + 'px';
  label.style.top = ((1 - tmp.y) / 2 * stage.clientHeight - 8) + 'px';
  label.style.display = 'block';
}
