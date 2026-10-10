"""Printable 3D brain puzzle locked with LEGO Technic friction pins.

Pieces: one solid hemisphere per side (all lobes fused), and the parts that sit inside or under
it: thalamus, basal ganglia, hippocampus, amygdala and cerebellum (per side), brainstem and corpus
callosum. Deep parts sit in pockets that open on the hemisphere's inner (medial) face, so when
the two hemispheres are pinned together the deep parts are locked inside.

Every part is re-voxelised on one shared grid so pieces never overlap, a clearance gap is left
between touching pieces, and matching holes for a Technic pin (Ø4.8 mm, 16 mm long, with a
centre collar) are cut where two pieces meet with enough material around them.
Each STL is then turned to its best print orientation (least support; pin holes vertical where
possible) and set on the bed at the origin.

usage: python tools/print_stl.py DL SOLID OUT [SCALE]
  DL    = Brain for Blender download folder (see tools/README.md)
  SOLID = output folder of tools/solid.py
  SCALE = size factor (default 0.7 → brain ~12 cm long)
"""
import os, sys
import numpy as np
import trimesh
import fast_simplification
import pymeshfix
from scipy import ndimage
from skimage import measure

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brainparts import SUBCORT, MIDLINE, merged_solid, smooth  # noqa: E402
from lobes import LOBES  # noqa: E402

DL, SOLID, OUT = sys.argv[1:4]
SCALE = float(sys.argv[4]) if len(sys.argv) > 4 else 0.7
SUB = os.path.join(DL, 'sub/subcortical_obj')
os.makedirs(OUT, exist_ok=True)

PITCH = 0.4          # voxel size in mm, before scaling
GAP_VOXELS = 1       # each side gives up one voxel → ~0.55 mm clearance after scaling

# Technic friction pin (e.g. LEGO 2780 / 4459): Ø4.8 shaft, ~7.9 mm each side of a Ø6.2 collar
HOLE_D = 5.2         # printed holes come out a little small; 5.2 fit best on the test block
HOLE_DEPTH = 8.4     # from the piece's surface
CB_D, CB_DEPTH = 6.8, 0.9   # shallow counterbore for the collar
WALL = 1.6           # plastic needed around a hole

# (piece A, piece B, pins wanted, pin axis = the direction B moves to join A)
X, Z = np.array([1.0, 0, 0]), np.array([0, 0, 1.0])
PIN_PAIRS = [('hemisphere_L', 'hemisphere_R', 2, X), ('cerebellum_L', 'cerebellum_R', 1, X),
             ('cerebellum_L', 'brainstem', 1, X), ('brainstem', 'cerebellum_R', 1, X),
             ('cerebellum_L', 'hemisphere_L', 1, Z), ('cerebellum_R', 'hemisphere_R', 1, Z)]

INSIDE = ['amygdala', 'hippocampus', 'thalamus', 'basalganglia']   # per side, in pockets
OUTSIDE = ['cerebellum']                                          # per side
MID = ['brainstem', 'corpuscallosum']


def largest_body(m):
    m.merge_vertices()
    bodies = m.split(only_watertight=False)
    return max(bodies, key=lambda b: abs(b.volume)) if len(bodies) > 1 else m


def reduce(m, target):
    """Fewer triangles, still one closed body (MeshFix patches what decimation breaks)."""
    if len(m.faces) <= target:
        return m
    v, f = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32),
                                        target_count=target)
    r = largest_body(trimesh.Trimesh(v, f, process=True))
    if not r.is_watertight:
        fix = pymeshfix.MeshFix(r.vertices, r.faces)
        fix.repair()
        r = trimesh.Trimesh(fix.points, fix.faces, process=True)
    return r if r.is_watertight else m


# ── Source meshes (RAS mm: x right, y front, z up) ──
src = {}
for side in ('L', 'R'):
    S = 'Left' if side == 'L' else 'Right'
    src[f'hemisphere_{side}'] = [trimesh.load(f'{SOLID}/{lobe}_{side}.obj', process=False) for lobe in LOBES]
    for name in INSIDE + OUTSIDE:
        m = merged_solid([f'{SUB}/{x.format(S=S)}.obj' for x in SUBCORT[name]], force=True)
        src[f'{name}_{side}'] = [smooth(m, 25 if name == 'cerebellum' else 10)]
for name in MID:
    src[name] = [smooth(merged_solid([f'{SUB}/{x}.obj' for x in MIDLINE[name]], force=True), 10)]

