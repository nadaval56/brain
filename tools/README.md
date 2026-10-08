# Rebuilding `assets/brain.glb`

Source meshes: [Brain for Blender](https://brainder.org/research/brain-for-blender/)
(Anderson M. Winkler, CC BY-SA 3.0). Download and extract into one folder `DL`:

- `pial_DK_obj.tar.bz2` → `DL/pial/`
- `subcortical_obj.tar.bz2` → `DL/sub/`

```sh
pip install trimesh numpy fast-simplification scipy scikit-image pymeshfix
python tools/solid.py DL /tmp/solid              # closed, smoothed solid lobes
python tools/build_glb.py DL assets/brain.glb /tmp/solid
```

`lobes.py` maps the Desikan-Killiany regions to the lobes shown on the site.

## Printable puzzle (STL)

```sh
python tools/print_stl.py DL /tmp/solid out/ 0.7   # 0.7 = brain ~12 cm long
```

14 closed STL pieces (fused hemispheres + deep parts) with ~0.5 mm clearance and holes for
LEGO Technic friction pins, plus `pin_test.stl` to check the hole fit on your printer.
