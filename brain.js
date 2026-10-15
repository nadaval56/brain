// 3D brain viewer: rotate, zoom, explode into layers, tap a part for its name + explanation.
// Model: Anderson M. Winkler, "Brain for Blender" (brainder.org), CC BY-SA 3.0 —
// merged into lobes / structures and decimated into assets/brain.glb.
// The pineal gland is not in the scan; it is added here as an approximate shape.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─────────────────────── Parts ───────────────────────
// outer = cortex (the wrinkled surface); inner = deep structures
// more = the "הרחב" section, fun = an anecdote shown under it
const PARTS = {
  cerebrum: {
    name: 'המוח הגדול', en: 'Cerebrum', color: '#e9a3ad', outer: true, merged: true,
    text: 'כל האונות של חצי מוח אחד ביחד. זה החלק הגדול ביותר במוח – כ־85% ממשקלו – והוא אחראי על חשיבה, שפה, תנועה רצונית ותחושה.',
    more: `המוח הגדול מחולק לשני חצאים (המיספרות) שמחוברים בגוף המסוייד. כל חצי מקבל מידע מהצד הנגדי של הגוף ושולט בו. הקמטים שעל פני השטח מאפשרים לדחוס שטח גדול לתוך הגולגולת: אם היו פורשים את קליפת המוח, היא הייתה בגודל של כ־2,500 סמ"ר – בערך ציפית של כרית – ובעובי של 2–4 מ"מ בלבד.`,
    fun: `"אנחנו משתמשים רק ב־10% מהמוח" – מיתוס! סריקות מראות שבמהלך יום רגיל אנחנו משתמשים כמעט בכל חלקי המוח, גם אם לא בכולם בבת אחת.`,
  },
  frontal: {
    name: 'האונה המצחית', en: 'Frontal lobe', color: '#4f8ef7', outer: true,
    text: 'ה"מנהל" של המוח: מתכננת, מקבלת החלטות, שומרת על ריכוז ועוצרת תגובות אוטומטיות. היא זו שעובדת קשה בדף ב\' של מבחן סטרופ – כדי לא לקרוא את המילה!',
    more: `זו האונה הגדולה ביותר – כשליש משטח קליפת המוח – והאחרונה להבשיל: היא ממשיכה להתפתח עד גיל 25 בערך. לכן אצל בני נוער היכולת לתכנן קדימה ולעצור דחפים עדיין "בבנייה". בצד שמאל שלה נמצא אזור ברוקה, שעוזר לנו לדבר ולבנות משפטים.`,
    fun: `ב־1848 פיניאס גייג', עובד מסילת ברזל, שרד מוט ברזל שחדר לו לראש דרך האונה המצחית. הוא המשיך ללכת ולדבר, אבל חבריו סיפרו שהאישיות שלו השתנתה: "גייג' כבר לא גייג'". המקרה לימד את המדענים שהאונה המצחית קשורה לאישיות ולשליטה עצמית.`,
  },
  motor: {
    name: 'קליפת המוח המוטורית', en: 'Primary motor cortex', color: '#ff9f43', outer: true,
    text: 'רצועה ששולחת פקודות לשרירים – להזיז יד, רגל או לשון. צד ימין של המוח מזיז את צד שמאל של הגוף, ולהפך.',
    more: `כל נקודה ברצועה שולטת בחלק אחר בגוף, כמו מפה – "ההומונקולוס המוטורי". לידיים, לאצבעות ולפה יש בה שטח ענק, כי הם מבצעים את התנועות העדינות והמדויקות ביותר.`,
    fun: `המנתח וילדר פנפילד גילה את המפה הזאת בשנות ה־30 כשגירה בעדינות את המוח של מטופלים ערים בזמן ניתוח (למוח עצמו אין חיישני כאב!) – וראה את האצבעות או השפתיים שלהם זזות.`,
  },
  sensory: {
    name: 'קליפת המוח החושית', en: 'Primary somatosensory cortex', color: '#ffd23f', outer: true,
    text: 'רצועה שנמצאת ממש מאחורי המוטורית ומקבלת תחושות מכל הגוף: מגע, חום, קור וכאב. לאצבעות ולשפתיים יש בה הרבה מקום.',
    more: `גם כאן יש מפה של הגוף ("הומונקולוס חושי"). אם מציירים אדם לפי גודל השטח שכל איבר תופס במפה, מקבלים דמות מצחיקה עם ידיים ענקיות, שפתיים עבות ולשון גדולה.`,
    fun: `ניסוי קטן: געו בגב של חבר עם שני עפרונות קרובים – הוא ירגיש נקודה אחת בלבד. בקצה האצבע, באותו מרחק, הוא ירגיש שתיים! זה כי לאצבעות מוקדש הרבה יותר מקום במוח.`,
  },
  parietal: {
    name: 'האונה הקודקודית', en: 'Parietal lobe', color: '#3ecf6e', outer: true,
    text: 'מחברת את המידע מהחושים לתמונה אחת: איפה הגוף שלי נמצא, איפה הדברים סביבי, וגם עוזרת בחשבון.',
    more: `האונה הקודקודית בונה "מפה" של המרחב סביבנו ושל הגוף בתוכו. כשהיא נפגעת בצד ימין מופיעה לפעמים "הזנחה צידית": האדם מתעלם מכל מה שבצד שמאל – אוכל רק חצי מהצלחת או מצייר רק חצי שעון – ולא שם לב שמשהו חסר.`,
    fun: `חוקרים שבדקו את המוח של אלברט איינשטיין מצאו שהאונות הקודקודיות שלו היו רחבות מהרגיל ובעלות צורה מיוחדת. ייתכן שזה קשור לחשיבה המרחבית והמתמטית שלו.`,
  },
  temporal: {
    name: 'האונה הרקתית', en: 'Temporal lobe', color: '#e66fd2', outer: true,
    text: 'נמצאת מעל האוזניים: שמיעה, הבנת מילים ושפה, זיהוי פנים, ועוזרת לשמור זיכרונות.',
    more: `באונה הרקתית נמצאת קליפת השמע, ובצד שמאל – אזור ורניקה, שעוזר להבין את מה שאומרים לנו. בחלק התחתון שלה יש אזור שמתמחה בזיהוי פנים, ובצד הפנימי היא מחוברת להיפוקמפוס ולאמיגדלה.`,
    fun: `יש אנשים שאצלם אזור זיהוי הפנים לא עובד טוב ("עיוורון פנים"). הם רואים מצוין, אבל לא מזהים אפילו את בני המשפחה שלהם לפי הפנים – ונעזרים בקול, בשיער או בצורת ההליכה.`,
  },
  occipital: {
    name: 'האונה העורפית', en: 'Occipital lobe', color: '#9b7bf2', outer: true,
    text: 'מרכז הראייה של המוח, בחלק האחורי של הראש. כאן המוח מפענח צורות, תנועה וצבעים – כמו צבע הדיו במבחן סטרופ.',
    more: `המידע מהעיניים מגיע לכאן דרך התלמוס, ומשם מתפצל לשני "מסלולים": אחד שואל "מה זה?" (צורה וצבע) והשני "איפה זה ולאן זה זז?". מה שאנחנו רואים בצד שמאל מגיע לאונה העורפית הימנית, ולהפך.`,
    fun: `ה"כוכבים" שרואים אחרי מכה בעורף – אלה תאי עצב באונה העורפית שמגורים בטעות ומייצרים תחושה של אור שלא באמת קיים.`,
  },
  cingulate: {
    name: 'הפיתול החגורתי', en: 'Cingulate gyrus', color: '#ff7b7b', outer: true,
    text: 'מסתתר בצד הפנימי של כל חצי מוח. מזהה התנגשויות וטעויות ("רגע, משהו פה לא מסתדר!") – והוא פעיל במיוחד במבחן סטרופ.',
    more: `החלק הקדמי שלו הוא כמו "גלאי טעויות": כשהתגובה האוטומטית (לקרוא את המילה) מתנגשת במשימה (לומר את צבע הדיו), הוא נדלק ומזעיק את האונה המצחית לעזרה. הוא קשור גם למוטיבציה ולצד הרגשי של כאב.`,
    fun: `בניסוי שבו אנשים שיחקו "מסירות" במשחק מחשב, והשחקנים האחרים הפסיקו פתאום למסור להם, נדלק אצלם אותו אזור בפיתול החגורתי שמגיב לכאב פיזי. דחייה חברתית ממש "כואבת" למוח.`,
  },
  insula: {
    name: 'האינסולה', en: 'Insula', color: '#2ed3c6', outer: true,
    text: 'אונה קטנה שמוסתרת עמוק בתוך קפל בצד המוח. מרגישה מה קורה בתוך הגוף: רעב, דופק, נשימה – וגם רגשות כמו גועל.',
    more: `האינסולה מקבלת אותות מכל איברי הגוף ויוצרת את התחושה של "איך אני מרגיש עכשיו". היא פעילה כשאנחנו טועמים משהו מגעיל, כשאנחנו רואים מישהו אחר נגעל, וגם כשאנחנו מרגישים אמפתיה כלפי אחרים.`,
    fun: `מחקר מצא שמעשנים שהאינסולה שלהם נפגעה בשבץ הפסיקו לעשן בקלות מפתיעה. אחד מהם סיפר שהגוף שלו פשוט "שכח" שהוא רוצה לעשן.`,
  },
  amygdala: {
    name: 'האמיגדלה', en: 'Amygdala', color: '#ff2d2d', outer: false,
    text: 'בגודל ובצורה של שקד. "מערכת האזעקה" של המוח: מזהה סכנה במהירות ומפעילה פחד ותגובת "הילחם או ברח". קשורה גם לרגשות חזקים.',
    more: `לאמיגדלה יש "קיצור דרך" מהתלמוס, ולכן היא מגיבה לסכנה עוד לפני שאנחנו מבינים מה ראינו – אנחנו קופצים אחורה מנחש לפני שמבינים שזה בעצם מקל. היא גם מסמנת זיכרונות רגשיים כ"חשובים", ולכן זוכרים היטב רגעים מפחידים או מרגשים.`,
    fun: `אישה שמוכרת במחקר בשם S.M., שהאמיגדלות שלה נהרסו בגלל מחלה נדירה, כמעט לא מרגישה פחד: היא החזיקה נחשים בלי היסוס ולא נבהלה אפילו בבית רדוף רוחות.`,
  },
  hippocampus: {
    name: 'ההיפוקמפוס', en: 'Hippocampus', color: '#ffb000', outer: false,
    text: 'השם שלו ביוונית הוא "סוסון ים" בגלל הצורה. הופך חוויות של היום לזיכרונות שנשארים, ועוזר לנו לזכור את הדרך.',
    more: `ההיפוקמפוס עובד כמו "כונן זמני": הוא שומר את חוויות היום, ובלילה, בזמן השינה, "משדר" אותן שוב לקליפת המוח כדי שיישמרו לאורך זמן – עוד סיבה טובה לישון לפני מבחן. הוא גם בונה מפה פנימית של המקומות שאנחנו מכירים.`,
    fun: `מטופל מפורסם, H.M., שחלקים מההיפוקמפוס שלו הוסרו בניתוח, לא הצליח מאז ליצור זיכרונות חדשים. הוא פגש את החוקרת שלו במשך עשרות שנים – ובכל פעם הכיר אותה מחדש. ונהגי מוניות בלונדון, שלומדים בעל פה אלפי רחובות, נמצאו עם חלק אחורי גדול יותר בהיפוקמפוס.`,
  },
  thalamus: {
    name: 'התלמוס', en: 'Thalamus', color: '#00c2ff', outer: false,
    text: '"תחנת הממסר" של המוח: כמעט כל מידע מהחושים (חוץ מריח) עובר דרכו בדרך לקליפת המוח.',
    more: `התלמוס לא רק מעביר מידע – הוא גם מסנן אותו ומחליט מה חשוב מספיק כדי להגיע לתודעה. בזמן שינה הוא כמעט "סוגר את השער", ולכן אפשר לישון למרות רעשים מסביב.`,
    fun: `הריח הוא החוש היחיד שעוקף את התלמוס ומגיע כמעט ישר לאזורי הרגש והזיכרון. אולי לכן ריח אחד יכול להחזיר אותנו בבת אחת לזיכרון ילדות.`,
  },
  basalganglia: {
    name: 'גרעיני הבסיס', en: 'Basal ganglia', color: '#a3e635', outer: false,
    text: 'קבוצת גרעינים שעוזרת לבחור איזו תנועה לעשות ולהתחיל אותה, ושומרת הרגלים – כמו רכיבה על אופניים בלי לחשוב.',
    more: `גרעיני הבסיס פועלים כמו "בלם ודוושת גז" לתנועות: הם משחררים את התנועה הנכונה ועוצרים את כל השאר. הם נעזרים בדופמין – חומר שקשור גם לתגמול ולמוטיבציה. במחלת פרקינסון התאים שמספקים להם דופמין מתים, ולכן קשה להתחיל תנועה ומופיע רעד.`,
    fun: `יש אנשים עם פרקינסון שמתקשים מאוד ללכת, אבל רוכבים על אופניים בלי בעיה – או הולכים בקלות כשמציירים להם על הרצפה קווים לדרוך עליהם.`,
  },
  cerebellum: {
    name: 'המוח הקטן', en: 'Cerebellum', color: '#c98a55', outer: false,
    text: 'בחלק האחורי התחתון. אחראי על שיווי משקל ותיאום תנועות מדויק. למרות שהוא קטן – יש בו יותר ממחצית תאי העצב של המוח!',
    more: `המוח הקטן משווה כל הזמן בין התנועה שתכננו לבין מה שקורה בפועל, ומתקן תוך כדי תנועה. הוא גם זה שלומד תנועות חדשות עד שהן הופכות לאוטומטיות – לנגן, להקליד, לקלוע לסל.`,
    fun: `אי אפשר לדגדג את עצמנו! המוח הקטן חוזה בדיוק איזו תחושה תגיע מהאצבעות שלנו ו"מנמיך את הווליום" שלה. בלי הפתעה – אין דגדוג.`,
  },
  brainstem: {
    name: 'גזע המוח', en: 'Brainstem', color: '#94a3b8', outer: false,
    text: 'מחבר את המוח לחוט השדרה. שולט בדברים שקורים לבד: נשימה, דופק, בליעה ושינה.',
    more: `דרך גזע המוח עוברים כל הסיבים בין המוח לגוף, ושם רובם גם מצטלבים – לכן כל צד של המוח שולט בצד הנגדי של הגוף. יש בו מרכזים ששומרים עלינו בחיים (נשימה, קצב לב, לחץ דם) וגם רפלקסים כמו שיעול, התעטשות ומצמוץ.`,
    fun: `גזע המוח מפעיל גם את הפיהוק – ועד היום לא ברור לגמרי למה פיהוק "מדבק". אצל הרבה אנשים אפילו לקרוא על פיהוק מספיק כדי לפהק… פיהקתם עכשיו?`,
  },
  corpuscallosum: {
    name: 'הגוף המסוייד', en: 'Corpus callosum', color: '#f1f1f1', outer: false,
    text: 'גשר של מיליוני סיבי עצב שמחבר בין חצי המוח הימני לשמאלי, כדי ששניהם יעבדו ביחד.',
    more: `יש בו כ־200 מיליון סיבי עצב, והוא הגשר הגדול ביותר בין שני חצאי המוח. דרכו כל חצי "יודע" מה החצי השני רואה, מרגיש ועושה.`,
    fun: `פעם, כדי לעזור לחולי אפילפסיה קשה, ניתקו להם את הגוף המסוייד. ניסויי "המוח המפוצל" (רוג'ר ספרי, פרס נובל 1981) הראו שכשמראים תמונה רק לחצי הימני של המוח, המטופל לא מצליח לומר מה ראה – כי מרכזי הדיבור בצד שמאל – אבל היד השמאלית שלו בוחרת את החפץ הנכון!`,
  },
  ventricles: {
    name: 'חדרי המוח', en: 'Ventricles', color: '#5ab8ff', outer: false,
    text: 'חללים בתוך המוח שמלאים בנוזל שקוף. הנוזל מגן על המוח כמו כרית ומביא לו חומרים.',
    more: `יש ארבעה חדרים שמחוברים זה לזה. בכל יום הם מייצרים כחצי ליטר של נוזל מוחי־שדרתי, שמתחלף כמה פעמים ביום. המוח ממש "צף" בנוזל – וכך המשקל שהוא מרגיש יורד מכ־1.4 ק"ג לפחות מ־50 גרם, והוא לא נמעך תחת המשקל של עצמו.`,
    fun: `בזמן שינה הנוזל זורם חזק יותר בין תאי המוח ו"שוטף" פסולת שהצטברה במהלך היום. השינה היא גם זמן הניקיון של המוח.`,
  },
  pineal: {
    name: 'האיצטרובל', en: 'Pineal gland', color: '#ff5fa2', outer: false,
    text: 'בלוטה קטנטנה, בגודל של גרעין אורז ובצורה של איצטרובל – ומכאן השם. בחושך היא מפרישה מלטונין, החומר שאומר לגוף "הגיע הזמן לישון".',
    more: `האיצטרובל מקבל מהעיניים (דרך "השעון הביולוגי" של המוח) מידע על כמות האור. אור חזק – ובמיוחד האור הכחול של מסכים – מעכב את הפרשת המלטונין, ולכן גלילה בטלפון לפני השינה יכולה להקשות על ההירדמות. בגיל ההתבגרות השעון הזה זז מאוחר יותר, ולכן לבני נוער באמת קשה יותר להירדם מוקדם. (במודל הוא צורה מקורבת שהוספנו במקום הנכון – הוא לא חלק מהסריקה המקורית.)`,
    fun: `הפילוסוף רנה דקארט (המאה ה־17) האמין שהאיצטרובל הוא "מושב הנפש" – המקום שבו הנפש פוגשת את הגוף – כי זה אחד המבנים הבודדים במוח שאין להם בן זוג בצד השני.`,
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
let merge = false; // all lobes of a hemisphere act as one part ("המוח הגדול")
const shown = new Set(Object.keys(PARTS)); // parts ticked in the list
let hemi = 'both';
const hemiCenter = { L: new THREE.Vector3(), R: new THREE.Vector3() };
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const HOME = new THREE.Vector3(-250, 90, -170);

// Shared by every highlight shader
const TIME = { value: 0 };
const RES = { value: new THREE.Vector2(1, 1) }; // drawing-buffer size in px
const PX = { value: 1 };                        // device pixel ratio

export function initBrain() {
  stage = document.getElementById('brain-stage');

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  PX.value = renderer.getPixelRatio();
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
      if (obj.isMesh && PARTS[keyOf(obj.name)]) addPart(obj, keyOf(obj.name), sideOf(obj.name));
    });
    const pineal = pinealMesh();
    gltf.scene.add(pineal);
    addPart(pineal, 'pineal', null);

    // Merged mode explodes each hemisphere as one block, around its own centre
    for (const s of ['L', 'R']) {
      const box = new THREE.Box3();
      meshes.filter(m => m.userData.outer && m.userData.side === s).forEach(m => {
        m.geometry.computeBoundingBox();
        box.union(m.geometry.boundingBox);
      });
      box.getCenter(hemiCenter[s]);
    }

    scene.add(gltf.scene);
    document.getElementById('brain-status').remove();
    applyLayers();
  }, undefined, err => {
    console.error(err);
    document.getElementById('brain-status').textContent = 'לא הצלחנו לטעון את המודל';
  });

  buildPanel();
  bindPointer();
  renderer.setAnimationLoop(frame);
}