# ── One shared voxel grid; deep parts claim space first ──
names = [n for n in src if not n.startswith('hemisphere')] + ['hemisphere_L', 'hemisphere_R']
ID = {n: i for i, n in enumerate(names, start=1)}
allm = [m for ms in src.values() for m in ms]
lo = np.min([m.bounds[0] for m in allm], axis=0) - 6
hi = np.max([m.bounds[1] for m in allm], axis=0) + 6
owner = np.zeros(np.ceil((hi - lo) / PITCH).astype(int) + 1, np.int8)
for n in names:
    mask = np.zeros(owner.shape, bool)
    for m in src[n]:
        v = m.voxelized(PITCH)
        pts = trimesh.transform_points(np.argwhere(ndimage.binary_fill_holes(v.matrix)).astype(float), v.transform)
        mask[tuple(np.round((pts - lo) / PITCH).astype(int).T)] = True
    if n.startswith('hemisphere'):
        mask = ndimage.binary_closing(mask, iterations=2)   # fuse the lobes, seal cracks between them
    owner[mask & (owner == 0)] = ID[n]
print('voxel grid', owner.shape)

# ── Make the puzzle assemblable ──
# Assembly (brain standing upright, x = left→right, z = up):
#   1. in each half, the cerebellum is pinned under the hemisphere (vertical move);
#   2. inner parts slide into pockets on the hemisphere's medial face (sideways move);
#   3. the right half slides sideways onto the left half.
# For every move, whatever the moving piece would pass through is cut away from the fixed one.
def extend(mask, axis, step):
    """mask stretched to the end of the grid in one direction (step +1 / -1) along an axis."""
    sl = [slice(None)] * 3
    sl[axis] = slice(None, None, step)
    return np.maximum.accumulate(mask[tuple(sl)], axis=axis)[tuple(sl)]


def carve(fixed, swept):
    keep = owner == ID[fixed]
    cut = keep & ndimage.binary_dilation(swept, iterations=1)
    owner[cut] = 0
    return int(cut.sum())


for side, toward_mid in (('L', 1), ('R', -1)):
    # 1. cerebellum comes up from below into place
    print(side, 'cerebellum path', carve(f'hemisphere_{side}', extend(owner == ID[f'cerebellum_{side}'], 2, -1)))
    # 2. inner and midline parts slide in from the midline
    for n in [f'{p}_{side}' for p in INSIDE] + MID:
        swept = extend(owner == ID[n], 0, toward_mid)
        print(side, n, 'pocket', carve(f'hemisphere_{side}', swept),
              carve(f'cerebellum_{side}', swept) if n in MID else 0)
# 3. right half arrives from the right: it must not have material left of any left-half material
right = ['hemisphere_R', 'cerebellum_R'] + [f'{p}_R' for p in INSIDE]
fixed = np.isin(owner, [ID[n] for n in names if n not in right])
blocked = extend(fixed, 0, -1)
print('right-half slide', sum(carve(n, blocked) for n in right))

# ── Clearance gap between neighbours ──
masks = {}
for n in names:
    mine = owner == ID[n]
    mine &= ~ndimage.binary_dilation((owner > 0) & ~mine, iterations=GAP_VOXELS)
    cc, k = ndimage.label(mine)
    if k > 1:
        sizes = ndimage.sum(mine, cc, range(1, k + 1))
        mine = cc == 1 + int(np.argmax(sizes))
    masks[n] = mine

# ── Pin placement: where A and B face each other with plastic all around the hole ──
r_wall = (HOLE_D / 2 + WALL) / SCALE / PITCH          # in voxels
length = (HOLE_DEPTH + 1.0) / SCALE / PITCH
edt = {}
for n in names:   # distance-to-surface inside each piece, kept to the piece's bounding box
    idx = np.argwhere(masks[n])
    a0, b0 = idx.min(0) - 2, idx.max(0) + 3
    edt[n] = (a0, ndimage.distance_transform_edt(masks[n][a0[0]:b0[0], a0[1]:b0[1], a0[2]:b0[2]]).astype(np.float32))


def axis_ok(n, q, d):
    """How deep inside piece n a hole axis from q stays (smallest distance to its surface, voxels)."""
    a0, e = edt[n]
    worst = np.inf
    for t in np.linspace(8, length, 10):   # skip the first mm: there the face itself is near
        p = np.round(q + d * t).astype(int) - a0
        if np.any(p < 0) or np.any(p >= e.shape):
            return 0
        worst = min(worst, e[tuple(p)])
    return worst


