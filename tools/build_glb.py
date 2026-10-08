"""Merge Brainder FreeSurfer meshes into kid-level parts, decimate, export one GLB.

Source: Anderson Winkler, Brain for Blender (brainder.org), CC BY-SA 3.0.
"""
import glob, os, sys
import numpy as np
import trimesh
import fast_simplification

DL, OUT, SOLID = sys.argv[1], sys.argv[2], sys.argv[3]  # SOLID = output folder of solid.py
SUB = os.path.join(DL, 'sub/subcortical_obj')

sys.path.insert(0, os.path.dirname(__file__))
from lobes import LOBES  # noqa: E402

SUBCORT = {
    'amygdala': ['{S}-Amygdala'],
    'hippocampus': ['{S}-Hippocampus'],
    'thalamus': ['{S}-Thalamus-Proper'],
    'basalganglia': ['{S}-Caudate', '{S}-Putamen', '{S}-Pallidum', '{S}-Accumbens-area'],
    'cerebellum': ['{S}-Cerebellum-Cortex', '{S}-Cerebellum-White-Matter'],
    'ventricles': ['{S}-Lateral-Ventricle', '{S}-Inf-Lat-Vent'],
}
MIDLINE = {
    'brainstem': ['Brain-Stem'],
    'corpuscallosum': ['CC_Anterior', 'CC_Mid_Anterior', 'CC_Central', 'CC_Mid_Posterior', 'CC_Posterior'],
    'ventricles_mid': ['3rd-Ventricle', '4th-Ventricle'],
}


def load(paths):
    meshes = [trimesh.load(p, process=False, force='mesh') for p in paths]
    m = trimesh.util.concatenate(meshes)
    m.merge_vertices()
    return m


def merged_solid(paths, pitch=0.7):
    """Union of several touching closed meshes as one surface (no overlapping skins)."""
    from scipy import ndimage
    from skimage import measure
    meshes = [trimesh.load(p, process=False, force='mesh') for p in paths]
    if len(meshes) == 1:
        m = meshes[0]
        m.merge_vertices()
        return m
    lo = np.min([m.bounds[0] for m in meshes], axis=0) - 2
    hi = np.max([m.bounds[1] for m in meshes], axis=0) + 2
    grid = np.zeros(np.ceil((hi - lo) / pitch).astype(int) + 1, bool)
    for m in meshes:
        v = m.voxelized(pitch)
        inside = ndimage.binary_fill_holes(v.matrix)
        pts = trimesh.transform_points(np.argwhere(inside).astype(float), v.transform)
        grid[tuple(np.round((pts - lo) / pitch).astype(int).T)] = True
    grid = ndimage.binary_closing(grid, iterations=1)
    f = ndimage.gaussian_filter(grid.astype(np.float32), 0.8)
    v, faces, _, _ = measure.marching_cubes(f, 0.5)
    return trimesh.Trimesh(lo + v * pitch, faces[:, ::-1], process=True)


def decimate(m, ratio, floor):
    target = max(min(len(m.faces), floor), int(len(m.faces) * ratio))
    if target >= len(m.faces):
        return m
    v, f = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32),
                                        target_count=target)
    return trimesh.Trimesh(v, f, process=True)


def smooth(m, iterations):
    # Taubin smoothing rounds off scan noise (spikes, stair-steps) without shrinking the part
    trimesh.smoothing.filter_taubin(m, iterations=iterations)
    return m


parts = {}
for side in ('L', 'R'):
    for lobe, regions in LOBES.items():
        parts[f'{lobe}_{side}'] = (load([f'{SOLID}/{lobe}_{side}.obj']), 0.075)
    S = 'Left' if side == 'L' else 'Right'
    for name, files in SUBCORT.items():
        it = 25 if name == 'cerebellum' else 10  # the cerebellum's fine folds come out jagged
        mesh = merged_solid([f'{SUB}/{x.format(S=S)}.obj' for x in files])
        parts[f'{name}_{side}'] = (smooth(mesh, it), 0.35 if len(files) == 1 else 0.12)
for name, files in MIDLINE.items():
    parts[name] = (smooth(merged_solid([f'{SUB}/{x}.obj' for x in files]), 10), 0.35 if len(files) == 1 else 0.12)

# RAS (x right, y anterior, z up) -> three.js (x, y up, z): (x, z, -y)
R = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], dtype=float)
allv = np.vstack([m.vertices for m, _ in parts.values()])
center = (allv.min(0) + allv.max(0)) / 2

scene = trimesh.Scene()
total = 0
for name, (m, ratio) in parts.items():
    m = smooth(decimate(m, ratio, 3000), 3)
    m.fill_holes()  # close tiny gaps left by decimation
    m.vertices = (m.vertices - center) @ R.T
    total += len(m.faces)
    scene.add_geometry(m, node_name=name, geom_name=name)
    print(f'{name:22s} {len(m.faces):7d}')
print('total faces', total)
scene.export(OUT)
print('bytes', os.path.getsize(OUT))