// ─────────────────────── Meshes ───────────────────────
function addPart(obj, k, side) {
  const part = PARTS[k];
  obj.geometry.computeVertexNormals();
  obj.geometry.computeBoundingSphere();
  obj.material = withStripes(new THREE.MeshStandardMaterial({
    color: part.color, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide,
  }));

  // Outline shown while the part is selected: back faces pushed out a few pixels.
  // It is depth-tested, so parts in front of the selected one hide its outline too.
  const outline = new THREE.Mesh(obj.geometry, OUTLINE_MAT);
  outline.visible = false;
  outline.raycast = () => {};
  obj.add(outline);

  obj.userData = { key: k, side, outer: part.outer, center: obj.geometry.boundingSphere.center.clone(),
                   outline };
  meshes.push(obj);
}

// The scan has no pineal gland: a small pine-cone shape behind the thalami, under the splenium
function pinealMesh() {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i), t = 1 - 0.4 * Math.max(0, z); // narrows towards the back
    p.setXYZ(i, p.getX(i) * 3 * t, p.getY(i) * 2.7 * t, z * 4.6);
  }
  g.rotateX(0.35); // tip points back and a little down
  g.translate(-0.5, -5, 23);
  const m = new THREE.Mesh(g);
  m.name = 'pineal';
  return m;
}

