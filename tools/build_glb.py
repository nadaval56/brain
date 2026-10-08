"""Merge Brainder FreeSurfer meshes into kid-level parts, decimate, export one GLB.

Source: Anderson Winkler, Brain for Blender (brainder.org), CC BY-SA 3.0.
"""
import glob, os, sys
import numpy as np
import trimesh
import fast_simplification

DL, OUT, CORES = sys.argv[1], sys.argv[2], sys.argv[3]
PIAL = os.path.join(DL, 'pial/pial_DK_obj')
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


def decimate(m, ratio, floor):
    target = max(min(len(m.faces), floor), int(len(m.faces) * ratio))
    if target >= len(m.faces):
        return m
    v, f = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32),
                                        target_count=target)
    return trimesh.Trimesh(v, f, process=True)


parts = {}
for side, hemi in (('L', 'lh'), ('R', 'rh')):
    for lobe, regions in LOBES.items():
        parts[f'{lobe}_{side}'] = (load([f'{PIAL}/{hemi}.pial.DK.{r}.obj' for r in regions]), 0.2)
    S = 'Left' if side == 'L' else 'Right'
    for name, files in SUBCORT.items():
        parts[f'{name}_{side}'] = (load([f'{SUB}/{x.format(S=S)}.obj' for x in files]), 0.35)
# Solid lobe fillings made by cores.py (hidden under the cortex, seen when the brain opens)
for f in sorted(os.listdir(CORES)):
    parts[f[:-4]] = (load([os.path.join(CORES, f)]), 0.12)
for name, files in MIDLINE.items():
    parts[name] = (load([f'{SUB}/{x}.obj' for x in files]), 0.35)

# RAS (x right, y anterior, z up) -> three.js (x, y up, z): (x, z, -y)
R = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], dtype=float)
allv = np.vstack([m.vertices for m, _ in parts.values()])
center = (allv.min(0) + allv.max(0)) / 2

scene = trimesh.Scene()
total = 0
for name, (m, ratio) in parts.items():
    m = decimate(m, ratio, 3000)
    m.vertices = (m.vertices - center) @ R.T
    total += len(m.faces)
    scene.add_geometry(m, node_name=name, geom_name=name)
    print(f'{name:22s} {len(m.faces):7d}')
print('total faces', total)
scene.export(OUT)
print('bytes', os.path.getsize(OUT))
