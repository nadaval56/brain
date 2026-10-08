"""Closed, smoothed solid lobes from the FreeSurfer pial surface.

Voxelise the inside of each hemisphere's pial surface (sulci stay open), label every voxel by
its nearest cortical region, carve out the deep structures, then mesh and smooth each lobe.
Writes <lobe>_<L|R>.obj (RAS coords) into OUT.
"""
import glob, os, sys
import numpy as np
import trimesh
from scipy import ndimage
from scipy.spatial import cKDTree
from skimage import measure

DL, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lobes import LOBES  # noqa: E402

REGION_TO_LOBE = {r: lobe for lobe, rs in LOBES.items() for r in rs}
SUB = os.path.join(DL, 'sub/subcortical_obj')
PITCH = 0.7


def carve_mask(paths, shape, origin):
    """Voxels inside the given closed meshes, on our grid."""
    out = np.zeros(shape, bool)
    for p in paths:
        m = trimesh.load(p, process=False)
        v = m.voxelized(PITCH)
        inside = ndimage.binary_fill_holes(v.matrix)
        pts = trimesh.transform_points(np.argwhere(inside).astype(float), v.transform)
        ijk = np.round((pts - origin) / PITCH).astype(int)
        ok = np.all((ijk >= 0) & (ijk < shape), axis=1)
        out[tuple(ijk[ok].T)] = True
    return out


for side, hemi, S in (('L', 'lh', 'Left'), ('R', 'rh', 'Right')):
    files = sorted(glob.glob(f'{DL}/pial/pial_DK_obj/{hemi}.pial.DK.*.obj'))
    parts = [(f.split('.')[-2], trimesh.load(f, process=False)) for f in files]
    surf = trimesh.util.concatenate([m for _, m in parts])
    names = np.concatenate([[n] * len(m.vertices) for n, m in parts])
    verts, normals = surf.vertices, surf.vertex_normals

    lo = verts.min(0) - 3
    shape = np.ceil((verts.max(0) + 3 - lo) / PITCH).astype(int)
    grid = np.indices(shape).reshape(3, -1).T
    pts = lo + grid * PITCH

    # Inside the pial surface: the nearest surface point's normal points away from us
    tree = cKDTree(verts)
    inside = np.zeros(len(pts), bool)
    nearest = np.zeros(len(pts), int)
    for a in range(0, len(pts), 400_000):
        q = pts[a:a + 400_000]
        _, near = tree.query(q, k=4)
        s = np.einsum('nkj,nkj->nk', q[:, None, :] - verts[near], normals[near])
        inside[a:a + 400_000] = np.median(s, axis=1) < 0
        nearest[a:a + 400_000] = near[:, 0]
    inside = inside.reshape(shape)
    inside = ndimage.binary_opening(inside, iterations=1)          # drop thin slivers
    inside = ndimage.binary_fill_holes(inside)

    lab = names[nearest].reshape(shape)
    deep = glob.glob(f'{SUB}/{S}-*.obj') + glob.glob(f'{SUB}/CC_*.obj') + [f'{SUB}/3rd-Ventricle.obj']
    carve = ndimage.binary_dilation(carve_mask(deep, shape, lo), iterations=1)
    inside &= ~carve

    for lobe in LOBES:
        m = inside & np.isin(lab, LOBES[lobe])
        m = ndimage.binary_opening(m, iterations=2)   # erase thin tendrils and spikes
        m = ndimage.binary_closing(m, iterations=1)   # and fill pinholes
        # keep only the main piece(s) – drop crumbs left by the labelling
        cc, n = ndimage.label(m)
        if n > 1:
            sizes = ndimage.sum(m, cc, range(1, n + 1))
            m = np.isin(cc, 1 + np.flatnonzero(sizes >= 0.05 * sizes.max()))
        f = ndimage.gaussian_filter(np.pad(m.astype(np.float32), 2), 0.9)
        v, faces, _, _ = measure.marching_cubes(f, 0.5)
        v = lo + (v - 2) * PITCH
        mesh = trimesh.Trimesh(v, faces[:, ::-1], process=True)
        trimesh.smoothing.filter_taubin(mesh, iterations=10)
        mesh.export(f'{OUT}/{lobe}_{side}.obj')
        print(side, lobe, len(mesh.faces), int(m.sum()))