def cylinder_voxels(q, d, r, depth):
    """Grid indices of a solid cylinder starting at q, going `depth` voxels along d."""
    span = int(np.ceil(max(r, depth))) + 2
    g = np.indices((2 * span + 1,) * 3).reshape(3, -1).T + np.round(q).astype(int) - span
    rel = g - q
    t = rel @ d
    radial = np.linalg.norm(rel - np.outer(t, d), axis=1)
    g = g[(t >= 0) & (t <= depth) & (radial <= r)]
    return g[np.all((g >= 0) & (g < owner.shape), axis=1)]


occupied = np.zeros(owner.shape, np.int8)
for n in names:
    occupied[masks[n]] = ID[n]


pins = []
for a, b, want, axis in PIN_PAIRS:
    near_b = ndimage.binary_dilation(masks[b], iterations=GAP_VOXELS * 2 + 2)
    cand = np.argwhere(masks[a] & near_b)
    if len(cand) == 0:
        print(f'no contact between {a} and {b}')
        continue
    rng = np.random.default_rng(0)
    cand = cand[rng.choice(len(cand), min(len(cand), 1500), replace=False)]
    scored = []
    # pins run along the joining direction, pointing from A's side to B's side
    d = axis * np.sign((np.argwhere(masks[b]).mean(0) - np.argwhere(masks[a]).mean(0)) @ axis)
    for c in cand:
        # interface point: walk from c towards B until we reach B, then step back half the gap
        q = c.astype(float)
        for _ in range(12):
            if masks[b][tuple(np.round(q).astype(int))]:
                break
            q += d * 0.5
        q -= d * (GAP_VOXELS + 0.5) * 0.5
        s = min(axis_ok(a, q, -d), axis_ok(b, q, d))
        if s < 5:   # the hole would run along a surface or break through it
            continue
        # the solid sleeve around the hole must not reach into any other piece
        sleeve = np.vstack([cylinder_voxels(q, -d, r_wall + GAP_VOXELS + 1, length),
                            cylinder_voxels(q, d, r_wall + GAP_VOXELS + 1, length)])
        hit = occupied[tuple(sleeve.T)]
        if np.any((hit > 0) & (hit != ID[a]) & (hit != ID[b])):
            continue
        scored.append((s, q, d))
    scored.sort(key=lambda x: -x[0])
    chosen = []
    for s, q, d in scored:
        if all(np.linalg.norm(q - q2) * PITCH * SCALE > 25 for _, q2, _ in chosen):
            chosen.append((s, q, d))
        if len(chosen) == want:
            break
    print(f'{a} ↔ {b}: {len(scored)} good spots, using {len(chosen)}')
    for s, q, d in chosen:
        pins.append((a, b, q, d))
        # Solid sleeve: fill nearby folds so the hole always has a full wall of plastic
        for n, into in ((a, -d), (b, d)):
            start = q + into * (GAP_VOXELS + 0.5) * 0.5
            masks[n][tuple(cylinder_voxels(start, into, r_wall, length).T)] = True

# ── Mesh, cut pin holes, export ──
center = (lo + hi) / 2


def to_mm(q):  # grid index → final printed coordinates
    return (lo + q * PITCH - center) * SCALE


def hole(q_mm, into):
    """Cylinder + counterbore starting just outside the face at q_mm, going `into` the piece.
    The hole ends in a 90° drill point: when it opens downward on the printer, the pointed end
    needs no support (a flat end would get support material that can't be cleaned out)."""
    r = HOLE_D / 2
    end = q_mm + into * (HOLE_DEPTH + 0.3)
    parts = [trimesh.creation.cylinder(radius=r, segment=[q_mm - into * 2.0, end], sections=48),
             trimesh.creation.cylinder(radius=CB_D / 2, segment=[q_mm - into * 2.0, q_mm + into * (CB_DEPTH + 0.3)],
                                       sections=48)]
    tip = trimesh.creation.cone(radius=r, height=r, sections=48)       # base at z=0, apex at +z
    T = trimesh.geometry.align_vectors([0, 0, 1], into)
    T[:3, 3] = end - into * 0.01
    tip.apply_transform(T)
    return parts + [tip]


