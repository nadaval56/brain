"""Shared pieces for building the brain model (web GLB and printable STL)."""
import numpy as np
import trimesh
from scipy import ndimage
from skimage import measure

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



def merged_solid(paths, pitch=0.7, force=False):
    """Union of several touching closed meshes as one surface (no overlapping skins).

    force=True re-meshes even a single mesh, which guarantees a closed (printable) surface.
    """
    meshes = [trimesh.load(p, process=False, force='mesh') for p in paths]
    if len(meshes) == 1 and not force:
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


def smooth(m, iterations):
    # Taubin smoothing rounds off scan noise (spikes, stair-steps) without shrinking the part
    trimesh.smoothing.filter_taubin(m, iterations=iterations)
    return m
