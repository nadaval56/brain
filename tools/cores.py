"""Solid lobe 'cores': fill the white-matter surface, label voxels by lobe, mesh each lobe.

Writes one OBJ per lobe and hemisphere into OUT: <lobe>_<L|R>_core.obj (RAS coords).
"""
import glob, os, sys
import numpy as np
import trimesh
from scipy import ndimage
from scipy.spatial import cKDTree
from skimage import measure

DL, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.dirname(__file__))
from lobes import LOBES  # noqa: E402

REGION_TO_LOBE = {r: lobe for lobe, rs in LOBES.items() for r in rs}
SUB = os.path.join(DL, 'sub/subcortical_obj')
PITCH = 1.0


def filled_points(mesh):
    v = mesh.voxelized(PITCH)
    m = ndimage.binary_fill_holes(v.matrix)
    idx = np.argwhere(m)
    return trimesh.transform_points(idx.astype(float), v.transform)


for side, hemi, S in (('L', 'lh', 'Left'), ('R', 'rh', 'Right')):
    files = sorted(glob.glob(f'{DL}/white/white_DK_obj/{hemi}.white.DK.*.obj'))
    parts = [(f.split('.')[-2], trimesh.load(f, process=False)) for f in files]
    surf = trimesh.util.concatenate([m for _, m in parts])
    verts = np.vstack([m.vertices for _, m in parts])
    names = np.concatenate([[n] * len(m.vertices) for n, m in parts])

    vox = surf.voxelized(PITCH)
    mask = ndimage.binary_fill_holes(vox.matrix)
    mask = ndimage.binary_dilation(mask, iterations=1)  # reach ~1 mm into the grey matter
    inv = np.linalg.inv(vox.transform)

    # Carve out deep structures so they sit in cavities instead of being swallowed
    for f in glob.glob(f'{SUB}/{S}-*.obj') + glob.glob(f'{SUB}/CC_*.obj') + glob.glob(f'{SUB}/3rd-Ventricle.obj'):
        pts = filled_points(trimesh.load(f, process=False))
        ijk = np.round(trimesh.transform_points(pts, inv)).astype(int)
        ok = np.all((ijk >= 0) & (ijk < mask.shape), axis=1)
        carve = np.zeros_like(mask)
        carve[tuple(ijk[ok].T)] = True
        mask &= ~ndimage.binary_dilation(carve, iterations=1)

    idx = np.argwhere(mask)
    world = trimesh.transform_points(idx.astype(float), vox.transform)
    _, near = cKDTree(verts).query(world)
    lab = names[near]

    for lobe in LOBES:
        sel = np.array([REGION_TO_LOBE.get(n) == lobe for n in lab])
        m = np.zeros(mask.shape, dtype=np.float32)
        m[tuple(idx[sel].T)] = 1
        m = ndimage.gaussian_filter(np.pad(m, 2), 0.8)
        v, f, _, _ = measure.marching_cubes(m, 0.5)
        v = trimesh.transform_points(v - 2, vox.transform)
        mesh = trimesh.Trimesh(v, f[:, ::-1], process=True)
        mesh.export(f'{OUT}/{lobe}_{side}_core.obj')
        print(side, lobe, len(mesh.faces), sel.sum())