def support_score(m, down):
    """Overhang area that needs support (minus what rests on the bed) if `down` points to the bed."""
    R = trimesh.geometry.align_vectors(down, [0, 0, -1])
    nz = (m.face_normals @ R[:3, :3].T)[:, 2]
    z = (m.triangles_center @ R[:3, :3].T)[:, 2]
    on_bed = z < z.min() + 0.4
    overhang = (nz < -0.71) & ~on_bed                  # facing down more steeply than 45°
    contact = (nz < -0.97) & on_bed
    return m.area_faces[overhang].sum() - 2 * m.area_faces[contact].sum()


def orient_for_print(m, holes_into):
    """Rotate for printing and sit it on the bed at the origin.
    Pieces with pin holes: as many holes as possible vertical (they print round, like the test
    block) and opening upward, so nothing is printed inside the holes or the pockets beside them.
    Other pieces: least support, and of the near-best options the lowest one (steadier)."""
    if holes_into:
        main = max(holes_into, key=lambda a: sum(abs(a @ b) > 0.99 for b in holes_into))
        # holes point into the piece; face the side most of them open on upward
        # (brainstem: one hole on each side, so the side needing less support goes down)
        along = [h for h in holes_into if abs(h @ main) > 0.99]
        ups = sum(h @ main > 0 for h in along)
        downs = [main if ups > len(along) / 2 else -main] if ups != len(along) / 2 else [main, -main]
    else:   # free choice: ~200 evenly spread directions
        k = np.arange(200) + 0.5
        phi, th = np.arccos(1 - 2 * k / 200), np.pi * (1 + 5 ** 0.5) * k
        downs = np.c_[np.cos(th) * np.sin(phi), np.sin(th) * np.sin(phi), np.cos(phi)]
    scores = np.array([support_score(m, d) for d in downs])
    good = [d for d, sc in zip(downs, scores) if sc <= scores.min() + 0.15 * abs(scores.min()) + 30]  # mm²
    best = min(good, key=lambda d: np.ptp(m.vertices @ d))
    m.apply_transform(trimesh.geometry.align_vectors(best, [0, 0, -1]))
    m.apply_translation([-m.centroid[0], -m.centroid[1], -m.bounds[0][2]])
    return m


report = []
for n in names:
    f = ndimage.gaussian_filter(np.pad(masks[n].astype(np.float32), 2), 0.7)
    vv, ff, _, _ = measure.marching_cubes(f, 0.5)
    m = trimesh.Trimesh(to_mm(vv - 2), ff[:, ::-1], process=True)
    m = largest_body(m)
    trimesh.smoothing.filter_taubin(m, iterations=6)
    m = reduce(m, int(np.clip(abs(m.volume) / SCALE ** 3 / 1000 * 1500, 12_000, 80_000)))
    if m.volume < 0:
        m.invert()
    cutters = []
    for a, b, q, d in pins:
        if n in (a, b):
            cutters += hole(to_mm(q), d if n == b else -d)
    if cutters:
        m = trimesh.boolean.difference([m] + cutters, engine='manifold')
    m = orient_for_print(m, [d if n == b else -d for a, b, _, d in pins if n in (a, b)])
    m.export(os.path.join(OUT, f'{n}.stl'))
    holes = sum(n in (a, b) for a, b, _, _ in pins)
    report.append((n, m.is_watertight, len(m.split(only_watertight=False)), m.volume / 1000, m.extents, holes))
    print(f'{n:16s} closed={m.is_watertight} bodies={len(m.split(only_watertight=False))} '
          f'vol={m.volume / 1000:5.1f}cm3 size={m.extents.round()} holes={holes}')

# ── Fit test: one block with holes from 4.8 to 5.2 mm (notches mark the hole, 1 notch = 4.8) ──
block = trimesh.creation.box((52, 14, 10))
cut = []
for i, dia in enumerate((4.8, 4.9, 5.0, 5.1, 5.2)):
    x = -20 + i * 10
    cut.append(trimesh.creation.cylinder(radius=dia / 2, segment=[[x, 0, -6], [x, 0, 6]], sections=48))
    for k in range(i + 1):   # notches on the front edge
        cut.append(trimesh.creation.box((0.8, 2, 3), transform=trimesh.transformations.translation_matrix(
            [x - 2 + k * 1.2, -7, 3.5])))
test = trimesh.boolean.difference([block] + cut, engine='manifold')
test.apply_translation([0, 0, 5])   # sit on the bed
test.export(os.path.join(OUT, 'pin_test.stl'))
print('pins per set:', len(pins))
