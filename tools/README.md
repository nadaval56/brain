# Rebuilding `assets/brain.glb`

Source meshes: [Brain for Blender](https://brainder.org/research/brain-for-blender/)
(Anderson M. Winkler, CC BY-SA 3.0). Download and extract into one folder `DL`:

- `pial_DK_obj.tar.bz2` → `DL/pial/`
- `subcortical_obj.tar.bz2` → `DL/sub/`

```sh
pip install trimesh numpy fast-simplification scipy scikit-image
python tools/solid.py DL /tmp/solid              # closed, smoothed solid lobes
python tools/build_glb.py DL assets/brain.glb /tmp/solid
```

`lobes.py` maps the Desikan-Killiany regions to the lobes shown on the site.
