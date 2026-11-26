// 3D inner ear for the balance section: three semicircular canals in three planes,
// the utricle and saccule with their crystals, the cochlea and the nerve.
// A schematic model built from simple shapes (not a scan). Rotate with the mouse or a finger.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

const COLORS = { canal: 0xa78bfa, sac: 0x22d3ee, cochlea: 0xfb923c, nerve: 0xfacc15, crystal: 0xf8fafc };

function mat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, transparent: true, opacity: 1 });
}

// A canal: most of a circle in the plane (U, V), whose two ends run back into the vestibule.
// Returns the tube mesh, the ampulla (the bulge at one end) and a point at the top for its label.
function canal(U, V, cu, cv, R, material) {
  const at = (u, v) => new THREE.Vector3().addScaledVector(U, u).addScaledVector(V, v);
  const pts = [at(cu * 0.35 + 0.12, 0.02)];
  const t0 = -Math.PI / 2 + 0.5, t1 = (3 * Math.PI) / 2 - 0.5;
  for (let k = 0; k <= 40; k++) {
    const t = t0 + ((t1 - t0) * k) / 40;
    pts.push(at(cu + R * Math.cos(t), cv + R * Math.sin(t)));
  }
  pts.push(at(cu * 0.35 - 0.12, 0.02));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.07, 14, false), material);
  const amp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), material);
  amp.position.copy(pts[2]);
  return { tube, amp, top: at(cu, cv + R + 0.18), side: at(cu + R + 0.12, cv + 0.1) };
}

function label(text, pos, group) {
  const div = document.createElement('div');
  div.className = 'bl3d-label';
  div.textContent = text;
  const obj = new CSS2DObject(div);
  obj.position.copy(pos);
  group.add(obj);
  return div;
}

