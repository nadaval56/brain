"""Printable STL puzzle pieces: one closed, single-body STL per brain part.

Pieces keep their assembled positions (open them all together in a slicer to see the whole
brain). Every piece is re-voxelised on one shared grid so neighbours never overlap, and a small
clearance gap is left between touching pieces so printed parts fit back together.

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

# Hebrew names for the file list (match the website)
NAMES = {
    'frontal': 'אונה מצחית', 'motor': 'קליפה מוטורית', 'sensory': 'קליפה חושית',
    'parietal': 'אונה קודקודית', 'temporal': 'אונה רקתית', 'occipital': 'אונה עורפית',
    'cingulate': 'פיתול חגורתי', 'insula': 'אינסולה', 'amygdala': 'אמיגדלה',
    'hippocampus': 'היפוקמפוס', 'thalamus': 'תלמוס', 'basalganglia': 'גרעיני הבסיס',
    'cerebellum': 'מוח קטן', 'brainstem': 'גזע המוח', 'corpuscallosum': 'גוף מסוייד',
}
PRINT_SUBCORT = ['amygdala', 'hippocampus', 'thalamus', 'basalganglia', 'cerebellum']
PRINT_MIDLINE = ['brainstem', 'corpuscallosum']  # ventricles stay as hollow spaces


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
    return r if r.is_watertight else m  # never trade a closed mesh for a broken one


pieces = {}
for side in ('L', 'R'):
    S = 'Left' if side == 'L' else 'Right'
    for lobe in LOBES:
        pieces[f'{lobe}_{side}'] = trimesh.load(f'{SOLID}/{lobe}_{side}.obj', process=False)
    for name in PRINT_SUBCORT:
        m = merged_solid([f'{SUB}/{x.format(S=S)}.obj' for x in SUBCORT[name]], force=True)
        pieces[f'{name}_{side}'] = smooth(m, 25 if name == 'cerebellum' else 10)
for name in PRINT_MIDLINE:
    pieces[name] = smooth(merged_solid([f'{SUB}/{x}.obj' for x in MIDLINE[name]], force=True), 10)

# ── Joint voxel pass: one owner per voxel, then a clearance gap between neighbours ──
PITCH = 0.4                     # mm, before scaling
GAP_VOXELS = 1                  # each side gives up 1 voxel → ~0.8 mm gap before scaling
names = [n for n in pieces if n.split('_')[0] not in LOBES] + \
        [n for n in pieces if n.split('_')[0] in LOBES]          # deep parts claim space first
lo = np.min([m.bounds[0] for m in pieces.values()], axis=0) - 3
hi = np.max([m.bounds[1] for m in pieces.values()], axis=0) + 3
owner = np.zeros(np.ceil((hi - lo) / PITCH).astype(int) + 1, np.int8)
for i, n in enumerate(names, start=1):
    v = pieces[n].voxelized(PITCH)
    inside = ndimage.binary_fill_holes(v.matrix)
    pts = trimesh.transform_points(np.argwhere(inside).astype(float), v.transform)
    t = tuple(np.round((pts - lo) / PITCH).astype(int).T)
    owner[t] = np.where(owner[t] == 0, i, owner[t])

center = (lo + hi) / 2
total = 0
for i, n in enumerate(names, start=1):
    idx = np.argwhere(owner == i)
    a, b = np.maximum(idx.min(0) - 4, 0), idx.max(0) + 5
    box = owner[a[0]:b[0], a[1]:b[1], a[2]:b[2]]
    mine = box == i
    others = (box > 0) & ~mine
    mine &= ~ndimage.binary_dilation(others, iterations=GAP_VOXELS)
    f = ndimage.gaussian_filter(np.pad(mine.astype(np.float32), 2), 0.7)
    vv, ff, _, _ = measure.marching_cubes(f, 0.5)
    m = trimesh.Trimesh(lo + (a + vv - 2) * PITCH, ff[:, ::-1], process=True)
    m = largest_body(m)
    trimesh.smoothing.filter_taubin(m, iterations=6)
    # ~1500 triangles per cm³ (before scaling) is plenty for a print, capped per piece
    m = reduce(m, int(np.clip(abs(m.volume) / 1000 * 1500, 12_000, 60_000)))
    m.apply_translation(-center)
    m.apply_scale(SCALE)
    if m.volume < 0:
        m.invert()
    key, side = n.rsplit('_', 1) if n.endswith(('_L', '_R')) else (n, '')
    m.export(os.path.join(OUT, f'{n}.stl'))
    total += m.volume / 1000
    ext = m.extents
    print(f'{n:16s} {NAMES[key] + {"L": " (שמאל)", "R": " (ימין)", "": ""}[side]:22s} '
          f'closed={m.is_watertight} vol={m.volume / 1000:5.1f}cm3 '
          f'size={ext[0]:.0f}x{ext[1]:.0f}x{ext[2]:.0f}mm faces={len(m.faces)}')
print('total volume cm3', round(total, 1))