// Moving diagonal stripes in screen space, switched on per material with uStripe
function withStripes(mat) {
  mat.userData.stripe = { value: 0 };
  mat.userData.stripeColor = { value: stripeColor(mat.color, new THREE.Color()) };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uStripe: mat.userData.stripe, uStripeColor: mat.userData.stripeColor,
                                 uTime: TIME, uPx: PX });
    sh.fragmentShader = 'uniform float uStripe; uniform vec3 uStripeColor; uniform float uTime; uniform float uPx;\n' +
      sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (uStripe > 0.0) {
          float s = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / (16.0 * uPx) - uTime));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uStripeColor, s * uStripe);
        }`);
  };
  return mat;
}

// Dark stripes on very light parts, white on the rest
function stripeColor(c, out) {
  return out.set(0.299 * c.r + 0.587 * c.g + 0.114 * c.b > 0.7 ? '#1e293b' : '#ffffff');
}

const OUTLINE_MAT = new THREE.ShaderMaterial({
  uniforms: { uRes: RES, uWidth: { value: 3.5 }, uPx: PX, uColor: { value: new THREE.Color('#ffffff') } },
  vertexShader: `
    uniform vec2 uRes; uniform float uWidth; uniform float uPx;
    void main() {
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec2 dir = (projectionMatrix * vec4(normalMatrix * normal, 0.0)).xy;
      dir = length(dir) > 1e-6 ? normalize(dir) : vec2(0.0);
      clip.xy += dir * uWidth * uPx * 2.0 / uRes * clip.w;
      gl_Position = clip;
    }`,
  fragmentShader: `uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }`,
  side: THREE.BackSide,
});

// Start view; on narrow (portrait) screens step back so the whole brain fits
function homeView() {
  camera.position.copy(HOME).multiplyScalar(Math.max(1, 1.2 / camera.aspect));
  controls.target.set(0, 0, 0);
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  renderer.getDrawingBufferSize(RES.value);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ─────────────────────── Layers ───────────────────────
// In merged mode every cortex lobe answers to the name "cerebrum"
const partOf = m => (merge && m.userData.outer ? 'cerebrum' : m.userData.key);

function isSelected(m) {
  if (!selectedKey || partOf(m) !== selectedKey) return false;
  return !selectedSide || !m.userData.side || m.userData.side === selectedSide;
}

function applyLayers() {
  for (const m of meshes) {
    const { center, outer, side, outline } = m.userData;
    const k = partOf(m);
    // Explode: push each part away from the middle; the cortex moves further so the inside shows.
    // Merged lobes all move with their hemisphere's centre, so they stay glued together.
    const f = explode * (outer ? 1.1 : 0.55);
    m.position.copy(merge && outer && side ? hemiCenter[side] : center).multiplyScalar(f);
    if (outer && side) m.position.x += (side === 'L' ? -1 : 1) * 25 * explode;

    const hiddenSide = hemi !== 'both' && side && side !== hemi;
    m.visible = !hiddenSide && shown.has(k);

    const mat = m.material, color = PARTS[k].color;
    const on = isSelected(m), hov = k === hoverKey;
    mat.color.set(color);
    stripeColor(mat.color, mat.userData.stripeColor.value);
    mat.emissive.set(on ? color : hov ? '#ffffff' : '#000000');
    mat.emissiveIntensity = on ? 0.4 : hov ? 0.12 : 0;
    mat.userData.stripe.value = on ? 0.45 : 0;
    outline.visible = on;
  }
}

// ─────────────────────── Panel ───────────────────────
function buildPanel() {
  for (const [k, p] of Object.entries(PARTS)) {
    const row = document.createElement('div');
    row.className = 'part-row';
    row.dataset.key = k;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.hidden = !!p.merged;
    row.innerHTML = `<input type="checkbox" checked aria-label="הצגת ${p.name}"><i style="background:${p.color}"></i>
      <span>${p.name}</span>`;
    const box = row.querySelector('input');
    box.onclick = e => e.stopPropagation(); // the box only shows / hides
    box.onchange = () => {
      box.checked ? shown.add(k) : shown.delete(k);
      if (!box.checked && selectedKey === k) select(null, null);
      applyLayers();
    };
    // The name marks the part on the model (and turns it on if it was hidden)
    const pickRow = () => {
      if (selectedKey === k) { select(null, null); return; }
      if (!shown.has(k)) { shown.add(k); box.checked = true; }
      select(k, null);
      // On phones the model sits above the list – bring it back into view
      if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    row.onclick = pickRow;
    row.onkeydown = e => { if (e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickRow(); } };
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
        if (!on && selectedKey === k) select(null, null);
      });
      applyLayers();
    };
  });

  const ex = document.getElementById('explode');
  ex.oninput = () => { explode = ex.value / 100; applyLayers(); };

  segment('hemi-mode', 'hemi', v => { hemi = v; });
  segment('merge-mode', 'merge', v => {
    merge = v === '1';
    // Swap the lobe rows for one "cerebrum" row
    document.querySelectorAll('#parts-outer .part-row').forEach(r => { r.hidden = !!PARTS[r.dataset.key].merged !== merge; });
    if (selectedKey && PARTS[selectedKey].outer) select(null, null);
  });

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
    const paired = p.merged || meshes.some(m => m.userData.key === key && m.userData.side);
    const where = side ? SIDE_TEXT[side] : p.merged ? 'שני חצאי המוח – כל האונות יחד'
      : key === 'pineal' ? 'במרכז המוח, מאחורי התלמוס' : paired ? 'יש אחד בכל חצי מוח' : 'במרכז המוח';
    card.innerHTML = `<button class="info-close" title="סגירה" aria-label="סגירה"><svg class="icon"><use href="#i-x"/></svg></button>
      <h2><span class="swatch" style="background:${p.color}"></span>${p.name}<span class="latin" dir="ltr">${p.en}</span></h2>
      <div class="where">${where}</div><p>${p.text}</p>
      <details class="more"><summary><span class="open-txt">הרחב</span><span class="close-txt">צמצם</span></summary>
        <p>${p.more}</p><p class="fun"><b>הידעת?</b> ${p.fun}</p></details>`;
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
    select(hit ? partOf(hit) : null, hit ? hit.userData.side : null);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || e.buttons) { hoverLabel.style.display = 'none'; return; }
    const hit = pick(e);
    const k = hit ? partOf(hit) : null;
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

function frame(t) {
  if (stage.offsetParent === null) return; // tab hidden
  TIME.value = t / 2500; // stripes drift slowly
  controls.update();
  renderer.render(scene, camera);
  placePinLabel();
}

// Keep the selected part's name floating above it
function placePinLabel() {
  const label = document.getElementById('pin-label');
  const on = meshes.filter(m => m.visible && isSelected(m));
  if (!on.length) { label.style.display = 'none'; return; }
  // A merged hemisphere is many meshes: aim at their middle. Otherwise one mesh (the first side).
  const targets = selectedKey === 'cerebrum' ? on : on.slice(0, 1);
  tmp.set(0, 0, 0);
  for (const m of targets) tmp.add(m.userData.center).add(m.position);
  tmp.divideScalar(targets.length);
  // Sit the label on top of a single part, so it doesn't cover small ones (pineal, amygdala)
  if (targets.length === 1) tmp.y += targets[0].geometry.boundingSphere.radius * 0.8;
  tmp.project(camera);
  if (tmp.z > 1) { label.style.display = 'none'; return; }
  label.textContent = PARTS[selectedKey].name;
  label.style.left = ((tmp.x + 1) / 2 * stage.clientWidth) + 'px';
  label.style.top = ((1 - tmp.y) / 2 * stage.clientHeight - 8) + 'px';
  label.style.display = 'block';
}