export function initEar3D(container, isVisible) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.domElement.className = 'bl3d-labels';
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(3.4, 1.6, 3.6);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 5, 4);
  scene.add(sun);

  const root = new THREE.Group();   // centred model
  const wobble = new THREE.Group(); // swings to show a head movement
  root.add(wobble);
  scene.add(root);
  root.position.set(0, -0.35, 0);

  const m = {
    yes: mat(COLORS.canal), no: mat(COLORS.canal), tilt: mat(COLORS.canal),
    sac: mat(COLORS.sac), cochlea: mat(COLORS.cochlea), nerve: mat(COLORS.nerve), crystal: mat(COLORS.crystal),
  };

  // Vestibule: utricle (bigger) and saccule, with calcium crystals on top
  const utricle = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 20), m.sac);
  utricle.scale.set(1.25, 0.75, 0.95);
  const saccule = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 18), m.sac);
  saccule.position.set(0.02, -0.42, 0.28);
  wobble.add(utricle, saccule);
  const crystalGeo = new THREE.OctahedronGeometry(0.035);
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 40; k++) {
    const onSaccule = k >= 26, c = new THREE.Mesh(crystalGeo, m.crystal);
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (onSaccule ? 0.16 : 0.3);
    if (onSaccule) c.position.set(0.02 + 0.27 + 0.01, -0.42 + r * Math.sin(a), 0.28 + r * Math.cos(a));
    else c.position.set(r * Math.cos(a) * 1.2, 0.3 + 0.01, r * Math.sin(a) * 0.9);
    c.rotation.set(rnd() * 3, rnd() * 3, 0);
    wobble.add(c);
  }

  // Three canals at right angles: horizontal ("no"), front-vertical ("yes"), back-vertical ("ear to shoulder")
  const dA = X.clone().add(Z).normalize(), dP = X.clone().sub(Z).normalize();
  const cNo = canal(Z, X, 0, 0.7, 0.72, m.no);
  const cYes = canal(dA, Y, 0.28, 0.72, 0.75, m.yes);
  const cTilt = canal(dP, Y, 0.36, 0.62, 0.68, m.tilt);
  for (const c of [cNo, cYes, cTilt]) wobble.add(c.tube, c.amp);

  // Cochlea: a narrowing spiral of about two and a half turns, forward and down from the saccule
  const O = new THREE.Vector3(-0.35, -0.85, 0.75);
  const spiral = [saccule.position.clone(), new THREE.Vector3(-0.15, -0.65, 0.6)];
  for (let k = 0; k <= 90; k++) {
    const s = k / 90, ang = Math.PI * 2 * 2.6 * s, r = 0.5 * (1 - 0.75 * s);
    spiral.push(O.clone().addScaledVector(Z, r * Math.cos(ang)).addScaledVector(Y, r * Math.sin(ang)).addScaledVector(X, -0.4 * s));
  }
  wobble.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral), 300, 0.1, 14, false), m.cochlea));

  // Nerve: from the vestibule and the cochlea, inwards (towards the brain)
  const nerveEnd = new THREE.Vector3(-1.55, -0.25, 0.1);
  const nerve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.35, -0.05, 0), new THREE.Vector3(-0.9, -0.15, 0.05), nerveEnd]);
  const branch = new THREE.CatmullRomCurve3([O.clone().addScaledVector(X, -0.2), new THREE.Vector3(-0.85, -0.45, 0.35), new THREE.Vector3(-1.2, -0.25, 0.12)]);
  wobble.add(new THREE.Mesh(new THREE.TubeGeometry(nerve, 60, 0.09, 12, false), m.nerve));
  wobble.add(new THREE.Mesh(new THREE.TubeGeometry(branch, 60, 0.07, 12, false), m.nerve));

  // Orientation: forward and up
  const fwd = new THREE.ArrowHelper(Z, new THREE.Vector3(0.9, -1.25, 0.6), 0.7, 0x64748b, 0.18, 0.1);
  root.add(fwd);
  label('קדימה (אף)', new THREE.Vector3(0.9, -1.25, 1.5), root);

  const L = {
    yes: label('תעלה קדמית ("כן")', cYes.side, wobble),
    tilt: label('תעלה אחורית (אוזן לכתף)', cTilt.side, wobble),
    no: label('תעלה אופקית ("לא")', cNo.top, wobble),
    oto: label('שקיקות עם אבנים', new THREE.Vector3(0.5, -0.72, 0.45), wobble),
    cochlea: label('שבלול (שמיעה)', O.clone().add(new THREE.Vector3(0, -0.62, 0.2)), wobble),
    nerve: label('עצב ← למוח', nerveEnd.clone().add(new THREE.Vector3(0, 0.25, 0)), wobble),
  };

  // Frame the whole model, whatever its exact extent
  const box = new THREE.Box3().setFromObject(root), centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  camera.position.copy(centre).add(new THREE.Vector3(0.62, 0.3, 0.72).normalize().multiplyScalar(size * 1.35));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(centre);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = size * 0.7;
  controls.maxDistance = size * 3;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  // Highlight one sensor and swing the model the way the head moves for it
  let picked = null, t0 = 0;
  const AXIS = { yes: 'x', no: 'y', tilt: 'z' };
  function highlight(key) {
    picked = key;
    t0 = performance.now();
    const on = k => !key || k === key;
    m.yes.opacity = on('yes') ? 1 : 0.2;
    m.no.opacity = on('no') ? 1 : 0.2;
    m.tilt.opacity = on('tilt') ? 1 : 0.2;
    m.sac.opacity = m.crystal.opacity = on('oto') ? 1 : 0.25;
    m.cochlea.opacity = m.nerve.opacity = key ? 0.2 : 1;
    for (const [k, div] of Object.entries(L)) div.classList.toggle('dim', !!key && k !== key);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!isVisible()) return;
    wobble.rotation.set(0, 0, 0);
    if (picked && AXIS[picked]) wobble.rotation[AXIS[picked]] = 0.45 * Math.sin((now - t0) / 450);
    controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
  }
  requestAnimationFrame(frame);
  return { highlight };
}
