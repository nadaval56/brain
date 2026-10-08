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
from brainparts import SUBCORT, MIDLINE, merged_solid, smooth  # noqa: E402


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
