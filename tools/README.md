# Rebuilding `assets/brain.glb`

Source meshes: [Brain for Blender](https://brainder.org/research/brain-for-blender/)
(Anderson M. Winkler, CC BY-SA 3.0). Download and extract into one folder `DL`:

- `pial_DK_obj.tar.bz2` → `DL/pial/`
- `white_DK_obj.tar.bz2` → `DL/white/`
- `subcortical_obj.tar.bz2` → `DL/sub/`

```sh
pip install trimesh numpy fast-simplification scipy scikit-image
python tools/cores.py DL /tmp/cores              # solid filling for each lobe
python tools/build_glb.py DL assets/brain.glb /tmp/cores
```

`lobes.py` maps the Desikan-Killiany regions to the lobes shown on the site.
